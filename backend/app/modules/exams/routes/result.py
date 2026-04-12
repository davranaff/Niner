from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.exams import services
from app.modules.exams.schemas import ExamResultOut

router = APIRouter()

ExamKind = Literal["reading", "listening", "writing"]


@router.get("/{kind}/{exam_id}/result", response_model=ExamResultOut)
async def get_exam_result(
    kind: ExamKind,
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamResultOut:
    result = await services.get_exam_result(db, current_user, kind, exam_id)
    return ExamResultOut.model_validate(result)
