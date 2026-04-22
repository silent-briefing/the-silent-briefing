from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.api.main import app
from briefing.config import Settings, get_settings
from briefing.services.feeds.feed_service import clear_feed_cache_for_tests
from briefing.services.feeds.feed_types import FeedItemOut


def _fake_settings() -> Settings:
    return Settings(
        perplexity_api_key="x",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="test-sr",
        feed_cache_seconds=0,
    )


def test_feeds_unauthorized() -> None:
    clear_feed_cache_for_tests()
    with TestClient(app) as tc:
        r = tc.get("/v1/feeds/550e8400-e29b-41d4-a716-446655440000")
    assert r.status_code == 401


@patch("briefing.api.routes.feeds.load_and_fetch_feed_items")
def test_feeds_not_found(mock_load: MagicMock) -> None:
    clear_feed_cache_for_tests()
    mock_load.return_value = None
    app.dependency_overrides[get_settings] = _fake_settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="u1",
        role="operator",
        org_id="org1",
    )
    try:
        with TestClient(app) as tc:
            r = tc.get(
                "/v1/feeds/550e8400-e29b-41d4-a716-446655440000",
                headers={"Authorization": "Bearer unused"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 404


@patch("briefing.api.routes.feeds.load_and_fetch_feed_items")
def test_feeds_returns_items(mock_load: MagicMock) -> None:
    clear_feed_cache_for_tests()
    mock_load.return_value = [
        FeedItemOut(
            source="Perplexity",
            url="https://news.test/a",
            headline="Story",
            published_at="2026-04-21T12:00:00Z",
        )
    ]
    app.dependency_overrides[get_settings] = _fake_settings
    app.dependency_overrides[require_clerk_user] = lambda: ClerkUser(
        sub="u1",
        role="operator",
        org_id="org1",
    )
    try:
        with TestClient(app) as tc:
            r = tc.get(
                "/v1/feeds/550e8400-e29b-41d4-a716-446655440000",
                headers={"Authorization": "Bearer unused"},
            )
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["items"][0]["url"] == "https://news.test/a"
    assert body["items"][0]["source"] == "Perplexity"
