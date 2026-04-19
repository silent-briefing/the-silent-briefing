from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from briefing.config import Settings, get_settings

router = APIRouter(prefix="/v1/intelligence", tags=["intelligence"])


class RefreshRequest(BaseModel):
    official_id: str
    trigger: str = "manual"


@router.post("/refresh", status_code=202)
async def trigger_dossier_refresh(
    req: RefreshRequest,
    x_service_key: str = Header(default=""),
    settings: Settings = Depends(get_settings),
) -> dict[str, object]:
    if settings.backend_service_key and x_service_key != settings.backend_service_key:
        raise HTTPException(status_code=401, detail="Invalid service key")
    # TODO: enqueue ARQ job for LLM refresh
    return {"job_id": None, "official_id": req.official_id, "status": "queued"}
