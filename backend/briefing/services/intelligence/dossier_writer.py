"""Stage 2 writer: latest A/B/C evidence bundles (+ optional RAG) → Markdown dossier claim."""

from __future__ import annotations

from typing import Any

from briefing.config import Settings, get_settings
from briefing.services.intelligence.evidence_bundle import EvidenceBundle, category_for_stage
from briefing.services.llm.base import LLMService

_RESEARCH_CATEGORIES: tuple[str, ...] = (
    category_for_stage("A"),
    category_for_stage("B"),
    category_for_stage("C"),
)

_DOSSIER_SYSTEM = (
    "You are Stage 2 dossier writer for an internal Utah intelligence product. "
    "Using ONLY the evidence blocks and optional RAG snippets in the user message, "
    "produce a polished Markdown dossier (headings, bullets). "
    "Do not invent facts, URLs, or cases not present in the input. "
    "If evidence is thin, say so explicitly."
)


def fetch_retrieval_bundles_for_official(client: Any, official_id: str) -> list[EvidenceBundle]:
    res = (
        client.table("dossier_claims")
        .select("metadata,created_at")
        .eq("official_id", official_id)
        .in_("category", list(_RESEARCH_CATEGORIES))
        .order("created_at", desc=True)
        .execute()
    )
    by_stage: dict[str, EvidenceBundle] = {}
    for row in res.data or []:
        raw = (row.get("metadata") or {}).get("evidence_bundle")
        if not isinstance(raw, dict):
            continue
        b = EvidenceBundle.model_validate(raw)
        if b.retrieval_stage not in by_stage:
            by_stage[b.retrieval_stage] = b
    order = ("A", "B", "C")
    return [by_stage[s] for s in order if s in by_stage]


def merge_bundles_for_prompt(bundles: list[EvidenceBundle], rag_snippets: str) -> str:
    parts = [b.to_prompt_block() for b in bundles]
    if rag_snippets.strip():
        parts.append("## RAG snippets (opinion / internal chunks)\n\n" + rag_snippets.strip())
    return "\n\n---\n\n".join(parts)


def fetch_rag_snippets(
    llm: LLMService,
    client: Any,
    settings: Settings,
    *,
    query: str,
    match_count: int = 8,
) -> str:
    q = query.strip()
    if not q:
        return ""
    vecs = llm.embed_texts([q])
    if not vecs:
        return ""
    resp = client.rpc(
        "match_rag_chunks_public",
        {"query_embedding": vecs[0], "match_count": match_count},
    ).execute()
    rows = resp.data or []
    lines: list[str] = []
    for i, row in enumerate(rows, 1):
        sim = row.get("similarity")
        content = row.get("content") or ""
        lines.append(f"### Snippet {i} (similarity={sim})\n{content}")
    return "\n\n".join(lines)


def run_dossier_write_from_claims(
    llm: LLMService,
    settings: Settings | None = None,
    *,
    official_id: str,
    persist: bool = False,
    dry_run: bool = False,
    rag_query: str = "",
    rag_match_count: int = 8,
) -> str:
    from supabase import create_client

    cfg = settings or get_settings()
    if not cfg.supabase_url or not cfg.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
        raise RuntimeError(msg)
    client = create_client(cfg.supabase_url, cfg.supabase_service_role_key)
    bundles = fetch_retrieval_bundles_for_official(client, official_id)
    if not bundles:
        msg = (
            f"No Stage A/B/C dossier_claims with evidence_bundle metadata for official_id={official_id}. "
            "Run retrieval-pass first."
        )
        raise ValueError(msg)

    rag = (
        fetch_rag_snippets(
            llm,
            client,
            cfg,
            query=rag_query,
            match_count=rag_match_count,
        )
        if rag_query.strip()
        else ""
    )
    user_content = merge_bundles_for_prompt(bundles, rag)
    draft = llm.chat_completion(
        messages=[
            {"role": "system", "content": _DOSSIER_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        model=cfg.writer_model,
        temperature=0.25,
    )
    if dry_run or not persist:
        return draft

    client.table("dossier_claims").insert(
        {
            "official_id": official_id,
            "claim_text": draft[:50_000],
            "category": "Dossier / Draft",
            "source_url": None,
            "pipeline_stage": "writer_sonar",
            "metadata": {
                "source": "stage2_evidence_bundle_writer",
                "used_retrieval_stages": [b.retrieval_stage for b in bundles],
                "rag_query": rag_query.strip() or None,
            },
        }
    ).execute()
    return draft
