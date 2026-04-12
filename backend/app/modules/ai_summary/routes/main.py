from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import AiSummaryModuleEnum, AiSummarySourceEnum, User
from app.db.session import get_db
from app.modules.ai_summary import services
from app.modules.ai_summary.schemas import AiSummaryListOut, AiSummaryOut, AiSummaryTriggerIn

router = APIRouter(tags=["ai"])


@router.post("/ai/summaries", response_model=AiSummaryOut, status_code=status.HTTP_202_ACCEPTED)
async def trigger_ai_summary(
    payload: AiSummaryTriggerIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiSummaryOut:
    row = await services.create_manual_summary(
        db,
        current_user,
        module=payload.module,
        student_id=payload.student_id,
        attempts_limit=payload.attempts_limit,
        lang=payload.lang,
    )
    return AiSummaryOut.model_validate(row)


@router.get("/ai/summaries", response_model=AiSummaryListOut)
async def list_ai_summaries(
    student_id: int | None = Query(default=None, gt=0),
    module: AiSummaryModuleEnum | None = Query(default=None),
    source: AiSummarySourceEnum | None = Query(default=None),
    exam_id: int | None = Query(default=None, gt=0),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiSummaryListOut:
    payload = await services.list_summaries(
        db,
        current_user,
        student_id=student_id,
        module=module,
        source=source,
        exam_id=exam_id,
        offset=offset,
        limit=limit,
    )
    return AiSummaryListOut.model_validate(payload)


@router.get("/ai/summaries/{summary_id}", response_model=AiSummaryOut)
async def get_ai_summary(
    summary_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AiSummaryOut:
    payload = await services.get_summary_detail(db, current_user, summary_id)
    return AiSummaryOut.model_validate(payload)
