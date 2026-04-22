from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class OfficialFeedContext:
    official_id: str
    full_name: str
    office_type: str
    jurisdiction_name: str | None


@dataclass(frozen=True)
class FeedItemOut:
    source: str
    url: str
    headline: str | None = None
    published_at: str | None = None
