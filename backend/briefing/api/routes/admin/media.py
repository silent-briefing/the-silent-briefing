"""Admin BFF — media_coverage CRUD (service_role + audit on every mutation)."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role

log = logging.getLogger(__name__)

router = APIRouter(prefix="/media")


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _norm_url(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip()
    return s if s else None


class MediaRow(BaseModel):
    id: str
    headline: str
    outlet: str | None
    source_url: str | None
    summary: str | None
    published: bool
    published_at: str | None
    fetched_at: str | None
    created_by: str | None
    official_ids: list[str]
    metadata: dict[str, Any]
    created_at: str | None
    updated_at: str | None


class MediaListResponse(BaseModel):
    items: list[MediaRow]
    total: int


class MediaCreateBody(BaseModel):
    headline: str = Field(..., min_length=1)
    outlet: str | None = None
    source_url: str | None = None
    summary: str | None = None
    published: bool = False
    published_at: str | None = None
    fetched_at: str | None = None
    official_ids: list[str] = Field(default_factory=list)

    @field_validator("official_ids", mode="before")
    @classmethod
    def coerce_official_ids(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("official_ids must be a list")
        return [str(x) for x in v]


class MediaPatchBody(BaseModel):
    headline: str | None = Field(default=None, min_length=1)
    outlet: str | None = None
    source_url: str | None = None
    summary: str | None = None
    published: bool | None = None
    published_at: str | None = None
    fetched_at: str | None = None
    official_ids: list[str] | None = None
    metadata: dict[str, Any] | None = None


def _ensure_officials_exist(client: Any, ids: list[str]) -> None:
    for oid in ids:
        r = client.table("officials").select("id").eq("id", oid).is_("deleted_at", "null").limit(1).execute()
        if not (r.data or []):
            raise HTTPException(status_code=422, detail=f"official not found: {oid}")


def _row_to_media(r: dict[str, Any]) -> MediaRow:
    raw_ids = r.get("official_ids")
    if isinstance(raw_ids, list):
        oids = [str(x) for x in raw_ids]
    else:
        oids = []
    return MediaRow(
        id=str(r["id"]),
        headline=str(r["headline"]),
        outlet=r.get("outlet"),
        source_url=r.get("source_url"),
        summary=r.get("summary"),
        published=bool(r.get("published")),
        published_at=r.get("published_at"),
        fetched_at=r.get("fetched_at"),
        created_by=r.get("created_by"),
        official_ids=oids,
        metadata=r.get("metadata") if isinstance(r.get("metadata"), dict) else {},
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


@router.get("", response_model=MediaListResponse)
def list_media(
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    limit: int = 50,
    offset: int = 0,
    official_id: str | None = Query(default=None, description="Filter rows whose official_ids contains this UUID"),
    published: bool | None = Query(default=None),
) -> MediaListResponse:
    client = _sb_client(settings)
    lim = max(1, min(limit, 200))
    end = offset + lim - 1
    q = (
        client.table("media_coverage")
        .select(
            "id,headline,outlet,source_url,summary,published,published_at,fetched_at,created_by,official_ids,metadata,created_at,updated_at",
            count="exact",
        )
        .order("created_at", desc=True)
    )
    if official_id:
        q = q.contains("official_ids", [official_id])
    if published is not None:
        q = q.eq("published", published)
    res = q.range(offset, end).execute()
    rows = res.data or []
    total = int(getattr(res, "count", None) or len(rows))
    items = [_row_to_media(r) for r in rows]
    return MediaListResponse(items=items, total=total)


@router.post("", response_model=MediaRow)
def create_media(
    body: MediaCreateBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> MediaRow:
    client = _sb_client(settings)
    oids = list(dict.fromkeys(body.official_ids))
    _ensure_officials_exist(client, oids)
    mid = str(uuid.uuid4())
    row: dict[str, Any] = {
        "id": mid,
        "headline": body.headline.strip(),
        "outlet": body.outlet.strip() if body.outlet and body.outlet.strip() else None,
        "source_url": _norm_url(body.source_url),
        "summary": body.summary.strip() if body.summary and body.summary.strip() else None,
        "published": body.published,
        "published_at": body.published_at,
        "fetched_at": body.fetched_at,
        "created_by": user.sub,
        "official_ids": oids,
        "metadata": {},
    }
    try:
        ins = client.table("media_coverage").insert(row).execute()
    except Exception as e:
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(status_code=409, detail="duplicate source_url") from e
        raise HTTPException(status_code=500, detail=f"insert failed: {e}") from e
    ins_rows = ins.data or []
    if not ins_rows:
        raise HTTPException(status_code=500, detail="insert failed")
    out = ins_rows[0]
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="media.create",
            target_type="media_coverage",
            target_id=mid,
            before=None,
            after={"headline": row["headline"], "source_url": row["source_url"]},
        )
    except Exception:
        log.exception("admin_audit_failed media.create")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return _row_to_media(out)


@router.get("/{media_id}", response_model=MediaRow)
def get_media(
    media_id: str,
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> MediaRow:
    client = _sb_client(settings)
    res = (
        client.table("media_coverage")
        .select(
            "id,headline,outlet,source_url,summary,published,published_at,fetched_at,created_by,official_ids,metadata,created_at,updated_at",
        )
        .eq("id", media_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="media not found")
    return _row_to_media(rows[0])


@router.patch("/{media_id}", response_model=MediaRow)
def patch_media(
    media_id: str,
    body: MediaPatchBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> MediaRow:
    client = _sb_client(settings)
    res = client.table("media_coverage").select("*").eq("id", media_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="media not found")
    before = rows[0]
    patch: dict[str, Any] = {}
    if body.headline is not None:
        patch["headline"] = body.headline.strip()
    if body.outlet is not None:
        patch["outlet"] = body.outlet.strip() or None
    if body.source_url is not None:
        patch["source_url"] = _norm_url(body.source_url)
    if body.summary is not None:
        patch["summary"] = body.summary.strip() or None
    if body.published is not None:
        patch["published"] = body.published
    if body.published_at is not None:
        patch["published_at"] = body.published_at
    if body.fetched_at is not None:
        patch["fetched_at"] = body.fetched_at
    if body.official_ids is not None:
        oids = list(dict.fromkeys(body.official_ids))
        _ensure_officials_exist(client, oids)
        patch["official_ids"] = oids
    if body.metadata is not None:
        merged = dict(before.get("metadata") or {}) if isinstance(before.get("metadata"), dict) else {}
        merged.update(body.metadata)
        patch["metadata"] = merged
    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")
    try:
        up = client.table("media_coverage").update(patch).eq("id", media_id).execute()
    except Exception as e:
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(status_code=409, detail="duplicate source_url") from e
        raise HTTPException(status_code=500, detail=f"update failed: {e}") from e
    out = (up.data or [before])[0]
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="media.patch",
            target_type="media_coverage",
            target_id=media_id,
            before={"row": before},
            after={"patch": patch},
        )
    except Exception:
        log.exception("admin_audit_failed media.patch")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return _row_to_media(out)
