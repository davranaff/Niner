from fastapi import APIRouter

from app.modules.admin.routes import (
    exams_router,
    lessons_router,
    listening_router,
    reading_router,
    writing_router,
)

router = APIRouter(prefix="/admin")
router.include_router(reading_router, tags=["admin-reading"])
router.include_router(listening_router, tags=["admin-listening"])
router.include_router(writing_router, tags=["admin-writing"])
router.include_router(exams_router, tags=["admin-exams"])
router.include_router(lessons_router, tags=["admin-lessons"])
