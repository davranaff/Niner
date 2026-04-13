from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import CursorPage
from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.writing import services
from app.modules.writing.schemas import WritingTestDetail

router = APIRouter(prefix="/writing", tags=["writing"])


@router.get("/tests", response_model=CursorPage)
async def list_tests(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CursorPage:
    return await services.list_writing_tests(db, current_user, offset=offset, limit=limit)


@router.get("/tests/{test_id}", response_model=WritingTestDetail)
async def get_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WritingTestDetail:
    payload = await services.get_writing_test_detail(db, current_user, test_id)
    return WritingTestDetail.model_validate(payload)
