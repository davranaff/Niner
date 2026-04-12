from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import Select, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import paginate_query
from app.db.models import (
    FinishReasonEnum,
    ListeningExam,
    ProgressTestTypeEnum,
    ReadingExam,
    SpeakingExam,
    UserAnalytics,
    UserProfile,
    UserProgress,
    WritingExam,
)


def _apply_progress_filters(
    stmt: Select,
    *,
    user_id: int,
    modules: Sequence[ProgressTestTypeEnum] | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> Select:
    filtered_stmt = stmt.where(UserProgress.user_id == user_id)
    if modules:
        filtered_stmt = filtered_stmt.where(UserProgress.test_type.in_(modules))
    if start_at is not None:
        filtered_stmt = filtered_stmt.where(UserProgress.test_date >= start_at)
    if end_at is not None:
        filtered_stmt = filtered_stmt.where(UserProgress.test_date < end_at)
    return filtered_stmt


async def get_profile_by_user_id(db: AsyncSession, user_id: int) -> UserProfile | None:
    return (await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))).scalar_one_or_none()


async def create_profile(db: AsyncSession, user_id: int) -> UserProfile:
    profile = UserProfile(user_id=user_id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def get_analytics_by_user_id(db: AsyncSession, user_id: int) -> UserAnalytics | None:
    return (await db.execute(select(UserAnalytics).where(UserAnalytics.user_id == user_id))).scalar_one_or_none()


async def create_analytics(db: AsyncSession, user_id: int) -> UserAnalytics:
    analytics = UserAnalytics(user_id=user_id)
    db.add(analytics)
    await db.commit()
    await db.refresh(analytics)
    return analytics


async def list_progress_by_user_id(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
) -> list[UserProgress]:
    stmt = select(UserProgress).where(UserProgress.user_id == user_id)
    return await paginate_query(db, stmt, UserProgress.id, limit, offset)


async def list_recent_progress(db: AsyncSession, *, user_id: int, limit: int) -> list[UserProgress]:
    rows = (
        await db.execute(
            select(UserProgress)
            .where(UserProgress.user_id == user_id)
            .order_by(UserProgress.test_date.desc(), UserProgress.id.desc())
            .limit(limit)
        )
    ).scalars()
    return list(rows)


async def list_progress_filtered(
    db: AsyncSession,
    *,
    user_id: int,
    modules: Sequence[ProgressTestTypeEnum] | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    offset: int | None = None,
    limit: int | None = None,
    descending: bool = True,
) -> list[UserProgress]:
    stmt = _apply_progress_filters(
        select(UserProgress),
        user_id=user_id,
        modules=modules,
        start_at=start_at,
        end_at=end_at,
    )

    order_columns = (UserProgress.test_date, UserProgress.id)
    if descending:
        stmt = stmt.order_by(*(column.desc() for column in order_columns))
    else:
        stmt = stmt.order_by(*order_columns)

    if offset is not None:
        stmt = stmt.offset(max(0, offset))
    if limit is not None:
        stmt = stmt.limit(max(1, limit))

    return list((await db.execute(stmt)).scalars().all())


def _attempt_summary_stmt(model, *, user_id: int):
    return select(
        func.count(model.id).label("attempts_count"),
        func.sum(
            case(
                (model.finish_reason == FinishReasonEnum.completed, 1),
                else_=0,
            )
        ).label("successful_attempts_count"),
        func.sum(
            case(
                (model.finish_reason.in_([FinishReasonEnum.left, FinishReasonEnum.time_is_up]), 1),
                else_=0,
            )
        ).label("failed_attempts_count"),
    ).where(model.user_id == user_id)


async def _fetch_attempt_summary(db: AsyncSession, stmt) -> dict[str, int]:
    row = (await db.execute(stmt)).one()
    return {
        "attempts_count": int(row.attempts_count or 0),
        "successful_attempts_count": int(row.successful_attempts_count or 0),
        "failed_attempts_count": int(row.failed_attempts_count or 0),
    }


async def get_reading_attempt_summary(db: AsyncSession, *, user_id: int) -> dict[str, int]:
    return await _fetch_attempt_summary(db, _attempt_summary_stmt(ReadingExam, user_id=user_id))


async def get_listening_attempt_summary(db: AsyncSession, *, user_id: int) -> dict[str, int]:
    return await _fetch_attempt_summary(db, _attempt_summary_stmt(ListeningExam, user_id=user_id))


async def get_writing_attempt_summary(db: AsyncSession, *, user_id: int) -> dict[str, int]:
    return await _fetch_attempt_summary(db, _attempt_summary_stmt(WritingExam, user_id=user_id))


async def get_speaking_attempt_summary(db: AsyncSession, *, user_id: int) -> dict[str, int]:
    return await _fetch_attempt_summary(db, _attempt_summary_stmt(SpeakingExam, user_id=user_id))
