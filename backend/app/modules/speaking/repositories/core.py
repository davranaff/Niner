from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.db.models import SpeakingPart, SpeakingQuestion, SpeakingTest


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
