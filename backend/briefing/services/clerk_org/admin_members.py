"""Clerk org membership + user metadata — used by admin users BFF."""

from __future__ import annotations

from typing import Any, Literal

from clerk_backend_api import Clerk, models
from fastapi import HTTPException

from briefing.config import Settings

AppRole = Literal["admin", "operator", "viewer"]

CLERK_ORG_ADMIN = "org:admin"
CLERK_ORG_MEMBER = "org:member"


def get_clerk_backend(settings: Settings) -> Clerk:
    """Backend API client — **never** expose `CLERK_SECRET_KEY` to the browser."""
    key = (settings.clerk_secret_key or "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Clerk Backend API not configured (CLERK_SECRET_KEY)",
        )
    return Clerk(bearer_auth=key)


def normalize_email(value: str) -> str:
    return value.strip().lower()


def is_clerk_org_admin_role(role: str | None) -> bool:
    if not role:
        return False
    r = role.strip().lower()
    return r in ("org:admin", "admin")


def effective_app_role(clerk_org_role: str, user_public_metadata: dict[str, Any] | None) -> AppRole:
    if is_clerk_org_admin_role(clerk_org_role):
        return "admin"
    raw = None
    if isinstance(user_public_metadata, dict):
        raw = user_public_metadata.get("role")
    if raw in ("admin", "operator", "viewer"):
        return raw  # type: ignore[return-value]
    return "viewer"


def primary_email_from_user(user: models.User) -> str | None:
    pid = user.primary_email_address_id
    for ea in user.email_addresses:
        if ea.id and pid and ea.id == pid:
            return ea.email_address
    if user.email_addresses:
        return user.email_addresses[0].email_address
    return None


def clerk_exception_to_http(exc: BaseException) -> HTTPException:
    if isinstance(exc, models.ClerkErrors):
        msg = exc.message
        if exc.data.errors:
            msg = exc.data.errors[0].message or msg
        code = exc.raw_response.status_code if exc.raw_response else 502
        if code < 400 or code >= 600:
            code = 502
        return HTTPException(status_code=code, detail=msg)
    if isinstance(exc, models.SDKError):
        return HTTPException(status_code=502, detail="Clerk API error")
    return HTTPException(status_code=502, detail="Unexpected Clerk error")


def apply_app_role_to_membership(
    client: Clerk,
    *,
    organization_id: str,
    user_id: str,
    app_role: AppRole,
) -> None:
    """Sync Clerk org membership role + user `public_metadata.role` to match app_role."""
    clerk_role = CLERK_ORG_ADMIN if app_role == "admin" else CLERK_ORG_MEMBER
    try:
        client.organization_memberships.update(
            organization_id=organization_id,
            user_id=user_id,
            role=clerk_role,
        )
        client.users.update_metadata(
            user_id=user_id,
            public_metadata={"role": app_role},
        )
    except (models.ClerkErrors, models.SDKError) as e:
        raise clerk_exception_to_http(e) from e
