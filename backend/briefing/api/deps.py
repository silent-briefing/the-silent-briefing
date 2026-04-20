from __future__ import annotations

import httpx
from fastapi import Request


def get_http_client(request: Request) -> httpx.AsyncClient:
    """Shared AsyncClient from app lifespan (Step 0 skeleton)."""
    return request.app.state.http_client
