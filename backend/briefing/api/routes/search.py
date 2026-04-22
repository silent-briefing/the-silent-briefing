"""Global search — semantic leg embeds via Perplexity and calls match_rag_chunks_public (service role)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.config import Settings, get_settings

router = APIRouter(prefix="/v1/search", tags=["search"])


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    match_count: int = Field(default=8, ge=1, le=50)


class SemanticSearchHit(BaseModel):
    title: str
    score: float | None = None
    id: str | None = None
    slug: str | None = None
    source_url: str | None = None
    source_type: str | None = None


class SemanticSearchResponse(BaseModel):
    results: list[SemanticSearchHit]
    semantic_available: bool = True


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _preview_title(content: str, *, max_len: int = 160) -> str:
    text = content.strip()
    if not text:
        return "(empty chunk)"
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


@router.post("/semantic", response_model=SemanticSearchResponse)
def semantic_search(
    body: SemanticSearchRequest,
    _user: ClerkUser = Depends(require_clerk_user),
    settings: Settings = Depends(get_settings),
) -> SemanticSearchResponse:
    q = body.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="query required")

    if not settings.perplexity_api_key or not settings.perplexity_api_key.strip():
        return SemanticSearchResponse(results=[], semantic_available=False)

    from briefing.services.llm.perplexity import PerplexityLLMService

    try:
        llm = PerplexityLLMService(settings)
    except ValueError:
        return SemanticSearchResponse(results=[], semantic_available=False)

    vecs = llm.embed_texts([q])
    if not vecs:
        return SemanticSearchResponse(results=[], semantic_available=True)

    client = _sb_client(settings)
    resp = client.rpc(
        "match_rag_chunks_public",
        {"query_embedding": vecs[0], "match_count": body.match_count},
    ).execute()
    rows = resp.data or []
    results: list[SemanticSearchHit] = []
    for row in rows:
        raw_id = row.get("id")
        results.append(
            SemanticSearchHit(
                title=_preview_title(str(row.get("content") or "")),
                score=row.get("similarity"),
                id=str(raw_id) if raw_id is not None else None,
                source_url=row.get("source_url"),
                source_type=row.get("source_type"),
            )
        )
    return SemanticSearchResponse(results=results, semantic_available=True)
