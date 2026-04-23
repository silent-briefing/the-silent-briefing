"""Scheduled maintenance jobs for cron, Cloud Scheduler, or a future queue (ARQ not wired)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ScheduledJob:
    """One logical recurring task — operator maps cadence to system scheduler."""

    job_id: str
    title: str
    description: str
    cadence: str
    cron_suggestion: str
    cli_example: str


SCHEDULED_JOBS: tuple[ScheduledJob, ...] = (
    ScheduledJob(
        job_id="judicial-weekly",
        title="Utah Supreme roster refresh",
        description="Re-scrape utcourts roster; upsert officials (bios optional).",
        cadence="Weekly (e.g. Sunday 06:00 UTC)",
        cron_suggestion="0 6 * * 0",
        cli_example=(
            "uv run python -m briefing.worker judicial-extraction --persist"
        ),
    ),
    ScheduledJob(
        job_id="opinion-daily",
        title="Recent opinion PDF ingestion",
        description="Legacy index → chunk → embed → rag_chunks (raise --limit in prod).",
        cadence="Daily (e.g. 07:00 UTC)",
        cron_suggestion="0 7 * * *",
        cli_example=(
            "uv run python -m briefing.worker opinion-ingestion "
            "--limit 10 --persist"
        ),
    ),
    ScheduledJob(
        job_id="correlation-recent",
        title="Correlation on new RAG chunks",
        description=(
            "Load rag_chunks from the last N hours; run cheap Sonar edge proposal; "
            "persist high-confidence entity_edges."
        ),
        cadence="Daily after opinions (e.g. 08:00 UTC) or on-demand",
        cron_suggestion="0 8 * * *",
        cli_example=(
            "uv run python -m briefing.worker correlation-recent-chunks "
            "--hours 48 --max-chunks 30 --persist"
        ),
    ),
    ScheduledJob(
        job_id="retention-weekly",
        title="Ballotpedia retention sync",
        description="Optional weekly refresh of retention vote claims for UT supreme slugs.",
        cadence="Weekly (e.g. Monday 06:00 UTC)",
        cron_suggestion="0 6 * * 1",
        cli_example=(
            "uv run python -m briefing.worker retention-extraction --persist"
        ),
    ),
    ScheduledJob(
        job_id="staged-retrieval-on-demand",
        title="Step 3 Stage 1–2 (A/B/C retrieval + dossier draft)",
        description=(
            "Per-official Sonar passes (bio / record / vetting) into dossier_claims; "
            "then Stage 2 writer from stored bundles. Run on-demand until staleness routing lands."
        ),
        cadence="On-demand (or nightly per official when orchestrated)",
        cron_suggestion="—",
        cli_example=(
            "uv run python -m briefing.worker retrieval-pass --official-id <UUID> --persist\n"
            "uv run python -m briefing.worker dossier-write --official-id <UUID> --persist"
        ),
    ),
)


def format_schedule_catalog() -> str:
    lines: list[str] = [
        "Silent Briefing — scheduled worker jobs",
        "",
        "Heavy work uses `python -m briefing.worker` subcommands. "
        "Wire these to cron, Kubernetes CronJob, or a queue when ARQ/Redis lands.",
        "",
    ]
    for j in SCHEDULED_JOBS:
        lines.extend(
            [
                f"[{j.job_id}] {j.title}",
                f"  Cadence: {j.cadence}  (cron example: {j.cron_suggestion})",
                f"  {j.description}",
                f"  CLI: {j.cli_example}",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def print_schedule_catalog() -> None:
    print(format_schedule_catalog(), end="")


def get_catalog() -> list[dict[str, Any]]:
    """Machine-readable list of jobs allowed for `POST /v1/admin/runs/trigger` (Phase C.4)."""
    from briefing.services.admin_worker_trigger import get_trigger_catalog

    return get_trigger_catalog()
