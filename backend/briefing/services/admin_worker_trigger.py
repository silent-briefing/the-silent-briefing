"""Build argv for `python -m briefing.worker` from admin trigger payloads."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

IN_FLIGHT_STATUSES: frozenset[str] = frozenset({"queued", "running"})
TERMINAL_STATUSES: frozenset[str] = frozenset({"succeeded", "failed", "partial"})


@dataclass(frozen=True)
class TriggerableWorkerJob:
    job_id: str
    title: str
    description: str
    requires_official_id: bool
    requires_subject: bool
    requires_correlation_text: bool


TRIGGERABLE_WORKER_JOBS: tuple[TriggerableWorkerJob, ...] = (
    TriggerableWorkerJob(
        job_id="retrieval-pass",
        title="Retrieval pass",
        description="Stage 1 A/B/C Sonar retrieval → dossier_claims (Research / Stage *).",
        requires_official_id=True,
        requires_subject=False,
        requires_correlation_text=False,
    ),
    TriggerableWorkerJob(
        job_id="dossier-write",
        title="Dossier write",
        description="Stage 2 writer from bundles (+ optional RAG) → writer_sonar claim.",
        requires_official_id=True,
        requires_subject=False,
        requires_correlation_text=False,
    ),
    TriggerableWorkerJob(
        job_id="adversarial-dossier",
        title="Adversarial dossier",
        description="Four-stage adversarial pipeline → intelligence_runs (+ claims when configured).",
        requires_official_id=True,
        requires_subject=True,
        requires_correlation_text=False,
    ),
    TriggerableWorkerJob(
        job_id="correlation-pass",
        title="Correlation pass",
        description="Sonar correlation on free text → proposed entity_edges.",
        requires_official_id=False,
        requires_subject=False,
        requires_correlation_text=True,
    ),
    TriggerableWorkerJob(
        job_id="retention-extraction",
        title="Retention extraction",
        description="Ballotpedia retention → dossier_claims (Utah supreme roster).",
        requires_official_id=False,
        requires_subject=False,
        requires_correlation_text=False,
    ),
    TriggerableWorkerJob(
        job_id="opinion-ingestion",
        title="Opinion ingestion",
        description="UT Supreme PDF opinions → rag_chunks (+ optional correlate).",
        requires_official_id=False,
        requires_subject=False,
        requires_correlation_text=False,
    ),
)

_TRIGGER_INDEX: dict[str, TriggerableWorkerJob] = {j.job_id: j for j in TRIGGERABLE_WORKER_JOBS}


def get_trigger_catalog() -> list[dict[str, Any]]:
    return [
        {
            "job_id": j.job_id,
            "title": j.title,
            "description": j.description,
            "requires_official_id": j.requires_official_id,
            "requires_subject": j.requires_subject,
            "requires_correlation_text": j.requires_correlation_text,
        }
        for j in TRIGGERABLE_WORKER_JOBS
    ]


def get_trigger_job(job_id: str) -> TriggerableWorkerJob | None:
    return _TRIGGER_INDEX.get(job_id)


def build_worker_argv(*, job_id: str, payload: dict[str, Any]) -> list[str]:
    """Return argv tokens after `uv run python -m briefing.worker`."""
    argv: list[str] = [job_id]

    if job_id == "retrieval-pass":
        oid = payload.get("official_id")
        if not oid:
            raise ValueError("official_id is required")
        argv += ["--official-id", str(oid), "--persist"]
        if payload.get("subject"):
            argv += ["--subject", str(payload["subject"])]
        stages = payload.get("stages")
        if stages:
            argv += ["--stages", str(stages)]
        if payload.get("rag_context"):
            argv += ["--rag-context", str(payload["rag_context"])]
        if payload.get("use_routing"):
            argv.append("--use-routing")
        if payload.get("skip_if_fresh"):
            argv.append("--skip-if-fresh")
        if payload.get("correlate"):
            argv.append("--correlate")
        return argv

    if job_id == "dossier-write":
        oid = payload.get("official_id")
        if not oid:
            raise ValueError("official_id is required")
        argv += ["--official-id", str(oid), "--persist"]
        if payload.get("rag_query"):
            argv += ["--rag-query", str(payload["rag_query"])]
        if payload.get("rag_match_count") is not None:
            argv += ["--rag-match-count", str(int(payload["rag_match_count"]))]
        return argv

    if job_id == "adversarial-dossier":
        subj = (payload.get("subject") or "").strip()
        if not subj:
            raise ValueError("subject is required")
        oid = payload.get("official_id")
        if not oid:
            raise ValueError("official_id is required for persisted adversarial runs")
        argv += ["--subject", subj, "--official-id", str(oid), "--persist"]
        return argv

    if job_id == "correlation-pass":
        text = (payload.get("correlation_text") or "").strip()
        if not text:
            raise ValueError("correlation_text is required")
        argv += ["--text", text, "--persist"]
        if payload.get("correlation_context"):
            argv += ["--context", str(payload["correlation_context"])]
        if payload.get("min_confidence") is not None:
            argv += ["--min-confidence", str(float(payload["min_confidence"]))]
        return argv

    if job_id == "retention-extraction":
        argv.append("--persist")
        if payload.get("retention_slugs"):
            argv += ["--slugs", str(payload["retention_slugs"])]
        return argv

    if job_id == "opinion-ingestion":
        oid = (payload.get("opinion_id") or "").strip()
        if oid:
            argv += ["--opinion-id", oid]
        argv.append("--persist")
        limit = payload.get("opinion_limit")
        if limit is not None and not oid:
            argv += ["--limit", str(int(limit))]
        if payload.get("no_embed"):
            argv.append("--no-embed")
        if payload.get("no_correlate"):
            argv.append("--no-correlate")
        return argv

    raise ValueError(f"unsupported job: {job_id}")
