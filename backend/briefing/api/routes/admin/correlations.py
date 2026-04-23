"""Admin BFF — proposed entity_edges review (accept / reject / escalate / batch-accept)."""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.audit.log import write_audit_via_service_role

log = logging.getLogger(__name__)

router = APIRouter(prefix="/correlations")


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
            target_type="entity_edge",
            target_id=target_id,
            before=before,
            after=after,
        )
    except Exception:
        log.exception("admin_audit_failed action=%s target=%s", action, target_id)
        raise HTTPException(status_code=500, detail="Audit log write failed") from None


class EntityRef(BaseModel):
    id: str
    canonical_name: str
    entity_type: str | None = None


class ProposedEdgeItem(BaseModel):
    id: str
    source_entity_id: str
    target_entity_id: str
    source: EntityRef
    target: EntityRef
    relation: str
    confidence: float | None
    weight: float | None
    provenance: dict[str, Any]
    status: str
    created_at: str
    updated_at: str


class ProposedQueueResponse(BaseModel):
    items: list[ProposedEdgeItem]
    total: int


class BatchAcceptBody(BaseModel):
    min_confidence: float = Field(ge=0.0, le=1.0)


class BatchAcceptResponse(BaseModel):
    updated: int


def _fetch_edge(client: Any, edge_id: str) -> dict[str, Any]:
    res = client.table("entity_edges").select("*").eq("id", edge_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Edge not found")
    return rows[0]


def _entity_map(client: Any, ids: set[str]) -> dict[str, dict[str, Any]]:
    if not ids:
        return {}
    res = client.table("entities").select("id,canonical_name,type").in_("id", list(ids)).execute()
    out: dict[str, dict[str, Any]] = {}
    for row in res.data or []:
        out[str(row["id"])] = row
    return out


def _row_to_item(row: dict[str, Any], emap: dict[str, dict[str, Any]]) -> ProposedEdgeItem:
    sid = str(row["source_entity_id"])
    tid = str(row["target_entity_id"])
    sr = emap.get(sid, {})
    tr = emap.get(tid, {})

    def _eref(eid: str, r: dict[str, Any]) -> EntityRef:
        return EntityRef(
            id=eid,
            canonical_name=str(r.get("canonical_name") or eid),
            entity_type=str(r["type"]) if r.get("type") is not None else None,
        )

    conf = row.get("confidence")
    w = row.get("weight")
    prov = row.get("provenance") if isinstance(row.get("provenance"), dict) else {}
    return ProposedEdgeItem(
        id=str(row["id"]),
        source_entity_id=sid,
        target_entity_id=tid,
        source=_eref(sid, sr),
        target=_eref(tid, tr),
        relation=str(row.get("relation") or ""),
        confidence=float(conf) if conf is not None else None,
        weight=float(w) if w is not None else None,
        provenance=prov,
        status=str(row.get("status") or ""),
        created_at=str(row.get("created_at") or ""),
        updated_at=str(row.get("updated_at") or ""),
    )


@router.get("/proposed", response_model=ProposedQueueResponse)
def list_proposed_edges(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    min_confidence: float | None = Query(None, ge=0.0, le=1.0),
    max_confidence: float | None = Query(None, ge=0.0, le=1.0),
    relation: str | None = Query(None, description="Exact relation label"),
    source_entity_id: str | None = Query(None),
    target_entity_id: str | None = Query(None),
) -> ProposedQueueResponse:
    _ = user
    client = _sb_client(settings)
    q = client.table("entity_edges").select("*", count="exact").eq("status", "proposed")
    if min_confidence is not None:
        q = q.gte("confidence", min_confidence)
    if max_confidence is not None:
        q = q.lte("confidence", max_confidence)
    if relation:
        q = q.eq("relation", relation)
    if source_entity_id:
        q = q.eq("source_entity_id", source_entity_id)
    if target_entity_id:
        q = q.eq("target_entity_id", target_entity_id)
    end = offset + limit - 1
    try:
        res = q.order("created_at", desc=True).range(offset, end).execute()
    except Exception as e:
        log.warning("correlations_proposed_failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid proposed-edges query") from e
    rows = res.data or []
    total = int(getattr(res, "count", None) or len(rows))
    ids: set[str] = set()
    for r in rows:
        ids.add(str(r["source_entity_id"]))
        ids.add(str(r["target_entity_id"]))
    emap = _entity_map(client, ids)
    items = [_row_to_item(r, emap) for r in rows]
    return ProposedQueueResponse(items=items, total=total)


@router.post("/batch-accept", response_model=BatchAcceptResponse)
def batch_accept_proposed(
    body: BatchAcceptBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> BatchAcceptResponse:
    client = _sb_client(settings)
    sel = (
        client.table("entity_edges")
        .select("id")
        .eq("status", "proposed")
        .gte("confidence", body.min_confidence)
    )
    res = sel.execute()
    id_rows = res.data or []
    ids = [str(r["id"]) for r in id_rows]
    if not ids:
        return BatchAcceptResponse(updated=0)
    upd = client.table("entity_edges").update({"status": "accepted"}).in_("id", ids).execute()
    updated = len(upd.data or ids)
    _audit(
        settings,
        user=user,
        action="correlation.batch_accept",
        target_id=None,
        before={"min_confidence": body.min_confidence, "count": len(ids)},
        after={"updated": updated, "edge_ids": ids[:200]},
    )
    return BatchAcceptResponse(updated=updated)


@router.post("/{edge_id}/accept")
def accept_edge(
    edge_id: str,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    client = _sb_client(settings)
    before = _fetch_edge(client, edge_id)
    if before.get("status") != "proposed":
        raise HTTPException(status_code=409, detail="Edge is not proposed")
    client.table("entity_edges").update({"status": "accepted"}).eq("id", edge_id).execute()
    _audit(
        settings,
        user=user,
        action="correlation.accept",
        target_id=edge_id,
        before={"status": before.get("status")},
        after={"status": "accepted"},
    )
    return {"id": edge_id, "status": "accepted"}


@router.post("/{edge_id}/reject")
def reject_edge(
    edge_id: str,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    client = _sb_client(settings)
    before = _fetch_edge(client, edge_id)
    if before.get("status") != "proposed":
        raise HTTPException(status_code=409, detail="Edge is not proposed")
    client.table("entity_edges").update({"status": "rejected"}).eq("id", edge_id).execute()
    _audit(
        settings,
        user=user,
        action="correlation.reject",
        target_id=edge_id,
        before={"status": before.get("status")},
        after={"status": "rejected"},
    )
    return {"id": edge_id, "status": "rejected"}


@router.post("/{edge_id}/escalate")
def escalate_edge(
    edge_id: str,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    client = _sb_client(settings)
    before = _fetch_edge(client, edge_id)
    if before.get("status") != "proposed":
        raise HTTPException(status_code=409, detail="Edge is not proposed")
    prov = before.get("provenance")
    if not isinstance(prov, dict):
        prov = {}
    else:
        prov = dict(prov)
    prov["escalated"] = True
    prov["escalated_by_clerk_sub"] = user.sub
    client.table("entity_edges").update({"provenance": prov}).eq("id", edge_id).execute()
    _audit(
        settings,
        user=user,
        action="correlation.escalate",
        target_id=edge_id,
        before={"provenance": before.get("provenance")},
        after={"provenance": prov},
    )
    return {"id": edge_id, "status": "proposed", "escalated": True}
