from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.model_enums import AssignmentStatusEnum, ProgressTestTypeEnum
from app.db.models import User
from app.db.session import get_db
from app.modules.assignments import services
from app.modules.assignments.schemas import (
    AssignmentAttemptCreateIn,
    AssignmentAttemptCreateOut,
    AssignmentDetailsOut,
    AssignmentGenerateTestOut,
    AssignmentListOut,
)

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=AssignmentListOut)
async def list_assignments(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    module: ProgressTestTypeEnum | None = Query(default=None),
    status: AssignmentStatusEnum | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignmentListOut:
    payload = await services.list_assignments(
        db,
        current_user,
        limit=limit,
        offset=offset,
        module=module,
        status=status,
    )
    return AssignmentListOut.model_validate(payload)


@router.get("/{assignment_id}", response_model=AssignmentDetailsOut)
async def get_assignment_details(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignmentDetailsOut:
    payload = await services.get_assignment_details(
        db,
        current_user,
        assignment_id=assignment_id,
    )
    return AssignmentDetailsOut.model_validate(payload)


@router.post("/{assignment_id}/attempts", response_model=AssignmentAttemptCreateOut)
async def submit_assignment_attempt(
    assignment_id: int,
    payload: AssignmentAttemptCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignmentAttemptCreateOut:
    data = await services.submit_assignment_attempt(
        db,
        current_user,
        assignment_id=assignment_id,
        response_text=payload.response_text,
        explicit_score=payload.score,
    )
    return AssignmentAttemptCreateOut.model_validate(data)


@router.post("/{assignment_id}/generate-test", response_model=AssignmentGenerateTestOut)
async def generate_assignment_test(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssignmentGenerateTestOut:
    data = await services.request_assignment_test_generation(
        db,
        current_user,
        assignment_id=assignment_id,
    )
    return AssignmentGenerateTestOut.model_validate(data)
