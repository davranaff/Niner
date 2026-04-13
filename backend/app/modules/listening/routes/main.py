from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import CursorPage
from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.listening import services
from app.modules.listening.schemas import ListeningTestDetail

router = APIRouter(prefix="/listening", tags=["listening"])


@router.get("/tests", response_model=CursorPage)
async def list_tests(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CursorPage:
    return await services.list_listening_tests(db, current_user, offset=offset, limit=limit)


@router.get("/tests/{test_id}", response_model=ListeningTestDetail)
async def get_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ListeningTestDetail:
    payload = await services.get_listening_test_detail(db, current_user, test_id)
    return ListeningTestDetail.model_validate(payload)
