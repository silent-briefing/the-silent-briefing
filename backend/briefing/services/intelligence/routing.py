"""Subject alignment → retrieval stage list + staleness (Step 3 U3.4).

Rules are **data-driven** via ``Settings`` (env-overridable specs), not duplicated in prompts.
``officials.subject_alignment`` drives which stages run (GOP: bio + lighter vetting; others: full A/B/C).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from briefing.config import Settings
from briefing.services.intelligence.evidence_bundle import RetrievalStageCode
from briefing.services.intelligence.retrieval_stages import parse_stage_list

SubjectAlignment = Literal["gop", "opposition", "neutral", "nonpartisan"]

_VALID = frozenset({"gop", "opposition", "neutral", "nonpartisan"})


def normalize_subject_alignment(raw: str | None) -> SubjectAlignment:
    if not raw or not str(raw).strip():
        return "neutral"
    k = str(raw).strip().lower()
    if k in _VALID:
        return k  # type: ignore[return-value]
    return "neutral"


def retrieval_stages_and_c_intensity(
    alignment: str | None,
    settings: Settings,
) -> tuple[list[RetrievalStageCode], Literal["full", "light"]]:
    """Return ordered stages and vetting intensity for Stage C (light only for GOP-style runs)."""
    key = normalize_subject_alignment(alignment)
    if key == "gop":
        return parse_stage_list(settings.retrieval_stage_spec_gop), "light"
    return parse_stage_list(settings.retrieval_stage_spec_default), "full"


def fetch_subject_alignment(client: Any, official_id: str) -> str | None:
    res = (
        client.table("officials")
        .select("subject_alignment")
        .eq("id", official_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    return res.data[0].get("subject_alignment")


def latest_retrieval_sonar_claim_at(client: Any, official_id: str) -> datetime | None:
    res = (
        client.table("dossier_claims")
        .select("created_at")
        .eq("official_id", official_id)
        .eq("pipeline_stage", "retrieval_sonar")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    raw = res.data[0].get("created_at")
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
    if isinstance(raw, str):
        s = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def is_retrieval_stale(client: Any, official_id: str, settings: Settings) -> bool:
    """True when there is no recent ``retrieval_sonar`` claim within ``retrieval_stale_days``."""
    days = settings.retrieval_stale_days
    if days <= 0:
        return True
    ts = latest_retrieval_sonar_claim_at(client, official_id)
    if ts is None:
        return True
    age = datetime.now(timezone.utc) - ts
    return age.days >= days
