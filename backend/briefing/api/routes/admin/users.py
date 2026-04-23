"""Admin BFF — Clerk Organization members (list, invite, role, remove)."""

from __future__ import annotations

import logging
from typing import Annotated, Any, Literal

from clerk_backend_api import models
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role
from briefing.services.clerk_org.admin_members import (
    AppRole,
    apply_app_role_to_membership,
    clerk_exception_to_http,
    effective_app_role,
    get_clerk_backend,
    normalize_email,
    primary_email_from_user,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/users")


def _require_org_id(user: ClerkUser) -> str:
    if not user.org_id:
        raise HTTPException(
            status_code=400,
            detail="Select an active Clerk organization to manage members.",
        )
    return user.org_id


class OrgMemberRow(BaseModel):
    user_id: str
    email: str | None
    first_name: str | None
    last_name: str | None
    clerk_org_role: str
    app_role: AppRole


class OrgMembersListResponse(BaseModel):
    items: list[OrgMemberRow]
    total_count: int


class InviteBody(BaseModel):
    email: str = Field(..., min_length=3)
    app_role: Literal["admin", "operator", "viewer"]
    confirm_email: str | None = None

    @model_validator(mode="after")
    def _admin_invite_confirm(self) -> InviteBody:
        if self.app_role == "admin":
            if normalize_email(self.confirm_email or "") != normalize_email(self.email):
                raise ValueError("confirm_email must match email when inviting an admin")
        return self


class MemberPatchBody(BaseModel):
    app_role: Literal["admin", "operator", "viewer"]
    confirm_target_email: str | None = None


@router.get("/members", response_model=OrgMembersListResponse)
def list_org_members(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> OrgMembersListResponse:
    org_id = _require_org_id(user)
    client = get_clerk_backend(settings)
    try:
        page = client.organization_memberships.list(
            organization_id=org_id,
            limit=100,
            offset=0,
        )
    except (models.ClerkErrors, models.SDKError) as e:
        raise clerk_exception_to_http(e) from e

    items: list[OrgMemberRow] = []
    for m in page.data:
        pud = m.public_user_data
        if pud is None:
            log.warning("clerk_membership_missing_public_user_data org=%s membership=%s", org_id, m.id)
            continue
        uid = pud.user_id
        try:
            u = client.users.get(user_id=uid)
        except (models.ClerkErrors, models.SDKError) as e:
            raise clerk_exception_to_http(e) from e
        meta = u.public_metadata if isinstance(u.public_metadata, dict) else {}
        items.append(
            OrgMemberRow(
                user_id=uid,
                email=primary_email_from_user(u) or pud.identifier,
                first_name=pud.first_name if isinstance(pud.first_name, str) else None,
                last_name=pud.last_name if isinstance(pud.last_name, str) else None,
                clerk_org_role=m.role,
                app_role=effective_app_role(m.role, meta),
            )
        )
    return OrgMembersListResponse(items=items, total_count=page.total_count)


@router.post("/invitations", response_model=dict[str, Any])
def create_invitation(
    body: InviteBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    org_id = _require_org_id(user)
    client = get_clerk_backend(settings)
    clerk_role = "org:admin" if body.app_role == "admin" else "org:member"
    try:
        inv = client.organization_invitations.create(
            organization_id=org_id,
            email_address=normalize_email(body.email),
            role=clerk_role,
            inviter_user_id=user.sub,
            public_metadata={"role": body.app_role},
        )
    except (models.ClerkErrors, models.SDKError) as e:
        raise clerk_exception_to_http(e) from e
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=org_id,
            action="clerk.org.invite",
            target_type="organization_invitation",
            target_id=getattr(inv, "id", None),
            before=None,
            after={"email": body.email, "app_role": body.app_role},
        )
    except Exception:
        log.exception("admin_audit_failed clerk.org.invite")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return {"id": inv.id, "email": body.email, "app_role": body.app_role}


@router.patch("/members/{user_id}", response_model=dict[str, str])
def patch_member_role(
    user_id: str,
    body: MemberPatchBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    org_id = _require_org_id(user)
    if user_id == user.sub:
        raise HTTPException(status_code=400, detail="Use another admin to change your own role.")
    client = get_clerk_backend(settings)
    try:
        target = client.users.get(user_id=user_id)
    except (models.ClerkErrors, models.SDKError) as e:
        raise clerk_exception_to_http(e) from e
    primary = primary_email_from_user(target)
    if body.app_role == "admin":
        if not body.confirm_target_email:
            raise HTTPException(
                status_code=422,
                detail="confirm_target_email is required when promoting to admin",
            )
        if normalize_email(body.confirm_target_email) != normalize_email(primary or ""):
            raise HTTPException(
                status_code=422,
                detail="confirm_target_email must match the member's primary email",
            )
    apply_app_role_to_membership(
        client,
        organization_id=org_id,
        user_id=user_id,
        app_role=body.app_role,
    )
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=org_id,
            action="clerk.org.member_role_patch",
            target_type="user",
            target_id=user_id,
            before={"note": "role change requested"},
            after={"app_role": body.app_role},
        )
    except Exception:
        log.exception("admin_audit_failed clerk.org.member_role_patch")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return {"user_id": user_id, "app_role": body.app_role}


@router.delete("/members/{user_id}", response_model=dict[str, str])
def remove_member(
    user_id: str,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    org_id = _require_org_id(user)
    if user_id == user.sub:
        raise HTTPException(status_code=400, detail="You cannot remove yourself from the organization.")
    client = get_clerk_backend(settings)
    try:
        client.organization_memberships.delete(organization_id=org_id, user_id=user_id)
    except (models.ClerkErrors, models.SDKError) as e:
        raise clerk_exception_to_http(e) from e
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=org_id,
            action="clerk.org.member_remove",
            target_type="user",
            target_id=user_id,
            before=None,
            after={"removed": True},
        )
    except Exception:
        log.exception("admin_audit_failed clerk.org.member_remove")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return {"user_id": user_id, "removed": "true"}
