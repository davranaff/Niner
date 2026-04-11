from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    AiModuleSummary,
    AiSummaryModuleEnum,
    AiSummarySourceEnum,
    ListeningExam,
    ListeningExamQuestionAnswer,
    ListeningQuestion,
    ReadingExam,
    ReadingExamQuestionAnswer,
    ReadingQuestion,
    WritingExam,
    WritingExamPart,
)


async def create_summary(
    db: AsyncSession,
    *,
    user_id: int,
    module: AiSummaryModuleEnum,
    source: AiSummarySourceEnum,
    attempts_limit: int,
    lang: str,
    trigger_user_id: int | None,
    exam_id: int | None,
) -> AiModuleSummary:
    row = AiModuleSummary(
        user_id=user_id,
        module=module,
        source=source,
        attempts_limit=attempts_limit,
        lang=lang,
        trigger_user_id=trigger_user_id,
        exam_id=exam_id,
    )
    db.add(row)
    await db.flush()
    return row


async def get_summary(db: AsyncSession, summary_id: int) -> AiModuleSummary | None:
    stmt = select(AiModuleSummary).where(AiModuleSummary.id == summary_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_summaries(
    db: AsyncSession,
    *,
    user_id: int | None,
    module: AiSummaryModuleEnum | None,
    offset: int,
    limit: int,
) -> list[AiModuleSummary]:
    stmt = select(AiModuleSummary)
    if user_id is not None:
        stmt = stmt.where(AiModuleSummary.user_id == user_id)
    if module is not None:
        stmt = stmt.where(AiModuleSummary.module == module)
    stmt = stmt.order_by(desc(AiModuleSummary.id)).offset(max(offset, 0)).limit(max(1, min(limit, 100)))
    return list((await db.execute(stmt)).scalars().all())


async def count_manual_summaries_since(
    db: AsyncSession,
    *,
    user_id: int,
    module: AiSummaryModuleEnum,
    since: datetime,
) -> int:
    stmt = select(func.count(AiModuleSummary.id)).where(
        and_(
            AiModuleSummary.user_id == user_id,
            AiModuleSummary.module == module,
            AiModuleSummary.source == AiSummarySourceEnum.manual,
            AiModuleSummary.created_at >= since,
        )
    )
    return int((await db.execute(stmt)).scalar_one() or 0)


async def list_recent_reading_exams(db: AsyncSession, *, user_id: int, limit: int) -> list[ReadingExam]:
    stmt = (
        select(ReadingExam)
        .where(and_(ReadingExam.user_id == user_id, ReadingExam.finished_at.is_not(None)))
        .order_by(desc(ReadingExam.finished_at))
        .limit(limit)
        .options(
            selectinload(ReadingExam.reading_test),
            selectinload(ReadingExam.question_answers)
            .selectinload(ReadingExamQuestionAnswer.question)
            .selectinload(ReadingQuestion.question_block),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_recent_listening_exams(db: AsyncSession, *, user_id: int, limit: int) -> list[ListeningExam]:
    stmt = (
        select(ListeningExam)
        .where(and_(ListeningExam.user_id == user_id, ListeningExam.finished_at.is_not(None)))
        .order_by(desc(ListeningExam.finished_at))
        .limit(limit)
        .options(
            selectinload(ListeningExam.listening_test),
            selectinload(ListeningExam.question_answers)
            .selectinload(ListeningExamQuestionAnswer.question)
            .selectinload(ListeningQuestion.question_block),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_recent_writing_exams(db: AsyncSession, *, user_id: int, limit: int) -> list[WritingExam]:
    stmt = (
        select(WritingExam)
        .where(and_(WritingExam.user_id == user_id, WritingExam.finished_at.is_not(None)))
        .order_by(desc(WritingExam.finished_at))
        .limit(limit)
        .options(
            selectinload(WritingExam.writing_test),
            selectinload(WritingExam.writing_parts).selectinload(WritingExamPart.part),
        )
    )
    return list((await db.execute(stmt)).scalars().all())
