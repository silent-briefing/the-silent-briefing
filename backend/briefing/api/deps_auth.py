"""Clerk JWT verification for BFF routes (Bearer session token)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError, PyJWKClient

from briefing.config import Settings, get_settings

log = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

ROLE_ORDER = {"viewer": 0, "operator": 1, "admin": 2}


def role_at_least(actual: str | None, required: str) -> bool:
    if actual is None:
        return False
    if required not in ROLE_ORDER or actual not in ROLE_ORDER:
        return False
    return ROLE_ORDER[actual] >= ROLE_ORDER[required]


@dataclass(frozen=True)
class ClerkUser:
    sub: str
    role: str | None
    org_id: str | None


def _role_from_payload(payload: dict[str, Any]) -> str | None:
    meta = payload.get("public_metadata")
    if isinstance(meta, dict):
        r = meta.get("role")
        if isinstance(r, str):
            return r
    r = payload.get("role")
    if isinstance(r, str):
        return r
    return None


def _org_id_from_payload(payload: dict[str, Any]) -> str | None:
    v = payload.get("org_id")
    if isinstance(v, str):
        return v
    meta = payload.get("public_metadata")
    if isinstance(meta, dict):
        v = meta.get("org_id")
        if isinstance(v, str):
            return v
    return None


@lru_cache(maxsize=4)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)


def decode_clerk_jwt(token: str, settings: Settings) -> dict[str, Any]:
    if not settings.clerk_jwks_url or not settings.clerk_jwt_issuer:
        raise HTTPException(
            status_code=503,
            detail="Clerk JWT verification not configured (CLERK_JWKS_URL / CLERK_JWT_ISSUER)",
        )
    try:
        client = _jwks_client(settings.clerk_jwks_url)
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_jwt_issuer,
            options={"verify_aud": False},
        )
    except PyJWTError as e:
        log.warning("jwt_decode_failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e


async def require_clerk_user(
    cred: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings),
) -> ClerkUser:
    if cred is None or cred.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization Bearer token required")
    payload = decode_clerk_jwt(cred.credentials, settings)
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(status_code=401, detail="Token missing sub")
    return ClerkUser(
        sub=sub,
        role=_role_from_payload(payload),
        org_id=_org_id_from_payload(payload),
    )


def require_role(min_role: str):
    async def _dep(
        user: Annotated[ClerkUser, Depends(require_clerk_user)],
    ) -> ClerkUser:
        if not role_at_least(user.role, min_role):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return _dep
