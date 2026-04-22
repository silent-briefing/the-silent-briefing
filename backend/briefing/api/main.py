from __future__ import annotations

import importlib.metadata
import uuid

from fastapi import FastAPI, Request

from briefing.api.lifespan import app_lifespan
from briefing.api.routes.admin import router as admin_router
from briefing.api.routes.console import router as console_router
from briefing.api.routes.extraction import router as extraction_router
from briefing.api.routes.feeds import router as feeds_router
from briefing.api.routes.intelligence import router as intelligence_router
from briefing.api.routes.search import router as search_router


def _package_version() -> str:
    try:
        return importlib.metadata.version("backend")
    except importlib.metadata.PackageNotFoundError:
        return "0.1.0"


app = FastAPI(title="Silent Briefing API", lifespan=app_lifespan)
app.include_router(intelligence_router)
app.include_router(extraction_router)
app.include_router(console_router)
app.include_router(feeds_router)
app.include_router(search_router)
app.include_router(admin_router)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    raw = request.headers.get("X-Request-ID")
    rid = raw.strip() if raw and raw.strip() else str(uuid.uuid4())
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/version")
def version() -> dict[str, str]:
    return {
        "service": "silent-briefing-api",
        "version": _package_version(),
    }
