from fastapi import APIRouter

from app.modules.teacher_students.routes import student_router, teacher_router

router = APIRouter()
router.include_router(teacher_router)
router.include_router(student_router)
