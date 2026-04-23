from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Protocol

from briefing.config import Settings, get_settings
from briefing.services.llm.base import LLMService

CRITIQUE_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "dossier_critique",
        "schema": {
            "type": "object",
            "properties": {
                "issues": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Potential problems vs supplied evidence",
                },
                "unsupported_claims": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Draft sentences not clearly supported by evidence",
                },
                "severity": {
                    "type": "string",
                    "enum": ["low", "medium", "high"],
                },
            },
            "required": ["issues", "unsupported_claims", "severity"],
            "additionalProperties": False,
        },
    },
}

SYNTHESIS_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "dossier_synthesis",
        "schema": {
            "type": "object",
            "properties": {
                "final_dossier": {"type": "string"},
                "groundedness_score": {"type": "number", "minimum": 0, "maximum": 1},
                "requires_human_review": {"type": "boolean"},
            },
            "required": ["final_dossier", "groundedness_score", "requires_human_review"],
            "additionalProperties": False,
        },
    },
}


class SupportsIntelligenceRuns(Protocol):
    def table(self, name: str) -> Any: ...


def _stable_key(parts: list[str]) -> str:
    h = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:32]
    return f"adv-{h}"


@dataclass
class AdversarialPipelineResult:
    evidence_json: str
    primary_draft: str
    critique_json: str
    final_dossier: str
    groundedness_score: float
    requires_human_review: bool
    stage_summaries: list[dict[str, Any]] = field(default_factory=list)
    persisted_run_ids: list[str] = field(default_factory=list)


def retrieve_evidence(llm: LLMService, settings: Settings, *, subject_brief: str) -> str:
    system = (
        "You are Stage 1 retrieval for an internal research dossier. "
        "Return ONLY valid JSON (no markdown) with keys: "
        "evidence_items (array of {claim: string, source_url: string|null, notes: string}), "
        "summary (string). Every claim should be conservative and cite a URL when possible."
    )
    return llm.chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": subject_brief},
        ],
        model=settings.correlation_model,
        temperature=0.1,
    )


def generate_draft(llm: LLMService, settings: Settings, *, evidence_json: str) -> str:
    system = (
        "You are Stage 2 writer. Using ONLY the JSON evidence bundle in the user message, "
        "produce a concise dossier draft (Markdown). Do not invent URLs or facts absent from the bundle."
    )
    return llm.chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": evidence_json},
        ],
        model=settings.writer_model,
        temperature=0.3,
    )


def critique_draft(
    llm: LLMService,
    settings: Settings,
    *,
    draft: str,
    evidence_json: str,
) -> str:
    system = (
        "You are Stage 3 adversarial review. Compare the draft to the evidence JSON. "
        "Flag unsupported or overstated language. Output must match the JSON schema exactly."
    )
    user = f"EVIDENCE_JSON:\n{evidence_json}\n\nDRAFT:\n{draft}"
    return llm.chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        model=settings.adversarial_model,
        response_format=CRITIQUE_RESPONSE_FORMAT,
        temperature=0.1,
    )


def synthesize_final(
    llm: LLMService,
    settings: Settings,
    *,
    draft: str,
    critique_json: str,
) -> tuple[str, float, bool]:
    system = (
        "You are Stage 4 synthesis. Merge the draft with the critique: tighten wording, "
        "remove or qualify unsupported points, keep Markdown. "
        "Set groundedness_score 0-1 (higher = better grounded in evidence). "
        "Set requires_human_review true if severity in critique is high or unsupported_claims is non-empty."
    )
    user = f"CRITIQUE_JSON:\n{critique_json}\n\nPRIMARY_DRAFT:\n{draft}"
    raw = llm.chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        model=settings.writer_model,
        response_format=SYNTHESIS_RESPONSE_FORMAT,
        temperature=0.2,
    )
    data = json.loads(raw)
    return (
        str(data["final_dossier"]),
        float(data["groundedness_score"]),
        bool(data["requires_human_review"]),
    )


