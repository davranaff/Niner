from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.exams import services
from app.modules.exams.schemas import ExamCreateIn, ExamPublic
from app.modules.speaking.schemas import (
    SpeakingExaminerDecisionIn,
    SpeakingExaminerDecisionOut,
    SpeakingFinalizeIn,
    SpeakingSessionPersistIn,
    SpeakingSessionState,
    SpeakingAttemptOut,
)

router = APIRouter()


@router.post("/speaking", response_model=ExamPublic)
async def create_speaking_exam(
    payload: ExamCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamPublic:
    return ExamPublic.model_validate(await services.create_exam(db, current_user, "speaking", payload.test_id))


@router.post("/speaking/{exam_id}/start", response_model=ExamPublic)
async def start_speaking_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExamPublic:
    return ExamPublic.model_validate(await services.start_exam(db, current_user, "speaking", exam_id))


@router.get("/speaking/{exam_id}/session", response_model=SpeakingSessionState)
async def get_speaking_exam_session(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpeakingSessionState:
    payload = await services.get_speaking_exam_session_owned(db, current_user, exam_id)
    return SpeakingSessionState.model_validate(payload)


@router.put("/speaking/{exam_id}/session", response_model=SpeakingSessionState)
async def persist_speaking_exam_session(
    exam_id: int,
    payload: SpeakingSessionPersistIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpeakingSessionState:
    persisted = await services.persist_speaking_exam_session(db, current_user, exam_id, payload.session)
    return SpeakingSessionState.model_validate(persisted)


@router.post("/speaking/{exam_id}/examiner-decision", response_model=SpeakingExaminerDecisionOut)
async def examiner_decision(
    exam_id: int,
    payload: SpeakingExaminerDecisionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpeakingExaminerDecisionOut:
    decision = await services.decide_speaking_examiner_turn(db, current_user, exam_id, payload)
    return SpeakingExaminerDecisionOut.model_validate(decision)


@router.post("/speaking/{exam_id}/finalize", response_model=SpeakingAttemptOut)
async def finalize_speaking_exam(
    exam_id: int,
    payload: SpeakingFinalizeIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpeakingAttemptOut:
    attempt = await services.finalize_speaking_exam(db, current_user, exam_id, payload.session)
    return SpeakingAttemptOut.model_validate(attempt)
