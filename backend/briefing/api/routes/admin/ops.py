"""Admin BFF — engine ops dashboard aggregates (read-only, service_role)."""

from __future__ import annotations

import logging
import os
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from subprocess import CompletedProcess, TimeoutExpired, run as subprocess_run
from typing import Annotated, Any
from urllib.parse import urlparse, urlunparse

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from briefing.api.deps_auth import ClerkUser, require_role
from briefing.config import Settings, get_settings
from briefing.services.intelligence.routing import is_retrieval_stale

log = logging.getLogger(__name__)

router = APIRouter(prefix="/ops")


def _sb_client(settings: Settings) -> Any:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail="Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
        )
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _backend_root() -> str:
    return str(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")))  # backend/


def _package_version() -> str:
    try:
        import importlib.metadata

        return importlib.metadata.version("backend")
    except importlib.metadata.PackageNotFoundError:
        return "0.1.0"


def _studio_href(supabase_url: str) -> str | None:
    u = urlparse(supabase_url)
    host = u.hostname or ""
    if host in ("127.0.0.1", "localhost") and (u.port == 54321 or u.port is None):
        port = 54323
        return urlunparse(("http", f"{host}:{port}", "/", "", "", ""))
    if "supabase.co" in host:
        return "https://supabase.com/dashboard"
    return None


def _sentry_issues_href() -> str | None:
    base = os.environ.get("SENTRY_ISSUES_URL", "").strip()
    if base:
        return base
    org = os.environ.get("SENTRY_ORG_SLUG", "").strip()
    proj = os.environ.get("SENTRY_PROJECT_SLUG", "").strip()
    if org and proj:
        return f"https://sentry.io/organizations/{org}/issues/?project={proj}"
    return None


def _probe_worker_cli() -> dict[str, Any]:
    cmd = ["uv", "run", "python", "-m", "briefing.worker", "--help"]
    try:
        proc: CompletedProcess[str] = subprocess_run(
            cmd,
            cwd=_backend_root(),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
            check=False,
            timeout=20.0,
        )
        ok = proc.returncode == 0
        tail = (proc.stderr or proc.stdout or "")[-500:]
        return {"ok": ok, "exit_code": proc.returncode, "detail": tail.strip() or None}
    except OSError as e:
        return {"ok": False, "exit_code": -1, "detail": str(e)}
    except TimeoutExpired:
        return {"ok": False, "exit_code": -1, "detail": "timeout"}


def _parse_ts(raw: Any) -> datetime | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=UTC)
    if isinstance(raw, str):
        s = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
    return None


def _distinct_official_ids_from_claims(client: Any, *, page: int, cap_rows: int) -> tuple[set[str], bool]:
    out: set[str] = set()
    offset = 0
    truncated = False
    while True:
        res = (
            client.table("dossier_claims")
            .select("official_id")
            .not_.is_("official_id", "null")
            .range(offset, offset + page - 1)
            .execute()
        )
        rows = res.data or []
        for r in rows:
            oid = r.get("official_id")
            if oid:
                out.add(str(oid))
        if len(rows) < page:
            break
        offset += page
        if offset >= cap_rows:
            truncated = True
            break
    return out, truncated


class ExtractionSourceStat(BaseModel):
    source_type: str
    last_fetched_at: str | None
    sample_chunks: int


class FailedRunItem(BaseModel):
    id: str
    pipeline_stage: str
    status: str
    error_message: str | None
    created_at: str | None


class RunBrief(BaseModel):
    id: str
    pipeline_stage: str
    status: str
    model_id: str | None
    created_at: str | None
    tokens_input: int | None = None
    tokens_output: int | None = None


class StageLatency(BaseModel):
    pipeline_stage: str
    avg_duration_seconds: float | None
    sample_count: int


class DataQuality(BaseModel):
    dossier_claims_without_official: int
    current_officials_total: int
    distinct_officials_with_claims: int
    claims_scan_truncated: bool
    stale_officials_in_sample: int
    stale_officials_sample_size: int
    retrieval_stale_days: int


class Perplexity24hTokens(BaseModel):
    tokens_input: int
    tokens_output: int
    tokens_total: int
    truncated_sample: bool


class OpsSummaryResponse(BaseModel):
    api_status: str = "ok"
    api_version: str
    worker_cli: dict[str, Any]
    links: dict[str, str | None]
    perplexity_last_24h: Perplexity24hTokens
    extraction_by_source: list[ExtractionSourceStat]
    recent_failed_runs: list[FailedRunItem]
    runs_by_stage: dict[str, list[RunBrief]]
    stage_latency: list[StageLatency]
    data_quality: DataQuality


def _rag_extraction_stats(client: Any) -> list[ExtractionSourceStat]:
    res = (
        client.table("rag_chunks")
        .select("source_type,fetched_at")
        .order("fetched_at", desc=True)
        .limit(4000)
        .execute()
    )
    rows = res.data or []
    by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        st = str(r.get("source_type") or "unknown")
        by_type[st].append(r)
    out: list[ExtractionSourceStat] = []
    for st in sorted(by_type.keys()):
        xs = by_type[st]
        times = [_parse_ts(x.get("fetched_at")) for x in xs]
        times = [t for t in times if t is not None]
        last = max(times).isoformat() if times else None
        out.append(ExtractionSourceStat(source_type=st, last_fetched_at=last, sample_chunks=len(xs)))
    return out


