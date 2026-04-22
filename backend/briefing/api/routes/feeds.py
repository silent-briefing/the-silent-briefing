"""Operator feeds — X + Perplexity aggregation."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.config import Settings, get_settings
from briefing.services.feeds.feed_service import load_and_fetch_feed_items

router = APIRouter(prefix="/v1/feeds", tags=["feeds"])


class FeedItemResponse(BaseModel):
    source: str
    url: str
    headline: str | None = None
    published_at: str | None = None


class OfficialFeedsResponse(BaseModel):
    items: list[FeedItemResponse]


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("/{official_id}", response_model=OfficialFeedsResponse)
def get_official_feeds(
    official_id: str,
    _user: ClerkUser = Depends(require_clerk_user),
    settings: Settings = Depends(get_settings),
) -> OfficialFeedsResponse:
    client = _sb_client(settings)
    items = load_and_fetch_feed_items(settings, client, official_id)
    if items is None:
        raise HTTPException(status_code=404, detail="Official not found")
    return OfficialFeedsResponse(
        items=[
            FeedItemResponse(
                source=i.source,
                url=i.url,
                headline=i.headline,
                published_at=i.published_at,
            )
            for i in items
        ]
    )
