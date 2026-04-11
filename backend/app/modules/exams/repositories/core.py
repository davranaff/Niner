from __future__ import annotations

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.db.models import (
    ListeningExam,
    ListeningExamQuestionAnswer,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionBlock,
    ListeningTest,
    ReadingExam,
    ReadingExamQuestionAnswer,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionBlock,
    ReadingTest,
    WritingExam,
    WritingExamPart,
    WritingTest,
)


async def get_reading_test(db: AsyncSession, test_id: int) -> ReadingTest | None:
    return await db.get(ReadingTest, test_id)


async def get_listening_test(db: AsyncSession, test_id: int) -> ListeningTest | None:
    return await db.get(ListeningTest, test_id)


async def get_writing_test(db: AsyncSession, test_id: int) -> WritingTest | None:
    return await db.get(WritingTest, test_id)


async def get_reading_exam_with_relations(db: AsyncSession, exam_id: int) -> ReadingExam | None:
    stmt = (
        select(ReadingExam)
        .where(ReadingExam.id == exam_id)
        .options(
            selectinload(ReadingExam.reading_test)
            .selectinload(ReadingTest.passages)
            .selectinload(ReadingPassage.question_blocks)
            .selectinload(ReadingQuestionBlock.questions)
            .selectinload(ReadingQuestion.options),
            selectinload(ReadingExam.reading_test)
            .selectinload(ReadingTest.passages)
            .selectinload(ReadingPassage.question_blocks)
            .selectinload(ReadingQuestionBlock.questions)
            .selectinload(ReadingQuestion.answers),
            selectinload(ReadingExam.question_answers).selectinload(ReadingExamQuestionAnswer.question),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_listening_exam_with_relations(db: AsyncSession, exam_id: int) -> ListeningExam | None:
    stmt = (
        select(ListeningExam)
        .where(ListeningExam.id == exam_id)
        .options(
            selectinload(ListeningExam.listening_test)
            .selectinload(ListeningTest.parts)
            .selectinload(ListeningPart.question_blocks)
            .selectinload(ListeningQuestionBlock.questions)
            .selectinload(ListeningQuestion.options),
            selectinload(ListeningExam.listening_test)
            .selectinload(ListeningTest.parts)
            .selectinload(ListeningPart.question_blocks)
            .selectinload(ListeningQuestionBlock.questions)
            .selectinload(ListeningQuestion.answers),
            selectinload(ListeningExam.question_answers).selectinload(ListeningExamQuestionAnswer.question),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_writing_exam_with_relations(db: AsyncSession, exam_id: int) -> WritingExam | None:
    stmt = (
        select(WritingExam)
        .where(WritingExam.id == exam_id)
        .options(
            selectinload(WritingExam.writing_test).selectinload(WritingTest.writing_parts),
            selectinload(WritingExam.writing_parts).selectinload(WritingExamPart.part),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_reading_exam_answer(
    db: AsyncSession,
    *,
    exam_id: int,
    question_id: int,
) -> ReadingExamQuestionAnswer | None:
    stmt = select(ReadingExamQuestionAnswer).where(
        and_(
            ReadingExamQuestionAnswer.exam_id == exam_id,
            ReadingExamQuestionAnswer.question_id == question_id,
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_listening_exam_answer(
    db: AsyncSession,
    *,
    exam_id: int,
    question_id: int,
) -> ListeningExamQuestionAnswer | None:
    stmt = select(ListeningExamQuestionAnswer).where(
        and_(
            ListeningExamQuestionAnswer.exam_id == exam_id,
            ListeningExamQuestionAnswer.question_id == question_id,
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_writing_exam_part(
    db: AsyncSession,
    *,
    exam_id: int,
    part_id: int,
) -> WritingExamPart | None:
    stmt = select(WritingExamPart).where(and_(WritingExamPart.exam_id == exam_id, WritingExamPart.part_id == part_id))
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_user_reading_exams(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
) -> list[ReadingExam]:
    return await paginate_query(
        db,
        select(ReadingExam).where(ReadingExam.user_id == user_id),
        ReadingExam.id,
        limit,
        offset,
    )


async def list_user_listening_exams(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
) -> list[ListeningExam]:
    return await paginate_query(
        db,
        select(ListeningExam).where(ListeningExam.user_id == user_id),
        ListeningExam.id,
        limit,
        offset,
    )


async def list_user_writing_exams(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
) -> list[WritingExam]:
    return await paginate_query(
        db,
        select(WritingExam).where(WritingExam.user_id == user_id),
        WritingExam.id,
        limit,
        offset,
    )


async def list_all_user_reading_exams_with_relations(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[ReadingExam]:
    stmt = (
        select(ReadingExam)
        .where(ReadingExam.user_id == user_id)
        .options(
            selectinload(ReadingExam.reading_test),
            selectinload(ReadingExam.question_answers),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_all_user_listening_exams_with_relations(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[ListeningExam]:
    stmt = (
        select(ListeningExam)
        .where(ListeningExam.user_id == user_id)
        .options(
            selectinload(ListeningExam.listening_test),
            selectinload(ListeningExam.question_answers),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_all_user_writing_exams_with_relations(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[WritingExam]:
    stmt = (
        select(WritingExam)
        .where(WritingExam.user_id == user_id)
        .options(
            selectinload(WritingExam.writing_test),
            selectinload(WritingExam.writing_parts),
        )
    )
    return list((await db.execute(stmt)).scalars().all())
