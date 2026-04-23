from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest
import respx

from briefing.config import Settings
from briefing.services.feeds.feed_service import (
    FeedService,
    clear_feed_cache_for_tests,
    load_and_fetch_feed_items,
)
from briefing.services.feeds.feed_sources import PerplexityNewsSource, XSource
from briefing.services.feeds.feed_types import FeedItemOut, OfficialFeedContext


@pytest.fixture(autouse=True)
def _clear_feed_cache() -> None:
    clear_feed_cache_for_tests()


def _ctx() -> OfficialFeedContext:
    return OfficialFeedContext(
        official_id="550e8400-e29b-41d4-a716-446655440000",
        full_name="Justice Example",
        office_type="state_supreme_justice",
        jurisdiction_name="Utah",
    )


@respx.mock
def test_x_source_parses_recent_search() -> None:
    settings = Settings(x_api_bearer_token="x-token")
    body = {
        "data": [
            {
                "id": "1999",
                "text": "Hello Utah courts",
                "created_at": "2026-04-21T12:00:00.000Z",
            }
        ]
    }
    respx.get("https://api.twitter.com/2/tweets/search/recent").mock(
        return_value=httpx.Response(200, json=body)
    )
    items = XSource(settings).fetch(_ctx())
    assert len(items) == 1
    assert items[0].source == "X"
    assert items[0].url == "https://x.com/i/web/status/1999"
    assert "Utah courts" in (items[0].headline or "")


def test_x_source_skips_without_token() -> None:
    settings = Settings(x_api_bearer_token="")
    assert XSource(settings).fetch(_ctx()) == []


@respx.mock
def test_perplexity_news_parses_json_items() -> None:
    settings = Settings(perplexity_api_key="k", perplexity_base_url="https://api.perplexity.ai")
    payload = {
        "choices": [
            {
                "message": {
                    "content": '{"items":[{"title":"A","url":"https://news.test/a","published_at":"2026-04-20T00:00:00Z"}]}'
                }
            }
        ]
    }
    respx.post("https://api.perplexity.ai/v1/sonar").mock(return_value=httpx.Response(200, json=payload))
    items = PerplexityNewsSource(settings).fetch(_ctx())
    assert len(items) == 1
    assert items[0].source == "Perplexity"
    assert items[0].url == "https://news.test/a"
    assert items[0].headline == "A"


def test_feed_service_dedupes_same_url() -> None:
    settings = Settings(x_api_bearer_token="", perplexity_api_key="")
    svc = FeedService(settings)
    with patch.object(XSource, "fetch", return_value=[FeedItemOut("X", "https://x.test/a", "t1")]):
        with patch.object(
            PerplexityNewsSource,
            "fetch",
            return_value=[FeedItemOut("Perplexity", "https://x.test/a", "t2")],
        ):
            out = svc.collect(_ctx())
    assert len(out) == 1


def test_load_and_fetch_uses_cache_on_second_call() -> None:
    settings = Settings(
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="sr",
        feed_cache_seconds=300,
        x_api_bearer_token="",
        perplexity_api_key="",
    )
    client = MagicMock()

    def table_side(name: str) -> MagicMock:
        t = MagicMock()
        if name == "settings":
            t.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
        if name == "officials":
            t.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "full_name": "J",
                        "office_type": "state_supreme_justice",
                        "jurisdiction_id": None,
                    }
                ]
            )
        return t

    client.table.side_effect = table_side
    fake_items = [FeedItemOut("Perplexity", "https://example.com/x", "h")]

    with patch.object(FeedService, "collect", return_value=fake_items) as coll:
        a = load_and_fetch_feed_items(settings, client, "550e8400-e29b-41d4-a716-446655440000")
        b = load_and_fetch_feed_items(settings, client, "550e8400-e29b-41d4-a716-446655440000")

    assert a == fake_items
    assert b == fake_items
    assert coll.call_count == 1


def test_load_and_fetch_missing_official() -> None:
    settings = Settings(feed_cache_seconds=0)

    def table_side(name: str) -> MagicMock:
        t = MagicMock()
        if name == "settings":
            t.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
        if name == "officials":
            t.select.return_value.eq.return_value.is_.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[]
            )
        return t

    client = MagicMock()
    client.table.side_effect = table_side
    assert load_and_fetch_feed_items(settings, client, "550e8400-e29b-41d4-a716-446655440000") is None


def test_load_and_fetch_opt_out_skips_collect() -> None:
    settings = Settings(
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="sr",
        feed_cache_seconds=0,
    )
    oid = "550e8400-e29b-41d4-a716-446655440000"

    def table_side(name: str) -> MagicMock:
        t = MagicMock()
        if name == "settings":
            t.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[{"value": {"opt_out_official_ids": [oid]}}]
            )
        return t

    client = MagicMock()
    client.table.side_effect = table_side
    with patch.object(FeedService, "collect") as coll:
        out = load_and_fetch_feed_items(settings, client, oid)
    assert out == []
    coll.assert_not_called()
