"""Admin BFF — bills CRUD (sponsors + related opinions live in metadata json)."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role

log = logging.getLogger(__name__)

router = APIRouter(prefix="/bills")


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


class BillRow(BaseModel):
    id: str
    bill_number: str
    title: str
    published: bool
    metadata: dict[str, Any]
    created_at: str | None
    updated_at: str | None


class BillListResponse(BaseModel):
    items: list[BillRow]
    total: int


class BillCreateBody(BaseModel):
    bill_number: str = Field(..., min_length=1)
    title: str = Field(..., min_length=2)
    published: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class BillPatchBody(BaseModel):
    bill_number: str | None = Field(default=None, min_length=1)
    title: str | None = Field(default=None, min_length=2)
    published: bool | None = None
    metadata: dict[str, Any] | None = None


@router.get("", response_model=BillListResponse)
def list_bills(
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    limit: int = 50,
    offset: int = 0,
) -> BillListResponse:
    client = _sb_client(settings)
    lim = max(1, min(limit, 200))
    end = offset + lim - 1
    res = (
        client.table("bills")
        .select("id,bill_number,title,published,metadata,created_at,updated_at", count="exact")
        .order("created_at", desc=True)
        .range(offset, end)
        .execute()
    )
    rows = res.data or []
    total = int(getattr(res, "count", None) or len(rows))
    items = [
        BillRow(
            id=str(r["id"]),
            bill_number=str(r["bill_number"]),
            title=str(r["title"]),
            published=bool(r.get("published")),
            metadata=r.get("metadata") if isinstance(r.get("metadata"), dict) else {},
            created_at=r.get("created_at"),
            updated_at=r.get("updated_at"),
        )
        for r in rows
    ]
    return BillListResponse(items=items, total=total)


@router.post("", response_model=BillRow)
def create_bill(
    body: BillCreateBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> BillRow:
    client = _sb_client(settings)
    bid = str(uuid.uuid4())
    ins = (
        client.table("bills")
        .insert(
            {
                "id": bid,
                "bill_number": body.bill_number.strip(),
                "title": body.title.strip(),
                "published": body.published,
                "metadata": body.metadata,
            }
        )
        .execute()
    )
    rows = ins.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="insert failed")
    r = rows[0]
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="bill.create",
            target_type="bill",
            target_id=bid,
            before=None,
            after={"bill_number": body.bill_number.strip(), "title": body.title.strip()},
        )
    except Exception:
        log.exception("admin_audit_failed bill.create")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return BillRow(
        id=str(r["id"]),
        bill_number=str(r["bill_number"]),
        title=str(r["title"]),
        published=bool(r.get("published")),
        metadata=r.get("metadata") if isinstance(r.get("metadata"), dict) else {},
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


@router.get("/{bill_id}", response_model=BillRow)
def get_bill(
    bill_id: str,
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> BillRow:
    client = _sb_client(settings)
    res = client.table("bills").select("*").eq("id", bill_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="bill not found")
    r = rows[0]
    return BillRow(
        id=str(r["id"]),
        bill_number=str(r["bill_number"]),
        title=str(r["title"]),
        published=bool(r.get("published")),
        metadata=r.get("metadata") if isinstance(r.get("metadata"), dict) else {},
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


@router.patch("/{bill_id}", response_model=BillRow)
def patch_bill(
    bill_id: str,
    body: BillPatchBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> BillRow:
    client = _sb_client(settings)
    res = client.table("bills").select("*").eq("id", bill_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="bill not found")
    before = rows[0]
    patch: dict[str, Any] = {}
    if body.bill_number is not None:
        patch["bill_number"] = body.bill_number.strip()
    if body.title is not None:
        patch["title"] = body.title.strip()
    if body.published is not None:
        patch["published"] = body.published
    if body.metadata is not None:
        merged = dict(before.get("metadata") or {}) if isinstance(before.get("metadata"), dict) else {}
        merged.update(body.metadata)
        patch["metadata"] = merged
    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")
    up = client.table("bills").update(patch).eq("id", bill_id).execute()
    out = (up.data or [before])[0]
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="bill.patch",
            target_type="bill",
            target_id=bill_id,
            before={"row": before},
            after={"patch": patch},
        )
    except Exception:
        log.exception("admin_audit_failed bill.patch")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return BillRow(
        id=str(out["id"]),
        bill_number=str(out["bill_number"]),
        title=str(out["title"]),
        published=bool(out.get("published")),
        metadata=out.get("metadata") if isinstance(out.get("metadata"), dict) else {},
        created_at=out.get("created_at"),
        updated_at=out.get("updated_at"),
    )
