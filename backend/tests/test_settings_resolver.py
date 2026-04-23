from __future__ import annotations

from unittest.mock import MagicMock

from briefing.config import Settings
from briefing.services.settings.resolver import (
    FeedPolicy,
    coerce_settings_url_value,
    merge_source_urls_from_db,
    resolve_operator_feeds,
)


def test_coerce_settings_url_value() -> None:
    assert coerce_settings_url_value({"url": " https://a.test/x "}) == "https://a.test/x"
    assert coerce_settings_url_value({"value": "https://b.test"}) == "https://b.test"
    assert coerce_settings_url_value("https://c.test") == "https://c.test"
    assert coerce_settings_url_value({}) is None


def test_merge_source_urls_from_db_overrides_env() -> None:
    base = Settings(
        vote_utah_filings_url="https://env.example/vote",
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="sr",
    )
    client = MagicMock()
    client.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
        data=[{"key": "vote_utah_filings_url", "value": {"url": "https://db.example/vote"}}]
    )
    merged = merge_source_urls_from_db(base, client=client)
    assert merged.vote_utah_filings_url == "https://db.example/vote"


def test_resolve_operator_feeds_from_db() -> None:
    settings = Settings(feed_cache_seconds=100, supabase_url="http://x", supabase_service_role_key="y")
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[
            {
                "value": {
                    "cache_seconds": 42,
                    "x_enabled": False,
                    "perplexity_enabled": True,
                    "opt_out_official_ids": ["aa"],
                }
            }
        ]
    )
    p = resolve_operator_feeds(settings, client)
    assert p.cache_seconds == 42
    assert p.x_enabled is False
    assert p.perplexity_enabled is True
    assert p.opt_out_official_ids == frozenset({"aa"})


def test_resolve_operator_feeds_defaults() -> None:
    s = Settings(feed_cache_seconds=55)
    p = resolve_operator_feeds(s, None)
    assert p == FeedPolicy(
        cache_seconds=55,
        x_enabled=True,
        perplexity_enabled=True,
        opt_out_official_ids=frozenset(),
    )


def test_merge_without_matching_rows_returns_same() -> None:
    s = Settings(
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key="sr",
    )
    client = MagicMock()
    client.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(data=[])
    assert merge_source_urls_from_db(s, client=client) is s
