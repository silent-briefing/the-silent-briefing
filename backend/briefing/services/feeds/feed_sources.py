"""X API and Perplexity Sonar feed fetchers."""

from __future__ import annotations

import json

import httpx

from briefing.config import Settings
from briefing.services.feeds.feed_types import FeedItemOut, OfficialFeedContext
from briefing.services.llm.perplexity import PerplexityLLMService

_NEWS_JSON_PROMPT = """You are a news indexer for a Utah politics research console.
Topic: {topic}

Return ONLY valid JSON (no markdown) with this exact shape:
{{"items":[{{"title":"string","url":"https://...","published_at":"ISO-8601 or empty string"}}]}}
Rules:
- At most 8 items.
- Every url must be https and must look like a real article or government page.
- Prefer Utah outlets or Utah-related coverage when relevant.
- If you have no credible links, return {{"items":[]}}.
"""


def topic_line(ctx: OfficialFeedContext) -> str:
    parts = [ctx.full_name, ctx.office_type.replace("_", " "), "Utah"]
    if ctx.jurisdiction_name:
        parts.insert(-1, ctx.jurisdiction_name)
    return " · ".join(parts)


def twitter_query(ctx: OfficialFeedContext) -> str:
    name = ctx.full_name.strip()
    base = f'"{name}" Utah' if name else "Utah politics"
    return base[:512]


class XSource:
    def __init__(self, settings: Settings) -> None:
        self._s = settings

    def fetch(self, ctx: OfficialFeedContext) -> list[FeedItemOut]:
        token = (self._s.x_api_bearer_token or "").strip()
        if not token:
            return []
        q = twitter_query(ctx)
        params = {"query": q, "max_results": "10", "tweet.fields": "created_at,text"}
        headers = {"Authorization": f"Bearer {token}"}
        try:
            with httpx.Client(timeout=25.0) as client:
                r = client.get(
                    "https://api.twitter.com/2/tweets/search/recent",
                    params=params,
                    headers=headers,
                )
                r.raise_for_status()
                payload = r.json()
        except (httpx.HTTPError, ValueError):
            return []

        data = payload.get("data")
        if not isinstance(data, list):
            return []
        out: list[FeedItemOut] = []
        for row in data:
            if not isinstance(row, dict):
                continue
            tid = row.get("id")
            text = row.get("text") or ""
            created = row.get("created_at")
            if not tid:
                continue
            url = f"https://x.com/i/web/status/{tid}"
            headline = (text[:280] + "…") if len(text) > 280 else text
            pub = str(created) if created else None
            out.append(
                FeedItemOut(source="X", url=url, headline=headline or None, published_at=pub)
            )
        return out


class PerplexityNewsSource:
    def __init__(self, settings: Settings) -> None:
        self._s = settings

    def fetch(self, ctx: OfficialFeedContext) -> list[FeedItemOut]:
        if not (self._s.perplexity_api_key or "").strip():
            return []
        topic = topic_line(ctx)
        try:
            llm = PerplexityLLMService(self._s)
            raw = llm.chat_completion(
                messages=[{"role": "user", "content": _NEWS_JSON_PROMPT.format(topic=topic)}],
                temperature=0.1,
            )
        except (RuntimeError, ValueError):
            return []
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return []
        rows = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            return []
        out: list[FeedItemOut] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            title = str(row.get("title") or "").strip()
            url = str(row.get("url") or "").strip()
            pub_raw = row.get("published_at")
            pub = str(pub_raw).strip() if pub_raw else None
            if not title or not url.startswith("https://"):
                continue
            out.append(
                FeedItemOut(
                    source="Perplexity",
                    url=url,
                    headline=title,
                    published_at=pub if pub else None,
                )
            )
        return out
