"""Thin BFF for Phase 3 operator console — all DB access uses server-side service role."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from briefing.api.deps_auth import ClerkUser, require_clerk_user
from briefing.config import Settings, get_settings

router = APIRouter(prefix="/v1/console", tags=["console"])


class JurisdictionRef(BaseModel):
    id: str
    name: str
    slug: str


class OfficialCard(BaseModel):
    id: str
    slug: str
    full_name: str
    office_type: str
    bio_summary: str | None = None
    retention_year: int | None = None
    subject_alignment: str | None = None


class OfficialDetail(OfficialCard):
    jurisdiction: JurisdictionRef


class IntelligenceRunSummary(BaseModel):
    id: str
    pipeline_stage: str
    status: str
    created_at: str
    error_message: str | None = None
    official_id: str | None = None
    requires_human_review: bool | None = None


class BriefingIntelSummary(BaseModel):
    total_runs: int
    recent_runs: list[IntelligenceRunSummary]


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("/judicial/supreme-court", response_model=list[OfficialCard])
def list_ut_supreme_justices(settings: Settings = Depends(get_settings)) -> list[OfficialCard]:
    client = _sb_client(settings)
    jur = client.table("jurisdictions").select("id").eq("slug", "ut").limit(1).execute()
    if not jur.data:
        raise HTTPException(status_code=404, detail="Jurisdiction ut not found")
    ut_id = jur.data[0]["id"]
    res = (
        client.table("officials")
        .select("id,slug,full_name,office_type,bio_summary,retention_year,subject_alignment")
        .eq("jurisdiction_id", ut_id)
        .eq("office_type", "state_supreme_justice")
        .is_("deleted_at", "null")
        .eq("is_current", True)
        .order("full_name")
        .execute()
    )
    rows = res.data or []
    return [OfficialCard.model_validate(r) for r in rows]


@router.get("/officials/{slug}", response_model=OfficialDetail)
def get_official_by_slug(slug: str, settings: Settings = Depends(get_settings)) -> OfficialDetail:
    client = _sb_client(settings)
    res = (
        client.table("officials")
        .select("id,slug,full_name,office_type,bio_summary,retention_year,subject_alignment,jurisdiction_id")
        .eq("slug", slug)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Official not found")
    row = res.data[0]
    jid = row.get("jurisdiction_id")
    if not jid:
        raise HTTPException(status_code=500, detail="Official missing jurisdiction_id")
    jres = (
        client.table("jurisdictions")
        .select("id,name,slug")
        .eq("id", str(jid))
        .limit(1)
        .execute()
    )
    if not jres.data:
        raise HTTPException(status_code=500, detail="Jurisdiction row missing")
    j = jres.data[0]
    return OfficialDetail(
        id=str(row["id"]),
        slug=row["slug"],
        full_name=row["full_name"],
        office_type=row["office_type"],
        bio_summary=row.get("bio_summary"),
        retention_year=row.get("retention_year"),
        subject_alignment=row.get("subject_alignment"),
        jurisdiction=JurisdictionRef(id=str(j["id"]), name=j["name"], slug=j["slug"]),
    )


def _iso_created_at(value: object) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()  # type: ignore[no-any-return]
    return str(value)


@router.get("/briefing/intel-summary", response_model=BriefingIntelSummary)
def briefing_intel_summary(
    recent_limit: int = 20,
    _user: ClerkUser = Depends(require_clerk_user),
    settings: Settings = Depends(get_settings),
) -> BriefingIntelSummary:
    """Operator home: total intelligence run count + recent tail (RLS blocks JWT reads on this table)."""
    if recent_limit < 1 or recent_limit > 100:
        raise HTTPException(status_code=400, detail="recent_limit must be between 1 and 100")
    client = _sb_client(settings)
    count_res = client.table("intelligence_runs").select("id", count="exact").execute()
    total = int(count_res.count or 0)
    recent_res = (
        client.table("intelligence_runs")
        .select(
            "id,pipeline_stage,status,created_at,error_message,official_id,requires_human_review",
        )
        .order("created_at", desc=True)
        .limit(recent_limit)
        .execute()
    )
    raw = recent_res.data or []
    recent: list[IntelligenceRunSummary] = []
    for r in raw:
        recent.append(
            IntelligenceRunSummary(
                id=str(r["id"]),
                pipeline_stage=str(r["pipeline_stage"]),
                status=str(r["status"]),
                created_at=_iso_created_at(r.get("created_at")),
                error_message=r.get("error_message"),
                official_id=str(r["official_id"]) if r.get("official_id") else None,
                requires_human_review=r.get("requires_human_review"),
            )
        )
    return BriefingIntelSummary(total_runs=total, recent_runs=recent)
