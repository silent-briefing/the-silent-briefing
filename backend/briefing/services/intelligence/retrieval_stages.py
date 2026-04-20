"""Stage 1 A/B/C retrieval: Sonar JSON → validated EvidenceBundle → dossier_claims."""

from __future__ import annotations

import json
import re
from typing import Any, cast

from briefing.config import Settings, get_settings
from briefing.services.intelligence.evidence_bundle import (
    EvidenceBundle,
    RetrievalStageCode,
    category_for_stage,
    evidence_bundle_response_schema,
)
from briefing.services.llm.base import LLMService

_JSON_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.MULTILINE)

STAGE_FOCUS: dict[RetrievalStageCode, str] = {
    "A": (
        "Biographical lens: education, career, appointment or election path, prior offices, "
        "notable public statements. Every claim should be cautious and include a source URL when possible."
    ),
    "B": (
        "Judicial record lens: significant opinions, areas of law, patterns visible from public sources, "
        "court bio or docket references. Prefer primary court/government URLs."
    ),
    "C": (
        "Vetting lens (opposition-research tone but still factual): controversies, critiques, ethics questions, "
        "recusal or campaign-finance angles if reported. No unsourced insinuation; cite reporting or filings."
    ),
}


def _strip_json_fences(raw: str) -> str:
    s = raw.strip()
    s = _JSON_FENCE.sub("", s).strip()
    return s


def _parse_bundle_json(raw: str, stage: RetrievalStageCode) -> EvidenceBundle:
    try:
        data = json.loads(_strip_json_fences(raw))
    except json.JSONDecodeError as e:
        msg = f"Retrieval stage {stage}: invalid JSON from model: {raw[:400]!r}"
        raise ValueError(msg) from e
    if not isinstance(data, dict):
        msg = f"Retrieval stage {stage}: expected object, got {type(data).__name__}"
        raise ValueError(msg)
    data["retrieval_stage"] = stage
    return EvidenceBundle.model_validate(data)


def resolve_subject_seed(
    client: Any | None,
    official_id: str,
    subject_override: str,
) -> str:
    if subject_override.strip():
        return subject_override.strip()
    if client is None:
        msg = "Provide --subject or Supabase credentials so the official row can be loaded for the prompt seed"
        raise ValueError(msg)
    res = (
        client.table("officials")
        .select("full_name,slug,office_type")
        .eq("id", official_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        msg = f"No official with id {official_id!r}"
        raise ValueError(msg)
    o = res.data[0]
    return f"{o['full_name']} — office: {o['office_type']} — slug: {o['slug']}"


def run_retrieval_stage(
    llm: LLMService,
    settings: Settings,
    *,
    stage: RetrievalStageCode,
    official_id: str,
    subject_seed: str,
    rag_context: str = "",
    model: str | None = None,
) -> EvidenceBundle:
    """One Sonar call with JSON schema output; stage is enforced after parse (not from model)."""
    sys = (
        "You are Stage 1 retrieval for an internal Utah political intelligence dossier. "
        "Use web-aware search. Return ONLY JSON matching the schema (no markdown). "
        f"Pass focus: {STAGE_FOCUS[stage]}"
    )
    ctx = rag_context.strip() or "(none — rely on your retrieval)"
    user = (
        f"official_id: {official_id}\n"
        f"subject_seed:\n{subject_seed}\n\n"
        f"prior_context_or_notes:\n{ctx}\n"
    )
    raw = llm.chat_completion(
        messages=[{"role": "system", "content": sys}, {"role": "user", "content": user}],
        model=model or settings.retrieval_model,
        response_format=evidence_bundle_response_schema(),
        temperature=0.15,
    )
    return _parse_bundle_json(raw, stage)


def persist_retrieval_bundle(client: Any, official_id: str, bundle: EvidenceBundle) -> None:
    payload = {
        "official_id": official_id,
        "claim_text": bundle.to_prompt_block()[:20_000],
        "category": category_for_stage(bundle.retrieval_stage),
        "source_url": None,
        "pipeline_stage": "retrieval_sonar",
        "metadata": {
            "retrieval_stage": bundle.retrieval_stage,
            "evidence_bundle": bundle.model_dump(mode="json"),
        },
    }
    client.table("dossier_claims").insert(payload).execute()


def run_retrieval_stages_for_official(
    llm: LLMService,
    settings: Settings,
    *,
    official_id: str,
    stages: list[RetrievalStageCode],
    subject: str = "",
    rag_context: str = "",
    persist: bool = False,
    dry_run: bool = False,
    correlate: bool = False,
) -> list[EvidenceBundle]:
    """Run each stage in order; optionally persist claims and run correlation on merged text."""
    from supabase import create_client

    cfg = settings
    client: Any | None = None
    need_client = persist or (not subject.strip())
    if need_client:
        if not cfg.supabase_url or not cfg.supabase_service_role_key:
            msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for this operation"
            raise RuntimeError(msg)
        client = create_client(cfg.supabase_url, cfg.supabase_service_role_key)

    seed = resolve_subject_seed(client, official_id, subject)
    bundles: list[EvidenceBundle] = []
    for st in stages:
        b = run_retrieval_stage(
            llm,
            cfg,
            stage=st,
            official_id=official_id,
            subject_seed=seed,
            rag_context=rag_context,
        )
        bundles.append(b)
        if persist and not dry_run and client is not None:
            persist_retrieval_bundle(client, official_id, b)

    if correlate and not dry_run:
        from briefing.services.llm.correlation import run_correlation_pass

        text = "\n\n".join(x.to_prompt_block() for x in bundles)
        run_correlation_pass(
            llm,
            text=text,
            context=f"retrieval A/B/C official_id={official_id}",
            persist=persist,
            dry_run=False,
            settings=cfg,
        )

    return bundles


def parse_stage_list(spec: str) -> list[RetrievalStageCode]:
    out: list[RetrievalStageCode] = []
    for part in spec.split(","):
        p = part.strip().upper()
        if p not in ("A", "B", "C"):
            msg = f"Invalid stage {part!r} (use A, B, C comma-separated)"
            raise ValueError(msg)
        code = cast(RetrievalStageCode, p)
        if code not in out:
            out.append(code)
    return out
