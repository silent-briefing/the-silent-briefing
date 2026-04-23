"""Admin BFF — officials CRUD (service_role + audit on every mutation)."""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role

log = logging.getLogger(__name__)

router = APIRouter()

JUDGE_OFFICE_TYPES = frozenset(
    {
        "state_supreme_justice",
        "state_appellate_judge",
        "state_district_judge",
        "federal_judge",
    }
)

OFFICE_TYPES = (
    "senator",
    "representative",
    "governor",
    "lt_governor",
    "attorney_general",
    "mayor",
    "city_council",
    "county_commissioner",
    "county_clerk",
    "county_mayor",
    "state_supreme_justice",
    "state_appellate_judge",
    "state_district_judge",
    "federal_judge",
)


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _audit(
    settings: Settings,
    *,
    user: ClerkUser,
    action: str,
    target_id: str | None,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
) -> None:
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action=action,
            target_type="official",
            target_id=target_id,
            before=before,
            after=after,
        )
    except Exception:
        log.exception("admin_audit_failed action=%s target=%s", action, target_id)
        raise HTTPException(status_code=500, detail="Audit log write failed") from None


def _normalize_party(office_type: str, party: str | None) -> str | None:
    if office_type in JUDGE_OFFICE_TYPES:
        return None
    if party is None or party == "":
        return None
    return party


def _validate_party_rule(office_type: str, party: str | None) -> None:
    if office_type in JUDGE_OFFICE_TYPES and party not in (None, ""):
        raise ValueError("Judges cannot have a party (office_type is judicial)")


class JurisdictionRef(BaseModel):
    name: str
    slug: str


