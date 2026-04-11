from fastapi import APIRouter

from app.modules.ai_summary.routes import main_router, stream_router

router = APIRouter()
router.include_router(main_router)
router.include_router(stream_router)
