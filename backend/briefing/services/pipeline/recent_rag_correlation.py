"""Run correlation pass over recently ingested rag_chunks (opinion text)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from briefing.config import Settings, get_settings
from briefing.services.llm.base import LLMService
from briefing.services.llm.correlation import CorrelationResult, run_correlation_pass


@dataclass
class RecentRagCorrelationOutcome:
    chunks_in_window: int
    text_chars: int
    result: CorrelationResult | None


def fetch_recent_rag_text(
    client: Any,
    *,
    hours: int = 48,
    max_chunks: int = 30,
    max_chars: int = 12_000,
) -> tuple[str, int]:
    """Load chunk bodies from rag_chunks updated within the last `hours`.

    Returns ``(combined_text, chunk_count)``. Chunks are concatenated in
    chronological order (oldest first). ``combined_text`` is truncated to
    ``max_chars``.
    """
    hours = max(1, hours)
    max_chunks = max(1, max_chunks)
    max_chars = max(500, max_chars)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    iso = cutoff.isoformat()
    res = (
        client.table("rag_chunks")
        .select("content,created_at")
        .gte("created_at", iso)
        .order("created_at", desc=True)
        .limit(max_chunks)
        .execute()
    )
    rows: list[dict[str, Any]] = list(res.data or [])
    if not rows:
        return "", 0
    rows.reverse()
    parts: list[str] = []
    total = 0
    n = len(rows)
    for r in rows:
        c = str(r.get("content", "")).strip()
        if not c:
            continue
        sep = "\n\n---\n\n" if parts else ""
        next_len = total + len(sep) + len(c)
        if next_len > max_chars:
            room = max_chars - total - len(sep)
            if room > 200:
                parts.append(sep + c[:room] + "…")
            break
        parts.append(sep + c)
        total = next_len
    return "".join(parts), n


def run_correlation_on_recent_rag_chunks(
    llm: LLMService,
    *,
    hours: int = 48,
    max_chunks: int = 30,
    max_chars: int = 12_000,
    persist: bool = False,
    dry_run: bool = False,
    min_confidence: float = 0.8,
    settings: Settings | None = None,
) -> RecentRagCorrelationOutcome:
    s = settings or get_settings()
    if not s.supabase_url or not s.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
        raise RuntimeError(msg)
    from supabase import create_client

    client = create_client(s.supabase_url, s.supabase_service_role_key)
    text, n = fetch_recent_rag_text(
        client,
        hours=hours,
        max_chunks=max_chunks,
        max_chars=max_chars,
    )
    if not text.strip():
        return RecentRagCorrelationOutcome(
            chunks_in_window=n,
            text_chars=0,
            result=None,
        )
    ctx = (
        f"recent_rag_correlation hours={hours} max_chunks={max_chunks} "
        f"chunks_in_query={n}"
    )
    result = run_correlation_pass(
        llm,
        text=text,
        context=ctx,
        persist=persist,
        dry_run=dry_run,
        min_confidence=min_confidence,
        settings=s,
    )
    return RecentRagCorrelationOutcome(
        chunks_in_window=n,
        text_chars=len(text),
        result=result,
    )
