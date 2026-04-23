from fastapi import APIRouter

from briefing.api.routes.admin.correlations import router as correlations_router
from briefing.api.routes.admin.dossiers import router as dossiers_router
from briefing.api.routes.admin.feeds import router as feeds_router
from briefing.api.routes.admin.health import router as health_router
from briefing.api.routes.admin.officials import router as officials_router
from briefing.api.routes.admin.runs import router as runs_router
from briefing.api.routes.admin.sources import router as sources_router
from briefing.api.routes.admin.users import router as users_router

router = APIRouter(prefix="/v1/admin", tags=["admin"])
router.include_router(health_router)
router.include_router(officials_router)
router.include_router(dossiers_router)
router.include_router(runs_router)
router.include_router(correlations_router)
router.include_router(sources_router)
router.include_router(feeds_router)
router.include_router(users_router)
