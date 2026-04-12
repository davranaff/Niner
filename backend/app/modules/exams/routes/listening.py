from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.exams import services
from app.modules.exams.schemas import (
    ExamAnswerIn,
    ExamCreateIn,
    ExamDraftOut,
    ExamPublic,
    ExamSubmitOut,
    SubmitFinishReasonOverride,
)

router = APIRouter()


@router.post("/listening", response_model=ExamPublic)
async def create_listening_exam(
    payload: ExamCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamPublic:
    return ExamPublic.model_validate(await services.create_exam(db, current_user, "listening", payload.test_id))


@router.post("/listening/{exam_id}/start", response_model=ExamPublic)
async def start_listening_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamPublic:
    return ExamPublic.model_validate(await services.start_exam(db, current_user, "listening", exam_id))


@router.post("/listening/{exam_id}/submit", response_model=ExamSubmitOut)
async def submit_listening_exam(
    exam_id: int,
    payload: list[ExamAnswerIn],
    finish_reason: SubmitFinishReasonOverride | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamSubmitOut:
    result = await services.submit_listening_exam(
        db,
        current_user,
        exam_id,
        [p.model_dump() for p in payload],
        finish_reason_override=finish_reason,
    )
    return ExamSubmitOut.model_validate(result)


@router.put("/listening/{exam_id}/draft", response_model=ExamDraftOut)
async def save_listening_exam_draft(
    exam_id: int,
    payload: list[ExamAnswerIn],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamDraftOut:
    result = await services.save_listening_exam_draft(
        db,
        current_user,
        exam_id,
        [p.model_dump() for p in payload],
    )
    return ExamDraftOut.model_validate(result)