class OfficialAdminRow(BaseModel):
    id: str
    full_name: str
    slug: str
    jurisdiction_id: str
    office_type: str
    party: str | None = None
    subject_alignment: str | None = None
    term_start: str | None = None
    term_end: str | None = None
    retention_year: int | None = None
    is_current: bool
    photo_url: str | None = None
    bio_summary: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None
    jurisdictions: JurisdictionRef | None = None

    @model_validator(mode="before")
    @classmethod
    def flatten_jurisdiction(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        raw = data.get("jurisdictions")
        if isinstance(raw, list) and raw:
            j0 = raw[0]
            if isinstance(j0, dict):
                data = {**data, "jurisdictions": JurisdictionRef.model_validate(j0)}
        elif isinstance(raw, dict):
            data = {**data, "jurisdictions": JurisdictionRef.model_validate(raw)}
        return data


class OfficialsListResponse(BaseModel):
    items: list[OfficialAdminRow]
    total: int


class OfficialCreateBody(BaseModel):
    full_name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    jurisdiction_id: str
    office_type: str
    party: str | None = None
    subject_alignment: str | None = None
    term_start: str | None = None
    term_end: str | None = None
    retention_year: int | None = None
    is_current: bool = True
    photo_url: str | None = None
    bio_summary: str | None = None

    @model_validator(mode="after")
    def _office_enum(self) -> OfficialCreateBody:
        if self.office_type not in OFFICE_TYPES:
            raise ValueError("invalid office_type")
        _validate_party_rule(self.office_type, self.party)
        return self


class OfficialPatchBody(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    slug: str | None = Field(default=None, min_length=1)
    jurisdiction_id: str | None = None
    office_type: str | None = None
    party: str | None = None
    subject_alignment: str | None = None
    term_start: str | None = None
    term_end: str | None = None
    retention_year: int | None = None
    is_current: bool | None = None
    photo_url: str | None = None
    bio_summary: str | None = None


def _safe_ilike_fragment(q: str) -> str:
    cleaned = re.sub(r"[%*]", "", q).strip()[:80]
    return cleaned


@router.get("/officials", response_model=OfficialsListResponse)
def list_officials(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    j: str | None = Query(None, description="jurisdiction_id filter (UUID)"),
    office: str | None = Query(None, description="office_type"),
    party: str | None = Query(None),
    align: str | None = Query(None, description="subject_alignment"),
    current: str | None = Query(
        None,
        description="is_current: '1' true, '0' false, 'all' no filter",
    ),
    q: str | None = Query(None, description="Search full_name / slug (ilike)"),
) -> OfficialsListResponse:
    _ = user
    client = _sb_client(settings)
    sel = (
        "id,full_name,slug,jurisdiction_id,office_type,party,subject_alignment,"
        "term_start,term_end,retention_year,is_current,photo_url,bio_summary,"
        "created_at,updated_at,deleted_at,jurisdictions(name,slug)"
    )
    query = client.table("officials").select(sel, count="exact").is_("deleted_at", "null")

    if j:
        query = query.eq("jurisdiction_id", j)
    if office:
        query = query.eq("office_type", office)
    if party is not None and party != "":
        query = query.eq("party", party)
    if align is not None and align != "":
        query = query.eq("subject_alignment", align)
    if current == "all":
        pass
    elif current == "0" or current == "false":
        query = query.eq("is_current", False)
    else:
        query = query.eq("is_current", True)

    frag = _safe_ilike_fragment(q or "")
    if frag:
        pattern = f"%{frag}%"
        query = query.or_(f"full_name.ilike.{pattern},slug.ilike.{pattern}")

    end = offset + limit - 1
    try:
        res = query.order("full_name").range(offset, end).execute()
    except Exception as e:
        log.warning("admin_officials_list_failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid list filters or query") from e

    rows = res.data or []
    total = getattr(res, "count", None)
    if total is None:
        total = len(rows)
    items = [OfficialAdminRow.model_validate(r) for r in rows]
    return OfficialsListResponse(items=items, total=int(total))


@router.get("/officials/{official_id}", response_model=OfficialAdminRow)
def get_official(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    official_id: str,
    settings: Settings = Depends(get_settings),
) -> OfficialAdminRow:
    _ = user
    client = _sb_client(settings)
    row = _fetch_official_row(client, official_id, include_deleted=False)
    return OfficialAdminRow.model_validate(row)


@router.post("/officials", response_model=OfficialAdminRow)
def create_official(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    body: OfficialCreateBody,
    settings: Settings = Depends(get_settings),
) -> OfficialAdminRow:
    client = _sb_client(settings)
    party = _normalize_party(body.office_type, body.party)
    payload = {
        "full_name": body.full_name.strip(),
        "slug": body.slug.strip(),
        "jurisdiction_id": body.jurisdiction_id,
        "office_type": body.office_type,
        "party": party,
        "subject_alignment": body.subject_alignment,
        "term_start": body.term_start,
        "term_end": body.term_end,
        "retention_year": body.retention_year,
        "is_current": body.is_current,
        "photo_url": body.photo_url,
        "bio_summary": body.bio_summary,
    }
    try:
        res = (
            client.table("officials")
            .insert(payload)
            .select(
                "id,full_name,slug,jurisdiction_id,office_type,party,subject_alignment,"
                "term_start,term_end,retention_year,is_current,photo_url,bio_summary,"
                "created_at,updated_at,deleted_at,jurisdictions(name,slug)"
            )
            .execute()
        )
    except Exception as e:
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg or "23505" in msg:
            raise HTTPException(status_code=409, detail="Slug already exists") from e
        log.warning("admin_official_create_failed: %s", e)
        raise HTTPException(status_code=400, detail="Create failed") from e

    if not res.data:
        raise HTTPException(status_code=500, detail="Create returned no row")
    row = res.data[0]
    row_model = OfficialAdminRow.model_validate(row)
    _audit(
        settings,
        user=user,
        action="official.create",
        target_id=row_model.id,
        before=None,
        after=row_model.model_dump(mode="json"),
    )
    return row_model


def _fetch_official_row(client: Any, official_id: str, *, include_deleted: bool) -> dict[str, Any]:
    q = (
        client.table("officials")
        .select(
            "id,full_name,slug,jurisdiction_id,office_type,party,subject_alignment,"
            "term_start,term_end,retention_year,is_current,photo_url,bio_summary,"
            "created_at,updated_at,deleted_at,jurisdictions(name,slug)"
        )
        .eq("id", official_id)
        .limit(1)
    )
    if not include_deleted:
        q = q.is_("deleted_at", "null")
    res = q.execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Official not found")
    return res.data[0]


@router.patch("/officials/{official_id}", response_model=OfficialAdminRow)
def patch_official(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    official_id: str,
    body: OfficialPatchBody,
    settings: Settings = Depends(get_settings),
) -> OfficialAdminRow:
    client = _sb_client(settings)
    before_row = _fetch_official_row(client, official_id, include_deleted=False)
    before_model = OfficialAdminRow.model_validate(before_row)

    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return before_model

    effective_office = patch.get("office_type", before_model.office_type)
    if "office_type" in patch and patch["office_type"] not in OFFICE_TYPES:
        raise HTTPException(status_code=422, detail="invalid office_type")

    incoming_party = patch["party"] if "party" in patch else before_model.party
    if effective_office in JUDGE_OFFICE_TYPES and incoming_party not in (None, ""):
        raise HTTPException(
            status_code=422,
            detail="Judges cannot have a party (office_type is judicial)",
        )
    if effective_office in JUDGE_OFFICE_TYPES:
        patch["party"] = None
    elif "party" in patch:
        patch["party"] = _normalize_party(effective_office, patch["party"])

    for k, v in list(patch.items()):
        if isinstance(v, str):
            patch[k] = v.strip() if k in ("full_name", "slug") else v

    try:
        res = (
            client.table("officials")
            .update(patch)
            .eq("id", official_id)
            .is_("deleted_at", "null")
            .select(
                "id,full_name,slug,jurisdiction_id,office_type,party,subject_alignment,"
                "term_start,term_end,retention_year,is_current,photo_url,bio_summary,"
                "created_at,updated_at,deleted_at,jurisdictions(name,slug)"
            )
            .execute()
        )
    except Exception as e:
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg or "23505" in msg:
            raise HTTPException(status_code=409, detail="Slug already exists") from e
        log.warning("admin_official_patch_failed: %s", e)
        raise HTTPException(status_code=400, detail="Update failed") from e

    if not res.data:
        raise HTTPException(status_code=404, detail="Official not found")
    after_model = OfficialAdminRow.model_validate(res.data[0])
    _audit(
        settings,
        user=user,
        action="official.update",
        target_id=official_id,
        before=before_model.model_dump(mode="json"),
        after=after_model.model_dump(mode="json"),
    )
    return after_model


@router.delete("/officials/{official_id}", response_model=OfficialAdminRow)
def soft_delete_official(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    official_id: str,
    settings: Settings = Depends(get_settings),
) -> OfficialAdminRow:
    client = _sb_client(settings)
    before_row = _fetch_official_row(client, official_id, include_deleted=False)
    before_model = OfficialAdminRow.model_validate(before_row)

    now = datetime.now(UTC).isoformat()
    res = (
        client.table("officials")
        .update({"deleted_at": now})
        .eq("id", official_id)
        .is_("deleted_at", "null")
        .select(
            "id,full_name,slug,jurisdiction_id,office_type,party,subject_alignment,"
            "term_start,term_end,retention_year,is_current,photo_url,bio_summary,"
            "created_at,updated_at,deleted_at,jurisdictions(name,slug)"
        )
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Official not found")
    after_model = OfficialAdminRow.model_validate(res.data[0])
    _audit(
        settings,
        user=user,
        action="official.soft_delete",
        target_id=official_id,
        before=before_model.model_dump(mode="json"),
        after=after_model.model_dump(mode="json"),
    )
    return after_model
