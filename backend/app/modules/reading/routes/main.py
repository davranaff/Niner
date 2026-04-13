from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import CursorPage
from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.reading import services
from app.modules.reading.schemas import ReadingTestDetail

router = APIRouter(prefix="/reading", tags=["reading"])


@router.get("/tests", response_model=CursorPage)
async def list_tests(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CursorPage:
    return await services.list_reading_tests(db, current_user, offset=offset, limit=limit)


@router.get("/tests/{test_id}", response_model=ReadingTestDetail)
async def get_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReadingTestDetail:
    payload = await services.get_reading_test_detail(db, current_user, test_id)
    return ReadingTestDetail.model_validate(payload)
