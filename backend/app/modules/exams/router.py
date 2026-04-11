from fastapi import APIRouter

from app.modules.exams.routes import (
    listening_router,
    me_router,
    my_tests_router,
    reading_router,
    writing_router,
)

router = APIRouter(prefix="/exams", tags=["exams"])
router.include_router(reading_router)
router.include_router(listening_router)
router.include_router(writing_router)
router.include_router(me_router)
router.include_router(my_tests_router)
