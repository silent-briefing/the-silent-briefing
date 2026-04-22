"""Aggregate social + news snippets for an official (X API + Perplexity Sonar JSON)."""

from __future__ import annotations

import threading
import time
from datetime import datetime
from typing import Any

from briefing.config import Settings, get_settings
from briefing.services.feeds.feed_sources import PerplexityNewsSource, XSource
from briefing.services.feeds.feed_types import FeedItemOut, OfficialFeedContext

_CACHE: dict[str, tuple[float, tuple[FeedItemOut, ...]]] = {}
_CACHE_LOCK = threading.Lock()


def _sort_ts(item: FeedItemOut) -> float:
    raw = (item.published_at or "").strip()
    if not raw:
        return float("-inf")
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        return datetime.fromisoformat(raw).timestamp()
    except ValueError:
        return float("-inf")


def _norm_dedupe_key(url: str) -> str:
    u = url.strip().lower()
    u = u.split("?")[0].rstrip("/")
    return u


def _merge_sort_dedupe(items: list[FeedItemOut]) -> list[FeedItemOut]:
    ordered = sorted(items, key=_sort_ts, reverse=True)
    seen: set[str] = set()
    out: list[FeedItemOut] = []
    for it in ordered:
        key = _norm_dedupe_key(it.url)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


class FeedService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._s = settings or get_settings()

    def collect(self, ctx: OfficialFeedContext) -> list[FeedItemOut]:
        parts: list[FeedItemOut] = []
        parts.extend(XSource(self._s).fetch(ctx))
        parts.extend(PerplexityNewsSource(self._s).fetch(ctx))
        return _merge_sort_dedupe(parts)


def _cache_get(official_id: str, ttl_seconds: int) -> list[FeedItemOut] | None:
    if ttl_seconds <= 0:
        return None
    now = time.monotonic()
    with _CACHE_LOCK:
        hit = _CACHE.get(official_id)
        if not hit:
            return None
        ts, tup = hit
        if now - ts > ttl_seconds:
            del _CACHE[official_id]
            return None
        return list(tup)


def _cache_set(official_id: str, items: list[FeedItemOut]) -> None:
    with _CACHE_LOCK:
        _CACHE[official_id] = (time.monotonic(), tuple(items))


def load_and_fetch_feed_items(settings: Settings, supabase: Any, official_id: str) -> list[FeedItemOut] | None:
    """Return feed items, or ``None`` if the official does not exist."""
    ttl = settings.feed_cache_seconds
    cached = _cache_get(official_id, ttl)
    if cached is not None:
        return cached

    res = (
        supabase.table("officials")
        .select("id,full_name,office_type,jurisdiction_id")
        .eq("id", official_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    row = res.data[0]
    jname: str | None = None
    jid = row.get("jurisdiction_id")
    if jid:
        jres = supabase.table("jurisdictions").select("name").eq("id", str(jid)).limit(1).execute()
        if jres.data:
            jname = jres.data[0].get("name")

    ctx = OfficialFeedContext(
        official_id=str(row["id"]),
        full_name=str(row["full_name"]),
        office_type=str(row["office_type"]),
        jurisdiction_name=str(jname) if jname else None,
    )
    items = FeedService(settings).collect(ctx)
    if ttl > 0:
        _cache_set(official_id, items)
    return items


def clear_feed_cache_for_tests() -> None:
    with _CACHE_LOCK:
        _CACHE.clear()
