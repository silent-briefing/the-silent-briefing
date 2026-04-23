"""Admin BFF — source URL overrides in `public.settings`."""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role
from briefing.services.settings.registry import SOURCE_URL_DESCRIPTORS, SOURCE_URL_KEYS
from briefing.services.settings.resolver import coerce_settings_url_value

log = logging.getLogger(__name__)

router = APIRouter(prefix="/sources")


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


class SourceUrlItem(BaseModel):
    key: str
    label: str
    description: str
    kind: str
    default: str
    environment_value: str
    effective: str
    override_from_database: bool


class SourcesListResponse(BaseModel):
    items: list[SourceUrlItem]


class SourcePatchBody(BaseModel):
    url: str = Field(..., min_length=4)


@router.get("", response_model=SourcesListResponse)
def list_source_urls(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> SourcesListResponse:
    _ = user
    client = _sb_client(settings)
    res = client.table("settings").select("key,value").in_("key", list(SOURCE_URL_KEYS)).execute()
    db_map = {str(r["key"]): r.get("value") for r in (res.data or [])}
    items: list[SourceUrlItem] = []
    for d in SOURCE_URL_DESCRIPTORS:
        env_val = str(getattr(settings, d.key, "") or "")
        from_db = coerce_settings_url_value(db_map.get(d.key))
        effective = from_db if from_db else env_val
        items.append(
            SourceUrlItem(
                key=d.key,
                label=d.label,
                description=d.description,
                kind=d.kind,
                default=d.default,
                environment_value=env_val,
                effective=effective,
                override_from_database=from_db is not None,
            )
        )
    return SourcesListResponse(items=items)


@router.patch("/{key}")
def patch_source_url(
    key: str,
    body: SourcePatchBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    if key not in SOURCE_URL_KEYS:
        raise HTTPException(status_code=404, detail="Unknown source key")
    try:
        _ = str(HttpUrl(body.url))
    except Exception as e:
        raise HTTPException(status_code=422, detail="Invalid URL") from e
    client = _sb_client(settings)
    before_res = client.table("settings").select("value").eq("key", key).limit(1).execute()
    before = (before_res.data or [{}])[0].get("value")
    row = {"key": key, "value": {"url": body.url.strip()}, "updated_by": user.sub}
    client.table("settings").upsert(row, on_conflict="key").execute()
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="settings.source_url.patch",
            target_type="settings",
            target_id=key,
            before={"value": before},
            after={"value": row["value"]},
        )
    except Exception:
        log.exception("admin_audit_failed settings.source_url key=%s", key)
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return {"key": key, "url": body.url.strip()}
