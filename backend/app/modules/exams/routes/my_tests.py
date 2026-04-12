from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.exams import services
from app.modules.exams.schemas import StudentAttemptListOut

router = APIRouter()

ExamKind = Literal["reading", "listening", "writing", "speaking"]
ExamAttemptStatus = Literal["in_progress", "completed", "terminated"]


@router.get("/my-tests", response_model=StudentAttemptListOut)
async def list_my_tests(
    search: str | None = Query(default=None, min_length=1),
    module: ExamKind | None = Query(default=None),
    test_id: int | None = Query(default=None, gt=0),
    status: ExamAttemptStatus | None = Query(default=None),
    ordering: str = Query(default="-updated_at"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentAttemptListOut:
    return StudentAttemptListOut.model_validate(
        await services.list_student_attempts(
            db,
            current_user,
            search=search,
            module=module,
            test_id=test_id,
            status=status,
            ordering=ordering,
            offset=offset,
            limit=limit,
        )
    )
