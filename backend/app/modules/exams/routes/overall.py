from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.exams import services
from app.modules.exams.schemas import OverallExamListOut, OverallExamResultOut, OverallExamStateOut

router = APIRouter()

OverallExamStatus = Literal["in_progress", "completed", "terminated"]


@router.post("/overall/start", response_model=OverallExamStateOut)
async def start_overall_exam(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverallExamStateOut:
    return OverallExamStateOut.model_validate(await services.start_overall_exam(db, current_user))


@router.get("/overall/my-tests", response_model=OverallExamListOut)
async def list_overall_my_tests(
    status: OverallExamStatus | None = Query(default=None),
    ordering: str = Query(default="-updated_at"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverallExamListOut:
    return OverallExamListOut.model_validate(
        await services.list_overall_exams(
            db,
            current_user,
            status=status,
            ordering=ordering,
            offset=offset,
            limit=limit,
        )
    )


@router.get("/overall/{overall_id}", response_model=OverallExamStateOut)
async def get_overall_exam(
    overall_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverallExamStateOut:
    return OverallExamStateOut.model_validate(await services.get_overall_exam_state(db, current_user, overall_id))


@router.post("/overall/{overall_id}/continue", response_model=OverallExamStateOut)
async def continue_overall_exam(
    overall_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverallExamStateOut:
    return OverallExamStateOut.model_validate(await services.continue_overall_exam(db, current_user, overall_id))


@router.get("/overall/{overall_id}/result", response_model=OverallExamResultOut)
async def get_overall_result(
    overall_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverallExamResultOut:
    return OverallExamResultOut.model_validate(await services.get_overall_exam_result(db, current_user, overall_id))
