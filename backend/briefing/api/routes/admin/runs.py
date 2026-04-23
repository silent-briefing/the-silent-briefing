"""Admin BFF — intelligence_runs list, detail, catalog, manual worker trigger."""

from __future__ import annotations

import logging
import os
import threading
import uuid
from pathlib import Path
from subprocess import CompletedProcess, run as subprocess_run
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.admin_worker_trigger import (
    IN_FLIGHT_STATUSES,
    build_worker_argv,
    get_trigger_catalog,
    get_trigger_job,
)
from briefing.services.audit.log import write_audit_via_service_role

log = logging.getLogger(__name__)

router = APIRouter(prefix="/runs")


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _clip(s: str, max_len: int = 200_000) -> str:
    if len(s) <= max_len:
        return s
    return s[:max_len] + "\n… (truncated)"


def _finalize_run(
    settings: Settings,
    *,
    run_id: str,
    proc: CompletedProcess[str],
) -> None:
    try:
        client = _sb_client(settings)
    except HTTPException:
        log.exception("finalize_run no supabase run_id=%s", run_id)
        return
    exit_code = proc.returncode
    stdout = proc.stdout or ""
    stderr = proc.stderr or ""
    status = "succeeded" if exit_code == 0 else "failed"
    raw: dict[str, Any] = {
        "exit_code": exit_code,
        "stdout": _clip(stdout),
        "stderr": _clip(stderr),
    }
    err_msg = None
    if exit_code != 0:
        err_msg = (stderr.strip() or stdout.strip() or f"exit {exit_code}")[:4000]
    client.table("intelligence_runs").update(
        {"status": status, "raw_response": raw, "error_message": err_msg}
    ).eq("id", run_id).execute()


def _run_worker_job(settings: Settings, run_id: str, argv: list[str]) -> None:
    backend_root = _backend_root()
    cmd = ["uv", "run", "python", "-m", "briefing.worker", *argv]
    try:
        proc = subprocess_run(
            cmd,
            cwd=str(backend_root),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
            check=False,
        )
    except OSError as e:
        proc = CompletedProcess(args=cmd, returncode=-1, stdout="", stderr=str(e))
    _finalize_run(settings, run_id=run_id, proc=proc)


class TriggerIntelRunBody(BaseModel):
    job: str = Field(..., min_length=1)
    idempotency_key: str | None = None
    official_id: str | None = None
    subject: str | None = None
    correlation_text: str | None = None
    correlation_context: str | None = None
    stages: str | None = None
    rag_context: str | None = None
    use_routing: bool = False
    skip_if_fresh: bool = False
    correlate: bool = False
    rag_query: str | None = None
    rag_match_count: int | None = None
    min_confidence: float | None = None
    retention_slugs: str | None = None
    opinion_limit: int | None = None
    opinion_id: str | None = None
    no_embed: bool = False
    no_correlate: bool = False


def _payload_dict(body: TriggerIntelRunBody) -> dict[str, Any]:
    return body.model_dump(exclude_none=True)


def _validate_against_catalog(meta: Any, body: TriggerIntelRunBody) -> None:
    if meta.requires_official_id and not (body.official_id or "").strip():
        raise HTTPException(status_code=422, detail="official_id is required for this job")
    if meta.requires_subject and not (body.subject or "").strip():
        raise HTTPException(status_code=422, detail="subject is required for this job")
    if meta.requires_correlation_text and not (body.correlation_text or "").strip():
        raise HTTPException(status_code=422, detail="correlation_text is required for this job")


@router.get("/catalog")
def get_run_catalog(
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
) -> dict[str, Any]:
    return {"jobs": get_trigger_catalog()}


@router.get("")
def list_intel_runs(
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Annotated[Settings, Depends(get_settings)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    client = _sb_client(settings)
    end = offset + limit - 1
    res = (
        client.table("intelligence_runs")
        .select("*", count="exact")
        .order("created_at", desc=True)
        .range(offset, end)
        .execute()
    )
    rows = res.data or []
    total = getattr(res, "count", None)
    if total is None:
        total = len(rows)
    return {"items": rows, "total": total, "limit": limit, "offset": offset}


@router.post("/trigger")
def trigger_intel_run(
    body: TriggerIntelRunBody,
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    meta = get_trigger_job(body.job.strip())
    if meta is None:
        raise HTTPException(status_code=422, detail=f"invalid job: {body.job!r}")

    _validate_against_catalog(meta, body)

    raw_key = (body.idempotency_key or "").strip()
    idem_key = raw_key if raw_key else str(uuid.uuid4())

    client = _sb_client(settings)
    existing = (
        client.table("intelligence_runs")
        .select("id, status")
        .eq("idempotency_key", idem_key)
        .limit(1)
        .execute()
    )
    ex_rows = existing.data or []
    if ex_rows:
        row = ex_rows[0]
        st = row.get("status") or ""
        raise HTTPException(
            status_code=409,
            detail={
                "existing_run_id": row["id"],
                "status": st,
                "in_flight": st in IN_FLIGHT_STATUSES,
            },
        )

    payload = _payload_dict(body)
    try:
        argv = build_worker_argv(job_id=meta.job_id, payload=payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    insert_row: dict[str, Any] = {
        "pipeline_stage": body.job.strip(),
        "status": "running",
        "official_id": body.official_id.strip() if body.official_id else None,
        "idempotency_key": idem_key,
        "metadata": {
            "admin_trigger": True,
            "argv": argv,
            "request": payload,
        },
        "model_id": "admin_trigger",
    }
    ins = client.table("intelligence_runs").insert(insert_row).execute()
    ins_rows = ins.data or []
    if not ins_rows:
        raise HTTPException(status_code=500, detail="insert failed")
    run_id = ins_rows[0]["id"]

    try:
        write_audit_via_service_role(
            settings,
            actor_user_id=user.sub,
            actor_role=user.role or "unknown",
            org_id=user.org_id,
            action="intel_run.trigger",
            target_type="intelligence_run",
            target_id=str(run_id),
            before=None,
            after={"job": body.job, "official_id": body.official_id, "idempotency_key": idem_key},
        )
    except Exception:
        log.exception("admin_audit_failed intel_run.trigger run_id=%s", run_id)

    threading.Thread(
        target=_run_worker_job,
        args=(settings, str(run_id), argv),
        daemon=True,
    ).start()

    return {"run_id": str(run_id), "status": "running", "idempotency_key": idem_key}


@router.get("/{run_id}")
def get_intel_run(
    run_id: str,
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    client = _sb_client(settings)
    res = client.table("intelligence_runs").select("*").eq("id", run_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="run not found")
    return {"run": rows[0]}