def _recent_failures(client: Any, *, limit: int = 15) -> list[FailedRunItem]:
    res = (
        client.table("intelligence_runs")
        .select("id,pipeline_stage,status,error_message,created_at")
        .eq("status", "failed")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    items: list[FailedRunItem] = []
    for r in res.data or []:
        items.append(
            FailedRunItem(
                id=str(r["id"]),
                pipeline_stage=str(r.get("pipeline_stage") or ""),
                status=str(r.get("status") or ""),
                error_message=r.get("error_message"),
                created_at=r.get("created_at"),
            )
        )
    return items


def _runs_by_stage_recent(client: Any, *, per_stage: int = 10) -> dict[str, list[RunBrief]]:
    res = (
        client.table("intelligence_runs")
        .select("id,pipeline_stage,status,model_id,created_at,tokens_input,tokens_output")
        .order("created_at", desc=True)
        .limit(400)
        .execute()
    )
    stage_buckets: dict[str, list[RunBrief]] = defaultdict(list)
    for r in res.data or []:
        st = str(r.get("pipeline_stage") or "unknown")
        if len(stage_buckets[st]) >= per_stage:
            continue
        stage_buckets[st].append(
            RunBrief(
                id=str(r["id"]),
                pipeline_stage=st,
                status=str(r.get("status") or ""),
                model_id=r.get("model_id"),
                created_at=r.get("created_at"),
                tokens_input=r.get("tokens_input"),
                tokens_output=r.get("tokens_output"),
            )
        )
    return dict(sorted(stage_buckets.items(), key=lambda kv: kv[0]))


def _stage_latency(client: Any, *, since: datetime) -> list[StageLatency]:
    res = (
        client.table("intelligence_runs")
        .select("pipeline_stage,created_at,updated_at,status")
        .eq("status", "succeeded")
        .gte("created_at", since.isoformat())
        .limit(2500)
        .execute()
    )
    sums: dict[str, list[float]] = defaultdict(list)
    for r in res.data or []:
        st = str(r.get("pipeline_stage") or "unknown")
        c = _parse_ts(r.get("created_at"))
        u = _parse_ts(r.get("updated_at"))
        if c and u and u >= c:
            sums[st].append((u - c).total_seconds())
    out: list[StageLatency] = []
    for st in sorted(sums.keys()):
        xs = sums[st]
        avg = sum(xs) / len(xs) if xs else None
        out.append(StageLatency(pipeline_stage=st, avg_duration_seconds=avg, sample_count=len(xs)))
    return out


def _perplexity_24h_tokens(client: Any) -> dict[str, int | None]:
    since = (datetime.now(UTC) - timedelta(hours=24)).isoformat()
    res = (
        client.table("intelligence_runs")
        .select("tokens_input,tokens_output")
        .gte("created_at", since)
        .limit(5000)
        .execute()
    )
    tin = tout = 0
    truncated = False
    rows = res.data or []
    if len(rows) >= 5000:
        truncated = True
    for r in rows:
        if r.get("tokens_input") is not None:
            tin += int(r["tokens_input"])
        if r.get("tokens_output") is not None:
            tout += int(r["tokens_output"])
    return {
        "tokens_input": tin,
        "tokens_output": tout,
        "tokens_total": tin + tout,
        "truncated_sample": int(truncated),
    }


def _null_official_claims_count(client: Any) -> int:
    res = (
        client.table("dossier_claims")
        .select("id", count="exact")
        .is_("official_id", "null")
        .limit(1)
        .execute()
    )
    return int(getattr(res, "count", None) or 0)


def _current_officials_count(client: Any) -> int:
    res = (
        client.table("officials")
        .select("id", count="exact")
        .is_("deleted_at", "null")
        .eq("is_current", True)
        .limit(1)
        .execute()
    )
    return int(getattr(res, "count", None) or 0)


def _stale_sample(client: Any, settings: Settings, *, sample: int) -> tuple[int, int]:
    res = (
        client.table("officials")
        .select("id")
        .is_("deleted_at", "null")
        .eq("is_current", True)
        .limit(sample)
        .execute()
    )
    rows = res.data or []
    stale = sum(1 for r in rows if is_retrieval_stale(client, str(r["id"]), settings))
    return stale, len(rows)


@router.get("/summary", response_model=OpsSummaryResponse)
def ops_summary(
    _user: Annotated[ClerkUser, Depends(require_role("admin"))],
    settings: Settings = Depends(get_settings),
) -> OpsSummaryResponse:
    client = _sb_client(settings)
    since_week = datetime.now(UTC) - timedelta(days=7)

    with_claim_ids, claims_trunc = _distinct_official_ids_from_claims(client, page=1000, cap_rows=40_000)
    stale_n, stale_denom = _stale_sample(client, settings, sample=200)

    return OpsSummaryResponse(
        api_status="ok",
        api_version=_package_version(),
        worker_cli=_probe_worker_cli(),
        links={
            "supabase_studio": _studio_href(settings.supabase_url),
            "sentry_issues": _sentry_issues_href(),
        },
        perplexity_last_24h=_perplexity_24h_tokens(client),
        extraction_by_source=_rag_extraction_stats(client),
        recent_failed_runs=_recent_failures(client),
        runs_by_stage=_runs_by_stage_recent(client),
        stage_latency=_stage_latency(client, since=since_week),
        data_quality=DataQuality(
            dossier_claims_without_official=_null_official_claims_count(client),
            current_officials_total=_current_officials_count(client),
            distinct_officials_with_claims=len(with_claim_ids),
            claims_scan_truncated=claims_trunc,
            stale_officials_in_sample=stale_n,
            stale_officials_sample_size=stale_denom,
            retrieval_stale_days=settings.retrieval_stale_days,
        ),
    )
