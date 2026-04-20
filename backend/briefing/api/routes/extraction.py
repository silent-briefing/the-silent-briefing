from __future__ import annotations

import logging
import traceback
from typing import Literal, cast

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from briefing.config import Settings, get_settings
from briefing.services.baseline.runner import SourceName, run_baseline_extraction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/extraction", tags=["extraction"])


class BaselineSyncRequest(BaseModel):
    sources: list[Literal["vote_utah", "slco", "civic"]] | None = Field(
        default=None,
        description="Subset of sources; default both (SLCO skips unless enabled in settings).",
    )
    dry_run: bool = False


def _run_baseline_sync(settings: Settings, sources: list[SourceName] | None, dry_run: bool) -> None:
    try:
        candidates, n = run_baseline_extraction(
            persist=not dry_run,
            dry_run=dry_run,
            sources=sources,
            settings=settings,
        )
        logger.info(
            "baseline-sync finished: candidates=%s persisted=%s dry_run=%s",
            len(candidates),
            n,
            dry_run,
        )
    except Exception:
        logger.error("baseline-sync failed:\n%s", traceback.format_exc())


@router.post("/baseline-sync", status_code=202)
async def baseline_sync(
    req: BaselineSyncRequest,
    background_tasks: BackgroundTasks,
    x_service_key: str = Header(default=""),
    settings: Settings = Depends(get_settings),
) -> dict[str, object]:
    if settings.backend_service_key and x_service_key != settings.backend_service_key:
        raise HTTPException(status_code=401, detail="Invalid service key")
    sources = cast(list[SourceName] | None, req.sources)
    background_tasks.add_task(_run_baseline_sync, settings, sources, req.dry_run)
    return {"status": "accepted", "dry_run": req.dry_run}
