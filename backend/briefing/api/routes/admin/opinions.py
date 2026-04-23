"""Admin BFF — uploaded opinion PDFs, chunks, and accepted entity edges."""

from __future__ import annotations

import logging
import re
import threading
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.api.routes.admin.runs import _run_worker_job, _sb_client
from briefing.config import Settings, get_settings
from briefing.services.admin_worker_trigger import build_worker_argv
from briefing.services.audit.log import write_audit_via_service_role
from briefing.services.extraction.opinions import briefing_opinion_source_url

log = logging.getLogger(__name__)

router = APIRouter(prefix="/opinions")

_MAX_PDF_BYTES = 50 * 1024 * 1024


def _slugify(title: str) -> str:
    raw = re.sub(r"[^a-z0-9]+", "-", title.strip().lower()).strip("-")
    base = raw[:72] if raw else "opinion"
    return f"{base}-{uuid.uuid4().hex[:8]}"


def _enqueue_opinion_ingestion(settings: Settings, user: ClerkUser, opinion_id: str) -> str:
    payload: dict[str, Any] = {"opinion_id": opinion_id}
    argv = build_worker_argv(job_id="opinion-ingestion", payload=payload)
    client = _sb_client(settings)
    idem_key = str(uuid.uuid4())
    insert_row: dict[str, Any] = {
        "pipeline_stage": "opinion-ingestion",
        "status": "running",
        "official_id": None,
        "idempotency_key": idem_key,
        "metadata": {
            "admin_trigger": True,
            "argv": argv,
            "request": payload,
            "opinion_id": opinion_id,
        },
        "model_id": "admin_trigger",
    }
    ins = client.table("intelligence_runs").insert(insert_row).execute()
    ins_rows = ins.data or []
    if not ins_rows:
        raise HTTPException(status_code=500, detail="intelligence_runs insert failed")
    run_id = str(ins_rows[0]["id"])
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="opinion.ingestion_enqueued",
            target_type="opinion",
            target_id=opinion_id,
            before=None,
            after={"run_id": run_id, "argv": argv},
        )
    except Exception:
        log.exception("admin_audit_failed opinion.ingestion_enqueued")
    threading.Thread(
        target=_run_worker_job,
        args=(settings, run_id, argv),
        daemon=True,
    ).start()
    return run_id


class OpinionRow(BaseModel):
    id: str
    slug: str
    title: str
    court: str | None
    published: bool
    pdf_storage_path: str | None
    ingestion_status: str
    entity_id: str | None
    metadata: dict[str, Any]
    created_at: str | None
    updated_at: str | None


class OpinionListResponse(BaseModel):
    items: list[OpinionRow]
    total: int


class RagChunkItem(BaseModel):
    id: str
    chunk_index: int
    content: str
    metadata: dict[str, Any]
    created_at: str | None


class OpinionDetailResponse(BaseModel):
    opinion: OpinionRow
    chunks: list[RagChunkItem]


class OpinionPatchBody(BaseModel):
    title: str | None = None
    published: bool | None = None
    court: str | None = None
    metadata: dict[str, Any] | None = None


class OpinionLinkBody(BaseModel):
    target_entity_id: str = Field(..., min_length=32)
    relation: str = Field(default="related_to", min_length=1)


@router.get("", response_model=OpinionListResponse)
def list_opinions(
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    limit: int = 50,
    offset: int = 0,
) -> OpinionListResponse:
    client = _sb_client(settings)
    end = offset + max(1, min(limit, 200)) - 1
    res = (
        client.table("opinions")
        .select(
            "id,slug,title,court,published,pdf_storage_path,ingestion_status,entity_id,metadata,created_at,updated_at",
            count="exact",
        )
        .order("created_at", desc=True)
        .range(offset, end)
        .execute()
    )
    rows = res.data or []
    total = int(getattr(res, "count", None) or len(rows))
    items = [
        OpinionRow(
            id=str(r["id"]),
            slug=str(r["slug"]),
            title=str(r["title"]),
            court=r.get("court"),
            published=bool(r.get("published")),
            pdf_storage_path=r.get("pdf_storage_path"),
            ingestion_status=str(r.get("ingestion_status") or "pending"),
            entity_id=str(r["entity_id"]) if r.get("entity_id") else None,
            metadata=r.get("metadata") if isinstance(r.get("metadata"), dict) else {},
            created_at=r.get("created_at"),
            updated_at=r.get("updated_at"),
        )
        for r in rows
    ]
    return OpinionListResponse(items=items, total=total)


@router.post("")
async def create_opinion_with_pdf(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
    title: str = Form(..., min_length=2),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="PDF file required")
    data = await file.read()
    if len(data) > _MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF too large (max 50MB)")
    client = _sb_client(settings)
    slug = _slugify(title)
    ent_ins = (
        client.table("entities")
        .insert(
            {
                "type": "issue",
                "canonical_name": title.strip(),
                "metadata": {"kind": "judicial_opinion", "slug": slug},
            }
        )
        .execute()
    )
    ent_rows = ent_ins.data or []
    if not ent_rows:
        raise HTTPException(status_code=500, detail="entity insert failed")
    entity_id = str(ent_rows[0]["id"])
    op_id = str(uuid.uuid4())
    op_ins = (
        client.table("opinions")
        .insert(
            {
                "id": op_id,
                "slug": slug,
                "title": title.strip(),
                "court": "ut_supreme",
                "published": False,
                "entity_id": entity_id,
                "ingestion_status": "pending",
                "metadata": {},
            }
        )
        .execute()
    )
    if not op_ins.data:
        raise HTTPException(status_code=500, detail="opinion insert failed")
    path = f"{op_id}/source.pdf"
    try:
        client.storage.from_("opinions-pdf").upload(
            path,
            data,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"storage upload failed: {e}") from e
    client.table("opinions").update({"pdf_storage_path": path}).eq("id", op_id).execute()
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="opinion.create",
            target_type="opinion",
            target_id=op_id,
            before=None,
            after={"title": title.strip(), "slug": slug, "path": path},
        )
    except Exception:
        log.exception("admin_audit_failed opinion.create")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    run_id = _enqueue_opinion_ingestion(settings, user, op_id)
    return {"id": op_id, "slug": slug, "run_id": run_id}


