"""Resolve effective config: database `settings` overrides on top of env-backed `Settings`."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from briefing.config import Settings
from briefing.services.settings.registry import (
    OPERATOR_FEEDS_SETTINGS_KEY,
    SOURCE_URL_KEYS,
    default_operator_feeds_blob,
)


def coerce_settings_url_value(raw: Any) -> str | None:
    if raw is None:
        return None
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    if isinstance(raw, dict):
        v = raw.get("url") or raw.get("value")
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def merge_source_urls_from_db(settings: Settings, client: Any | None = None) -> Settings:
    """Return a copy of ``settings`` with URL fields overridden from ``public.settings`` when present."""
    if client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            return settings
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    try:
        res = client.table("settings").select("key,value").in_("key", list(SOURCE_URL_KEYS)).execute()
    except Exception:
        return settings
    rows = res.data or []
    updates: dict[str, str] = {}
    for row in rows:
        key = row.get("key")
        if not isinstance(key, str) or key not in SOURCE_URL_KEYS:
            continue
        url = coerce_settings_url_value(row.get("value"))
        if url:
            updates[key] = url
    return settings.model_copy(update=updates) if updates else settings


@dataclass(frozen=True)
class FeedPolicy:
    cache_seconds: int
    x_enabled: bool
    perplexity_enabled: bool
    opt_out_official_ids: frozenset[str]


def resolve_operator_feeds(settings: Settings, supabase: Any | None) -> FeedPolicy:
    base = FeedPolicy(
        cache_seconds=max(0, int(settings.feed_cache_seconds)),
        x_enabled=True,
        perplexity_enabled=True,
        opt_out_official_ids=frozenset(),
    )
    if supabase is None:
        return base
    try:
        res = (
            supabase.table("settings")
            .select("value")
            .eq("key", OPERATOR_FEEDS_SETTINGS_KEY)
            .limit(1)
            .execute()
        )
    except Exception:
        return base
    rows = res.data or []
    if not rows:
        return base
    blob = rows[0].get("value")
    if not isinstance(blob, dict):
        return base
    cache = blob.get("cache_seconds")
    cs = int(cache) if isinstance(cache, int) or (isinstance(cache, float) and cache == int(cache)) else base.cache_seconds
    if isinstance(cache, str) and cache.strip().isdigit():
        cs = int(cache.strip())
    cs = max(0, cs)
    x_en = blob.get("x_enabled")
    px_en = blob.get("perplexity_enabled")
    x_ok = base.x_enabled if x_en is None else bool(x_en)
    p_ok = base.perplexity_enabled if px_en is None else bool(px_en)
    raw_opt = blob.get("opt_out_official_ids")
    opt: set[str] = set()
    if isinstance(raw_opt, list):
        for x in raw_opt:
            if isinstance(x, str) and x.strip():
                opt.add(x.strip())
    return FeedPolicy(
        cache_seconds=cs,
        x_enabled=x_ok,
        perplexity_enabled=p_ok,
        opt_out_official_ids=frozenset(opt),
    )


