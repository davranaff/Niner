from fastapi import APIRouter

from app.modules.admin.api import router as admin_router
from app.modules.ai_summary.api import router as ai_summary_router
from app.modules.assignments.api import router as assignments_router
from app.modules.auth.api import router as auth_router
from app.modules.exams.api import router as exams_router
from app.modules.lessons.api import router as lessons_router
from app.modules.listening.api import router as listening_router
from app.modules.profile.api import router as profile_router
from app.modules.reading.api import router as reading_router
from app.modules.speaking.api import router as speaking_router
from app.modules.teacher_students.api import router as teacher_students_router
from app.modules.users.api import router as users_router
from app.modules.writing.api import router as writing_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(reading_router)
api_router.include_router(listening_router)
api_router.include_router(writing_router)
api_router.include_router(speaking_router)
api_router.include_router(exams_router)
api_router.include_router(profile_router)
api_router.include_router(lessons_router)
api_router.include_router(teacher_students_router)
api_router.include_router(ai_summary_router)
api_router.include_router(assignments_router)
api_router.include_router(admin_router)