def persist_pipeline_runs(
    client: SupportsIntelligenceRuns,
    *,
    official_id: str,
    base_key: str,
    evidence_json: str,
    primary_draft: str,
    critique_json: str,
    final_dossier: str,
    groundedness_score: float,
    requires_human_review: bool,
    settings: Settings,
) -> list[str]:
    ids: list[str] = []
    stages: list[tuple[str, str, str, dict[str, Any]]] = [
        ("retrieval_sonar", settings.correlation_model, evidence_json, {"stage": "retrieve"}),
        ("writer_sonar", settings.writer_model, primary_draft, {"stage": "generate"}),
        ("critique_sonar", settings.adversarial_model, critique_json, {"stage": "critique"}),
        (
            "writer_sonar",
            settings.writer_model,
            final_dossier,
            {"stage": "synthesize"},
        ),
    ]
    for idx, (pipeline_stage, model_id, text, meta) in enumerate(stages):
        row: dict[str, Any] = {
            "official_id": official_id,
            "model_id": model_id,
            "pipeline_stage": pipeline_stage,
            "status": "succeeded",
            "raw_response": {"text": text, **meta},
            "idempotency_key": f"{base_key}:{idx}:{pipeline_stage}",
            "metadata": {"pipeline": "adversarial_dossier", "step": meta["stage"]},
        }
        if idx == len(stages) - 1:
            row["groundedness_score"] = groundedness_score
            row["requires_human_review"] = requires_human_review
        res = client.table("intelligence_runs").insert(row).execute()
        if res.data and isinstance(res.data, list) and res.data[0].get("id"):
            ids.append(str(res.data[0]["id"]))
        else:
            ids.append("")
    return ids


def insert_dossier_claim_for_adversarial_review(
    client: SupportsIntelligenceRuns,
    *,
    official_id: str,
    final_dossier: str,
    critique_json: str,
    groundedness_score: float,
    requires_human_review: bool,
) -> None:
    """Surface synthesis in `dossier_claims` so the admin review queue can pick it up."""
    row: dict[str, Any] = {
        "official_id": official_id,
        "claim_text": final_dossier,
        "category": "Adversarial synthesis",
        "pipeline_stage": "writer_sonar",
        "published": False,
        "requires_human_review": requires_human_review,
        "groundedness_score": groundedness_score,
        "metadata": {
            "adversarial_pipeline": True,
            "critique_json": critique_json,
        },
        "source_url": None,
    }
    client.table("dossier_claims").insert(row).execute()


def run_adversarial_dossier_pipeline(
    llm: LLMService,
    *,
    subject_brief: str,
    official_id: str | None = None,
    persist: bool = False,
    dry_run: bool = False,
    settings: Settings | None = None,
    idempotency_seed: str | None = None,
) -> AdversarialPipelineResult:
    s = settings or get_settings()
    evidence = retrieve_evidence(llm, s, subject_brief=subject_brief)
    draft = generate_draft(llm, s, evidence_json=evidence)
    critique = critique_draft(llm, s, draft=draft, evidence_json=evidence)
    final_text, g_score, review = synthesize_final(llm, s, draft=draft, critique_json=critique)

    summaries = [
        {"stage": "retrieve", "chars": len(evidence)},
        {"stage": "generate", "chars": len(draft)},
        {"stage": "critique", "chars": len(critique)},
        {"stage": "synthesize", "chars": len(final_text)},
    ]
    persisted: list[str] = []
    if persist and not dry_run:
        if not s.supabase_url or not s.supabase_service_role_key:
            msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for persist"
            raise RuntimeError(msg)
        if not official_id:
            msg = "official_id required when persist=True"
            raise ValueError(msg)
        from supabase import create_client

        client = create_client(s.supabase_url, s.supabase_service_role_key)
        seed = idempotency_seed or str(uuid.uuid4())
        base_key = _stable_key([official_id, seed, subject_brief[:200]])
        persisted = persist_pipeline_runs(
            client,
            official_id=official_id,
            base_key=base_key,
            evidence_json=evidence,
            primary_draft=draft,
            critique_json=critique,
            final_dossier=final_text,
            groundedness_score=g_score,
            requires_human_review=review,
            settings=s,
        )
        insert_dossier_claim_for_adversarial_review(
            client,
            official_id=official_id,
            final_dossier=final_text,
            critique_json=critique,
            groundedness_score=g_score,
            requires_human_review=review,
        )

    return AdversarialPipelineResult(
        evidence_json=evidence,
        primary_draft=draft,
        critique_json=critique,
        final_dossier=final_text,
        groundedness_score=g_score,
        requires_human_review=review,
        stage_summaries=summaries,
        persisted_run_ids=persisted,
    )
