from fastapi import APIRouter

from .dashboard import router as dashboard_router
from .profile import router as profile_router
from .progress import router as progress_router

router = APIRouter()
router.include_router(profile_router)
router.include_router(progress_router)
router.include_router(dashboard_router)

__all__ = ["router"]
