from fastapi import APIRouter

from briefing.api.routes.admin.health import router as health_router

router = APIRouter(prefix="/v1/admin", tags=["admin"])
router.include_router(health_router)
