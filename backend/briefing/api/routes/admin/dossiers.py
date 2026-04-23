"""Admin BFF — dossier claim review queue, publish, reject."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role

log = logging.getLogger(__name__)

router = APIRouter(prefix="/dossiers")


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _audit_claim(
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
            target_type="dossier_claim",
            target_id=target_id,
            before=before,
            after=after,
        )
    except Exception:
        log.exception("admin_audit_failed action=%s target=%s", action, target_id)
        raise HTTPException(status_code=500, detail="Audit log write failed") from None


def _parse_critique_from_metadata(metadata: Any) -> dict[str, Any] | None:
    if not isinstance(metadata, dict):
        return None
    raw = metadata.get("critique_json")
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            out = json.loads(raw)
            return out if isinstance(out, dict) else None
        except json.JSONDecodeError:
            return None
    return None


class OfficialRef(BaseModel):
    id: str
    slug: str
    full_name: str


class QueueOfficialEmbed(BaseModel):
    full_name: str
    slug: str


class QueueClaimItem(BaseModel):
    id: str
    claim_text: str
    category: str
    official_id: str | None
    groundedness_score: float | None = None
    requires_human_review: bool
    pipeline_stage: str
    published: bool
    created_at: str
    critique: dict[str, Any] | None = None
    officials: QueueOfficialEmbed | None = None

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> QueueClaimItem:
        raw_g = row.get("groundedness_score")
        g: float | None
        if raw_g is None:
            g = None
        else:
            try:
                g = float(raw_g)
            except (TypeError, ValueError):
                g = None
        meta = row.get("metadata")
        crit = _parse_critique_from_metadata(meta)
        emb = row.get("officials")
        off: QueueOfficialEmbed | None = None
        if isinstance(emb, list) and emb:
            emb = emb[0]
        if isinstance(emb, dict):
            off = QueueOfficialEmbed.model_validate(emb)
        return cls(
            id=str(row["id"]),
            claim_text=str(row.get("claim_text") or ""),
            category=str(row.get("category") or ""),
            official_id=str(row["official_id"]) if row.get("official_id") else None,
            groundedness_score=g,
            requires_human_review=bool(row.get("requires_human_review")),
            pipeline_stage=str(row.get("pipeline_stage") or ""),
            published=bool(row.get("published")),
            created_at=str(row.get("created_at") or ""),
            critique=crit,
            officials=off,
        )


class QueueResponse(BaseModel):
    items: list[QueueClaimItem]
    total: int


class ClaimDetail(BaseModel):
    id: str
    claim_text: str
    category: str
    official_id: str | None
    source_url: str | None = None
    pipeline_stage: str
    published: bool
    requires_human_review: bool
    groundedness_score: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    review_note: str | None = None
    reviewed_at: str | None = None
    reviewed_by: str | None = None
    created_at: str
    updated_at: str
    critique: dict[str, Any] | None = None


class OfficialDossierResponse(BaseModel):
    official: OfficialRef
    claims: list[ClaimDetail]


class ClaimPatchBody(BaseModel):
    claim_text: str | None = Field(default=None, min_length=1)
    source_url: str | None = None
    published: bool | None = None
    requires_human_review: bool | None = None


class BulkPublishBody(BaseModel):
    claim_ids: list[str] = Field(min_length=1)


class RejectBody(BaseModel):
    review_note: str = Field(min_length=1)


def _claim_row_to_detail(row: dict[str, Any]) -> ClaimDetail:
    raw_g = row.get("groundedness_score")
    g: float | None
    if raw_g is None:
        g = None
    else:
        try:
            g = float(raw_g)
        except (TypeError, ValueError):
            g = None
    meta = row.get("metadata")
    md = meta if isinstance(meta, dict) else {}
    crit = _parse_critique_from_metadata(md)
    return ClaimDetail(
        id=str(row["id"]),
        claim_text=str(row.get("claim_text") or ""),
        category=str(row.get("category") or ""),
        official_id=str(row["official_id"]) if row.get("official_id") else None,
        source_url=row.get("source_url"),
        pipeline_stage=str(row.get("pipeline_stage") or ""),
        published=bool(row.get("published")),
        requires_human_review=bool(row.get("requires_human_review")),
        groundedness_score=g,
        metadata=md,
        review_note=row.get("review_note"),
        reviewed_at=str(row["reviewed_at"]) if row.get("reviewed_at") else None,
        reviewed_by=row.get("reviewed_by"),
        created_at=str(row.get("created_at") or ""),
        updated_at=str(row.get("updated_at") or ""),
        critique=crit,
    )


def _fetch_claim(client: Any, claim_id: str) -> dict[str, Any]:
    res = (
        client.table("dossier_claims")
        .select(
            "id,claim_text,category,official_id,source_url,pipeline_stage,published,"
            "requires_human_review,groundedness_score,metadata,review_note,reviewed_at,"
            "reviewed_by,created_at,updated_at"
        )
        .eq("id", claim_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Claim not found")
    return res.data[0]


@router.get("/queue", response_model=QueueResponse)
def dossier_queue(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    needs_review: bool = Query(True, description="Filter requires_human_review=true"),
    category: str | None = Query(None),
    max_groundedness: float | None = Query(
        None,
        ge=0.0,
        le=1.0,
        description="Include claims with score < this value (or null score)",
    ),
) -> QueueResponse:
    _ = user
    client = _sb_client(settings)
    sel = (
        "id,claim_text,category,official_id,groundedness_score,requires_human_review,"
        "pipeline_stage,published,created_at,metadata,officials(full_name,slug)"
    )
    q = client.table("dossier_claims").select(sel, count="exact")
    if needs_review:
        q = q.eq("requires_human_review", True)
    if category:
        q = q.eq("category", category)
    if max_groundedness is not None:
        q = q.or_(
            f"groundedness_score.lt.{max_groundedness},groundedness_score.is.null",
        )
    end = offset + limit - 1
    try:
        res = q.order("created_at", desc=True).range(offset, end).execute()
    except Exception as e:
        log.warning("dossier_queue_failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid queue query") from e
    rows = res.data or []
    total = int(getattr(res, "count", None) or len(rows))
    items = [QueueClaimItem.from_row(r) for r in rows]
    return QueueResponse(items=items, total=total)


@router.get("/official/{official_id}", response_model=OfficialDossierResponse)
def dossier_for_official(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    official_id: str,
    settings: Settings = Depends(get_settings),
) -> OfficialDossierResponse:
    _ = user
    client = _sb_client(settings)
    ores = (
        client.table("officials")
        .select("id,slug,full_name")
        .eq("id", official_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not ores.data:
        raise HTTPException(status_code=404, detail="Official not found")
    orow = ores.data[0]
    official = OfficialRef(
        id=str(orow["id"]),
        slug=str(orow["slug"]),
        full_name=str(orow["full_name"]),
    )
    cres = (
        client.table("dossier_claims")
        .select(
            "id,claim_text,category,official_id,source_url,pipeline_stage,published,"
            "requires_human_review,groundedness_score,metadata,review_note,reviewed_at,"
            "reviewed_by,created_at,updated_at"
        )
        .eq("official_id", official_id)
        .order("created_at", desc=True)
        .execute()
    )
    claims = [_claim_row_to_detail(r) for r in (cres.data or [])]
    return OfficialDossierResponse(official=official, claims=claims)


@router.patch("/claim/{claim_id}", response_model=ClaimDetail)
def patch_claim(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    claim_id: str,
    body: ClaimPatchBody,
    settings: Settings = Depends(get_settings),
) -> ClaimDetail:
    client = _sb_client(settings)
    before_row = _fetch_claim(client, claim_id)
    before = _claim_row_to_detail(before_row)
    patch: dict[str, Any] = body.model_dump(exclude_unset=True)
    if not patch:
        return before

    now = datetime.now(UTC)
    if patch.get("published") is True:
        patch["reviewed_at"] = now.isoformat()
        patch["reviewed_by"] = user.sub
        patch["requires_human_review"] = False
    elif patch.get("published") is False:
        patch["reviewed_at"] = None
        patch["reviewed_by"] = None

    try:
        res = (
            client.table("dossier_claims")
            .update(patch)
            .eq("id", claim_id)
            .select(
                "id,claim_text,category,official_id,source_url,pipeline_stage,published,"
                "requires_human_review,groundedness_score,metadata,review_note,reviewed_at,"
                "reviewed_by,created_at,updated_at"
            )
            .execute()
        )
    except Exception as e:
        log.warning("patch_claim_failed: %s", e)
        raise HTTPException(status_code=400, detail="Update failed") from e
    if not res.data:
        raise HTTPException(status_code=404, detail="Claim not found")
    after = _claim_row_to_detail(res.data[0])
    _audit_claim(
        settings,
        user=user,
        action="dossier_claim.update",
        target_id=claim_id,
        before=before.model_dump(mode="json"),
        after=after.model_dump(mode="json"),
    )
    return after


@router.post("/publish", response_model=list[ClaimDetail])
def bulk_publish(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    body: BulkPublishBody,
    settings: Settings = Depends(get_settings),
) -> list[ClaimDetail]:
    client = _sb_client(settings)
    now = datetime.now(UTC).isoformat()
    out: list[ClaimDetail] = []
    for cid in body.claim_ids:
        before_row = _fetch_claim(client, cid)
        before = _claim_row_to_detail(before_row)
        patch = {
            "published": True,
            "reviewed_at": now,
            "reviewed_by": user.sub,
            "requires_human_review": False,
        }
        res = (
            client.table("dossier_claims")
            .update(patch)
            .eq("id", cid)
            .select(
                "id,claim_text,category,official_id,source_url,pipeline_stage,published,"
                "requires_human_review,groundedness_score,metadata,review_note,reviewed_at,"
                "reviewed_by,created_at,updated_at"
            )
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Claim not found: {cid}")
        after = _claim_row_to_detail(res.data[0])
        _audit_claim(
            settings,
            user=user,
            action="dossier_claim.publish",
            target_id=cid,
            before=before.model_dump(mode="json"),
            after=after.model_dump(mode="json"),
        )
        out.append(after)
    return out


@router.post("/claim/{claim_id}/reject", response_model=ClaimDetail)
def reject_claim(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    claim_id: str,
    body: RejectBody,
    settings: Settings = Depends(get_settings),
) -> ClaimDetail:
    client = _sb_client(settings)
    before_row = _fetch_claim(client, claim_id)
    before = _claim_row_to_detail(before_row)
    now = datetime.now(UTC).isoformat()
    patch = {
        "published": False,
        "review_note": body.review_note.strip(),
        "reviewed_at": now,
        "reviewed_by": user.sub,
        "requires_human_review": False,
    }
    res = (
        client.table("dossier_claims")
        .update(patch)
        .eq("id", claim_id)
        .select(
            "id,claim_text,category,official_id,source_url,pipeline_stage,published,"
            "requires_human_review,groundedness_score,metadata,review_note,reviewed_at,"
            "reviewed_by,created_at,updated_at"
        )
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Claim not found")
    after = _claim_row_to_detail(res.data[0])
    _audit_claim(
        settings,
        user=user,
        action="dossier_claim.reject",
        target_id=claim_id,
        before=before.model_dump(mode="json"),
        after=after.model_dump(mode="json"),
    )
    return after
