"""Operator feed aggregation (X + Perplexity news)."""

from briefing.services.feeds.feed_service import FeedService, load_and_fetch_feed_items
from briefing.services.feeds.feed_types import FeedItemOut, OfficialFeedContext

__all__ = [
    "FeedItemOut",
    "FeedService",
    "OfficialFeedContext",
    "load_and_fetch_feed_items",
]
