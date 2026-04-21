from typing import Annotated

from fastapi import APIRouter, Depends

from briefing.api.deps_auth import ClerkUser, require_role

router = APIRouter()


@router.get("/health")
def admin_health(
    user: Annotated[ClerkUser, Depends(require_role("admin"))],
) -> dict[str, str | None]:
    """Smoke: verifies Bearer JWT + admin role."""
    return {"user_id": user.sub, "role": user.role}
