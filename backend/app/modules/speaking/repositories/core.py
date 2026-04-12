from __future__ import annotations

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.db.models import FinishReasonEnum, SpeakingExam, SpeakingPart, SpeakingQuestion, SpeakingTest


async def list_active_tests(
    db: AsyncSession,
    *,
    offset: int,
    limit: int,
) -> list[SpeakingTest]:
    stmt = select(SpeakingTest).where(SpeakingTest.is_active.is_(True))
    return await paginate_query(db, stmt, SpeakingTest.id, limit, offset)


async def get_test_detail(db: AsyncSession, test_id: int) -> SpeakingTest | None:
    stmt = (
        select(SpeakingTest)
        .where(SpeakingTest.id == test_id)
        .options(
            selectinload(SpeakingTest.parts).selectinload(SpeakingPart.questions),
        )
    )
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
            SpeakingExam.speaking_test_id.label("test_id"),
            func.count(SpeakingExam.id).label("attempts_count"),
            func.sum(
                case(
                    (SpeakingExam.finish_reason == FinishReasonEnum.completed, 1),
                    else_=0,
                )
            ).label("successful_attempts_count"),
            func.sum(
                case(
                    (
                        SpeakingExam.finish_reason.in_(
                            [FinishReasonEnum.left, FinishReasonEnum.time_is_up]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("failed_attempts_count"),
        )
        .where(
            SpeakingExam.user_id == user_id,
            SpeakingExam.speaking_test_id.in_(test_ids),
        )
        .group_by(SpeakingExam.speaking_test_id)
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


async def get_test_by_slug(db: AsyncSession, slug: str) -> SpeakingTest | None:
    stmt = (
        select(SpeakingTest)
        .where(SpeakingTest.slug == slug)
        .options(
            selectinload(SpeakingTest.parts).selectinload(SpeakingPart.questions),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_question_index_for_test(db: AsyncSession, test_id: int) -> dict[str, SpeakingQuestion]:
    stmt = (
        select(SpeakingQuestion)
        .join(SpeakingPart, SpeakingPart.id == SpeakingQuestion.part_id)
        .where(SpeakingPart.test_id == test_id)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return {question.question_code: question for question in rows}
