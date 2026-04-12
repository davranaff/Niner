from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import OffsetPage
from app.core.security import get_current_user
from app.db.models import ProgressTestTypeEnum, User
from app.db.session import get_db
from app.modules.profile import services
from app.modules.profile.schemas import (
    AnalyticsOut,
    DashboardActivityOut,
    DashboardQuickLinksOut,
    DashboardStatsOut,
)

router = APIRouter()


@router.get("/analytics", response_model=AnalyticsOut, tags=["analytics"])
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsOut:
    return await services.get_analytics(db, current_user)


@router.get("/dashboard/activity", response_model=DashboardActivityOut, tags=["dashboard"])
async def get_dashboard_activity(
    year: int | None = Query(default=None, ge=2000, le=2100),
    modules: list[ProgressTestTypeEnum] | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardActivityOut:
    return await services.get_dashboard_activity(
        db,
        current_user,
        year=year,
        modules=modules,
    )


@router.get("/dashboard/stats", response_model=DashboardStatsOut, tags=["dashboard"])
async def get_dashboard_stats(
    modules: list[ProgressTestTypeEnum] | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardStatsOut:
    return await services.get_dashboard_stats(db, current_user, modules=modules)


@router.get("/dashboard/history", response_model=OffsetPage, tags=["dashboard"])
async def list_dashboard_history(
    modules: list[ProgressTestTypeEnum] | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OffsetPage:
    return await services.list_dashboard_history(
        db,
        current_user,
        modules=modules,
        offset=offset,
        limit=limit,
    )


@router.get("/dashboard/quick-links", response_model=DashboardQuickLinksOut, tags=["dashboard"])
async def get_dashboard_quick_links(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardQuickLinksOut:
    return await services.get_quick_links(db, current_user)
