from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import OffsetPage
from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.profile import services
from app.modules.profile.schemas import ProgressIn, ProgressOut

router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=OffsetPage)
async def list_progress(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OffsetPage:
    return await services.list_progress(db, current_user, offset, limit)


@router.post("/progress", response_model=ProgressOut)
async def create_progress(
    payload: ProgressIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressOut:
    return await services.create_progress(db, current_user, payload.model_dump())