@router.get("/{opinion_id}", response_model=OpinionDetailResponse)
def get_opinion_detail(
    opinion_id: str,
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> OpinionDetailResponse:
    client = _sb_client(settings)
    res = (
        client.table("opinions")
        .select(
            "id,slug,title,court,published,pdf_storage_path,ingestion_status,entity_id,metadata,created_at,updated_at",
        )
        .eq("id", opinion_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="opinion not found")
    r = rows[0]
    opinion = OpinionRow(
        id=str(r["id"]),
        slug=str(r["slug"]),
        title=str(r["title"]),
        court=r.get("court"),
        published=bool(r.get("published")),
        pdf_storage_path=r.get("pdf_storage_path"),
        ingestion_status=str(r.get("ingestion_status") or "pending"),
        entity_id=str(r["entity_id"]) if r.get("entity_id") else None,
        metadata=r.get("metadata") if isinstance(r.get("metadata"), dict) else {},
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )
    src = briefing_opinion_source_url(opinion_id)
    ch_res = (
        client.table("rag_chunks")
        .select("id,chunk_index,content,metadata,created_at")
        .eq("source_url", src)
        .order("chunk_index")
        .execute()
    )
    chunks = [
        RagChunkItem(
            id=str(c["id"]),
            chunk_index=int(c.get("chunk_index") or 0),
            content=str(c.get("content") or ""),
            metadata=c.get("metadata") if isinstance(c.get("metadata"), dict) else {},
            created_at=c.get("created_at"),
        )
        for c in (ch_res.data or [])
    ]
    return OpinionDetailResponse(opinion=opinion, chunks=chunks)


@router.patch("/{opinion_id}", response_model=OpinionRow)
def patch_opinion(
    opinion_id: str,
    body: OpinionPatchBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> OpinionRow:
    client = _sb_client(settings)
    res = client.table("opinions").select("*").eq("id", opinion_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="opinion not found")
    before = rows[0]
    patch: dict[str, Any] = {}
    if body.title is not None:
        t = body.title.strip()
        if len(t) < 2:
            raise HTTPException(status_code=422, detail="title too short")
        patch["title"] = t
    if body.published is not None:
        patch["published"] = body.published
    if body.court is not None:
        patch["court"] = body.court.strip() or None
    if body.metadata is not None:
        merged = dict(before.get("metadata") or {}) if isinstance(before.get("metadata"), dict) else {}
        merged.update(body.metadata)
        patch["metadata"] = merged
    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")
    up = client.table("opinions").update(patch).eq("id", opinion_id).execute()
    out = (up.data or [before])[0]
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="opinion.patch",
            target_type="opinion",
            target_id=opinion_id,
            before={"row": before},
            after={"patch": patch},
        )
    except Exception:
        log.exception("admin_audit_failed opinion.patch")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return OpinionRow(
        id=str(out["id"]),
        slug=str(out["slug"]),
        title=str(out["title"]),
        court=out.get("court"),
        published=bool(out.get("published")),
        pdf_storage_path=out.get("pdf_storage_path"),
        ingestion_status=str(out.get("ingestion_status") or "pending"),
        entity_id=str(out["entity_id"]) if out.get("entity_id") else None,
        metadata=out.get("metadata") if isinstance(out.get("metadata"), dict) else {},
        created_at=out.get("created_at"),
        updated_at=out.get("updated_at"),
    )


@router.post("/{opinion_id}/edges", response_model=dict[str, str])
def create_accepted_edge_from_opinion(
    opinion_id: str,
    body: OpinionLinkBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    client = _sb_client(settings)
    res = client.table("opinions").select("entity_id").eq("id", opinion_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="opinion not found")
    src_e = rows[0].get("entity_id")
    if not src_e:
        raise HTTPException(status_code=422, detail="opinion has no entity_id")
    tgt = body.target_entity_id.strip()
    for eid in (str(src_e), tgt):
        er = client.table("entities").select("id").eq("id", eid).limit(1).execute()
        if not (er.data or []):
            raise HTTPException(status_code=422, detail=f"entity not found: {eid}")
    if str(src_e) == tgt:
        raise HTTPException(status_code=422, detail="source and target must differ")
    ins = (
        client.table("entity_edges")
        .insert(
            {
                "source_entity_id": str(src_e),
                "target_entity_id": tgt,
                "relation": body.relation.strip(),
                "status": "accepted",
                "confidence": 1.0,
                "provenance": {"source": "admin_opinion_link", "opinion_id": opinion_id},
            }
        )
        .execute()
    )
    ins_rows = ins.data or []
    if not ins_rows:
        raise HTTPException(status_code=500, detail="edge insert failed")
    edge_id = str(ins_rows[0]["id"])
    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="opinion.entity_edge_accepted",
            target_type="entity_edge",
            target_id=edge_id,
            before=None,
            after={
                "opinion_id": opinion_id,
                "source_entity_id": str(src_e),
                "target_entity_id": tgt,
                "relation": body.relation.strip(),
            },
        )
    except Exception:
        log.exception("admin_audit_failed opinion.entity_edge_accepted")
        raise HTTPException(status_code=500, detail="Audit log write failed") from None
    return {"edge_id": edge_id}
