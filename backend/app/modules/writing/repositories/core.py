from __future__ import annotations

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import normalize_limit, normalize_offset
from app.db.models import FinishReasonEnum, WritingExam, WritingTest


async def list_active_tests(
    db: AsyncSession,
    *,
    offset: int,
    limit: int,
) -> list[WritingTest]:
    stmt = (
        select(WritingTest)
        .where(WritingTest.is_active.is_(True))
        .order_by(WritingTest.id.desc())
        .offset(normalize_offset(offset))
        .limit(normalize_limit(limit))
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_test_detail(db: AsyncSession, test_id: int) -> WritingTest | None:
    stmt = select(WritingTest).where(WritingTest.id == test_id).options(selectinload(WritingTest.writing_parts))
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_attempt_stats_by_test_ids(
    db: AsyncSession,
    *,
    user_id: int,
    test_ids: list[int],
) -> dict[int, dict[str, int]]:
    if not test_ids:
        return {}

    stmt = (
        select(
            WritingExam.writing_test_id.label("test_id"),
            func.count(WritingExam.id).label("attempts_count"),
            func.sum(
                case(
                    (WritingExam.finish_reason == FinishReasonEnum.completed, 1),
                    else_=0,
                )
            ).label("successful_attempts_count"),
            func.sum(
                case(
                    (
                        WritingExam.finish_reason.in_(
                            [FinishReasonEnum.left, FinishReasonEnum.time_is_up]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("failed_attempts_count"),
        )
        .where(
            WritingExam.user_id == user_id,
            WritingExam.writing_test_id.in_(test_ids),
        )
        .group_by(WritingExam.writing_test_id)
    )
    rows = (await db.execute(stmt)).all()
    return {
        int(row.test_id): {
            "attempts_count": int(row.attempts_count or 0),
            "successful_attempts_count": int(row.successful_attempts_count or 0),
            "failed_attempts_count": int(row.failed_attempts_count or 0),
        }
        for row in rows
    }
