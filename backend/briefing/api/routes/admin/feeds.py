"""Admin BFF — operator feeds config (`operator_feeds` row in `public.settings`)."""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role
from briefing.services.settings.registry import OPERATOR_FEEDS_SETTINGS_KEY, default_operator_feeds_blob
from briefing.services.settings.resolver import resolve_operator_feeds

log = logging.getLogger(__name__)

router = APIRouter(prefix="/feeds")


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _load_feed_blob(client: Any, settings: Settings) -> dict[str, Any]:
    res = (
        client.table("settings")
        .select("value")
        .eq("key", OPERATOR_FEEDS_SETTINGS_KEY)
        .limit(1)
        .execute()
    )
    base = default_operator_feeds_blob(settings)
    if res.data and isinstance(res.data[0].get("value"), dict):
        return {**base, **res.data[0]["value"]}
    return base


class OperatorFeedsState(BaseModel):
    cache_seconds: int = Field(ge=0)
    x_enabled: bool
    perplexity_enabled: bool
    opt_out_official_ids: list[str]


class OperatorFeedsResponse(BaseModel):
    stored: OperatorFeedsState
    effective: OperatorFeedsState


class OperatorFeedsPatch(BaseModel):
    cache_seconds: int | None = Field(default=None, ge=0)
    x_enabled: bool | None = None
    perplexity_enabled: bool | None = None
    opt_out_official_ids: list[str] | None = None


@router.get("", response_model=OperatorFeedsResponse)
def get_operator_feeds(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> OperatorFeedsResponse:
    _ = user
    client = _sb_client(settings)
    blob = _load_feed_blob(client, settings)
    eff = resolve_operator_feeds(settings, client)
    stored = OperatorFeedsState(
        cache_seconds=int(blob.get("cache_seconds", settings.feed_cache_seconds)),
        x_enabled=bool(blob.get("x_enabled", True)),
        perplexity_enabled=bool(blob.get("perplexity_enabled", True)),
        opt_out_official_ids=list(blob.get("opt_out_official_ids") or []),
    )
    effective = OperatorFeedsState(
        cache_seconds=eff.cache_seconds,
        x_enabled=eff.x_enabled,
        perplexity_enabled=eff.perplexity_enabled,
        opt_out_official_ids=sorted(eff.opt_out_official_ids),
    )
    return OperatorFeedsResponse(stored=stored, effective=effective)


@router.patch("", response_model=OperatorFeedsResponse)
def patch_operator_feeds(
    body: OperatorFeedsPatch,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> OperatorFeedsResponse:
    if (
        body.cache_seconds is None
        and body.x_enabled is None
        and body.perplexity_enabled is None
        and body.opt_out_official_ids is None
    ):
        raise HTTPException(status_code=422, detail="No fields to update")
    client = _sb_client(settings)
    before = _load_feed_blob(client, settings)
    nxt = {**before}
    if body.cache_seconds is not None:
        nxt["cache_seconds"] = int(body.cache_seconds)
    if body.x_enabled is not None:
        nxt["x_enabled"] = bool(body.x_enabled)
    if body.perplexity_enabled is not None:
        nxt["perplexity_enabled"] = bool(body.perplexity_enabled)
    if body.opt_out_official_ids is not None:
        nxt["opt_out_official_ids"] = [str(x).strip() for x in body.opt_out_official_ids if str(x).strip()]
    row = {"key": OPERATOR_FEEDS_SETTINGS_KEY, "value": nxt, "updated_by": user.sub}
    client.table("settings").upsert(row, on_conflict="key").execute()
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="settings.operator_feeds.patch",
            target_type="settings",
            target_id=OPERATOR_FEEDS_SETTINGS_KEY,
            before={"value": before},
            after={"value": nxt},
        )
    except Exception:
        log.exception("admin_audit_failed settings.operator_feeds")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    eff = resolve_operator_feeds(settings, client)
    stored = OperatorFeedsState(
        cache_seconds=int(nxt.get("cache_seconds", settings.feed_cache_seconds)),
        x_enabled=bool(nxt.get("x_enabled", True)),
        perplexity_enabled=bool(nxt.get("perplexity_enabled", True)),
        opt_out_official_ids=list(nxt.get("opt_out_official_ids") or []),
    )
    effective = OperatorFeedsState(
        cache_seconds=eff.cache_seconds,
        x_enabled=eff.x_enabled,
        perplexity_enabled=eff.perplexity_enabled,
        opt_out_official_ids=sorted(eff.opt_out_official_ids),
    )
    return OperatorFeedsResponse(stored=stored, effective=effective)
