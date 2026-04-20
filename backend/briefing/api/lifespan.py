from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

logger = logging.getLogger(__name__)


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Open shared HTTP resources; close on shutdown."""
    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(60.0),
        follow_redirects=True,
        headers={
            "User-Agent": "SilentBriefing-API/1.0 httpx",
        },
    )
    logger.info("briefing.api lifespan: httpx AsyncClient ready")
    try:
        yield
    finally:
        await app.state.http_client.aclose()
        logger.info("briefing.api lifespan: httpx AsyncClient closed")
