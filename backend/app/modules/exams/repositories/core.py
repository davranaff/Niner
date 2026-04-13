from __future__ import annotations

from sqlalchemy import Float, Integer, String, and_, asc, case, cast, func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.db.models import (
    FinishReasonEnum,
    ListeningExam,
    ListeningExamQuestionAnswer,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionBlock,
    ListeningTest,
    OverallExam,
    ReadingExam,
    ReadingExamQuestionAnswer,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionBlock,
    ReadingTest,
    SpeakingExam,
    SpeakingPart,
    SpeakingTest,
    WritingExam,
    WritingExamPart,
    WritingPart,
    WritingTest,
)
from app.modules.exams.score import LISTENING_BAND_THRESHOLDS, READING_BAND_THRESHOLDS


def _attempt_status_expr(*, finished_at_col, finish_reason_col):
    return case(
        (finished_at_col.is_(None), literal("in_progress")),
        (finish_reason_col == FinishReasonEnum.left, literal("terminated")),
        else_=literal("completed"),
    )


def _band_case_from_thresholds(correct_count_col, thresholds):
    return case(
        *[(correct_count_col >= min_score, literal(float(band))) for min_score, band in thresholds],
        else_=literal(0.0),
    )


def _student_attempt_filters(stmt, *, attempts_sq, search: str | None, test_id: int | None, status: str | None):
    if search:
        normalized = f"%{search.strip().lower()}%"
        stmt = stmt.where(func.lower(attempts_sq.c.test_title).like(normalized))
    if test_id is not None:
        stmt = stmt.where(attempts_sq.c.test_id == int(test_id))
    if status is not None:
        stmt = stmt.where(attempts_sq.c.status == status)
    return stmt


def _student_attempt_order_columns(*, attempts_sq, ordering: str):
    reverse = ordering.startswith("-")
    field = ordering[1:] if reverse else ordering

    if field in {"created_at", "updated_at", "started_at", "finished_at"}:
        sort_col = attempts_sq.c[field]
    elif field == "test_title":
        sort_col = func.lower(attempts_sq.c.test_title)
    elif field == "estimated_band":
        sort_col = attempts_sq.c.estimated_band
    else:
        sort_col = attempts_sq.c.updated_at
        reverse = True

    nulls_rank = case((sort_col.is_(None), 1), else_=0)
    if reverse:
        return (nulls_rank.asc(), sort_col.desc(), attempts_sq.c.id.desc())
    return (nulls_rank.asc(), sort_col.asc(), attempts_sq.c.id.asc())


def _reading_attempt_projection(*, user_id: int):
    counts_sq = (
        select(
            ReadingExamQuestionAnswer.exam_id.label("exam_id"),
            func.count(ReadingExamQuestionAnswer.id).label("answers_count"),
            func.sum(
                case(
                    (ReadingExamQuestionAnswer.is_correct.is_(True), 1),
                    else_=0,
                )
            ).label("correct_count"),
        )
        .group_by(ReadingExamQuestionAnswer.exam_id)
        .subquery()
    )

    answers_count = func.coalesce(counts_sq.c.answers_count, 0)
    correct_count = func.coalesce(counts_sq.c.correct_count, 0)
    has_answers = answers_count > 0
    score_expr = case(
        (has_answers | ReadingExam.finished_at.is_not(None), _band_case_from_thresholds(correct_count, READING_BAND_THRESHOLDS)),
        else_=None,
    )

    return (
        select(
            ReadingExam.id.label("id"),
            literal("reading").label("kind"),
            ReadingExam.reading_test_id.label("test_id"),
            ReadingTest.title.label("test_title"),
            cast(ReadingTest.time_limit, Integer).label("time_limit"),
            _attempt_status_expr(
                finished_at_col=ReadingExam.finished_at,
                finish_reason_col=ReadingExam.finish_reason,
            ).label("status"),
            cast(ReadingExam.finish_reason, String).label("finish_reason"),
            ReadingExam.started_at.label("started_at"),
            ReadingExam.finished_at.label("finished_at"),
            ReadingExam.created_at.label("created_at"),
            ReadingExam.updated_at.label("updated_at"),
            cast(score_expr, Float).label("estimated_band"),
        )
        .join(ReadingTest, ReadingTest.id == ReadingExam.reading_test_id)
        .outerjoin(counts_sq, counts_sq.c.exam_id == ReadingExam.id)
        .where(ReadingExam.user_id == user_id)
    )


def _listening_attempt_projection(*, user_id: int):
    counts_sq = (
        select(
            ListeningExamQuestionAnswer.exam_id.label("exam_id"),
            func.count(ListeningExamQuestionAnswer.id).label("answers_count"),
            func.sum(
                case(
                    (ListeningExamQuestionAnswer.is_correct.is_(True), 1),
                    else_=0,
                )
            ).label("correct_count"),
        )
        .group_by(ListeningExamQuestionAnswer.exam_id)
        .subquery()
    )

    answers_count = func.coalesce(counts_sq.c.answers_count, 0)
    correct_count = func.coalesce(counts_sq.c.correct_count, 0)
    has_answers = answers_count > 0
    score_expr = case(
        (has_answers | ListeningExam.finished_at.is_not(None), _band_case_from_thresholds(correct_count, LISTENING_BAND_THRESHOLDS)),
        else_=None,
    )

    return (
        select(
            ListeningExam.id.label("id"),
            literal("listening").label("kind"),
            ListeningExam.listening_test_id.label("test_id"),
            ListeningTest.title.label("test_title"),
            cast(ListeningTest.time_limit, Integer).label("time_limit"),
            _attempt_status_expr(
                finished_at_col=ListeningExam.finished_at,
                finish_reason_col=ListeningExam.finish_reason,
            ).label("status"),
            cast(ListeningExam.finish_reason, String).label("finish_reason"),
            ListeningExam.started_at.label("started_at"),
            ListeningExam.finished_at.label("finished_at"),
            ListeningExam.created_at.label("created_at"),
            ListeningExam.updated_at.label("updated_at"),
            cast(score_expr, Float).label("estimated_band"),
        )
        .join(ListeningTest, ListeningTest.id == ListeningExam.listening_test_id)
        .outerjoin(counts_sq, counts_sq.c.exam_id == ListeningExam.id)
        .where(ListeningExam.user_id == user_id)
    )


def _writing_attempt_projection(*, user_id: int):
    trimmed_essay = func.trim(func.coalesce(WritingExamPart.essay, ""))
    has_essay = trimmed_essay != ""
    has_scored_essay = and_(has_essay, WritingExamPart.score.is_not(None))
    weight_expr = case((WritingPart.order == 2, literal(2.0)), else_=literal(1.0))

    stats_sq = (
        select(
            WritingExamPart.exam_id.label("exam_id"),
            func.sum(case((has_essay, 1), else_=0)).label("submitted_count"),
            func.sum(case((has_scored_essay, 1), else_=0)).label("scored_count"),
            func.sum(
                case(
                    (has_scored_essay, cast(WritingExamPart.score, Float) * weight_expr),
                    else_=literal(0.0),
                )
            ).label("weighted_total"),
            func.sum(case((has_scored_essay, weight_expr), else_=literal(0.0))).label("weight_total"),
        )
        .select_from(WritingExamPart)
        .join(WritingPart, WritingPart.id == WritingExamPart.part_id)
        .group_by(WritingExamPart.exam_id)
        .subquery()
    )

    submitted_count = func.coalesce(stats_sq.c.submitted_count, 0)
    scored_count = func.coalesce(stats_sq.c.scored_count, 0)
    weight_total = func.coalesce(stats_sq.c.weight_total, 0.0)
    raw_average = func.coalesce(stats_sq.c.weighted_total, 0.0) / func.nullif(weight_total, 0.0)
    rounded_half = func.round(raw_average * 2.0) / 2.0

    score_expr = case(
        (submitted_count == 0, None),
        (scored_count < submitted_count, None),
        else_=rounded_half,
    )

    return (
        select(
            WritingExam.id.label("id"),
            literal("writing").label("kind"),
            WritingExam.writing_test_id.label("test_id"),
            WritingTest.title.label("test_title"),
            cast(WritingTest.time_limit, Integer).label("time_limit"),
            _attempt_status_expr(
                finished_at_col=WritingExam.finished_at,
                finish_reason_col=WritingExam.finish_reason,
            ).label("status"),
            cast(WritingExam.finish_reason, String).label("finish_reason"),
            WritingExam.started_at.label("started_at"),
            WritingExam.finished_at.label("finished_at"),
            WritingExam.created_at.label("created_at"),
            WritingExam.updated_at.label("updated_at"),
            cast(score_expr, Float).label("estimated_band"),
        )
        .join(WritingTest, WritingTest.id == WritingExam.writing_test_id)
        .outerjoin(stats_sq, stats_sq.c.exam_id == WritingExam.id)
        .where(WritingExam.user_id == user_id)
    )


def _speaking_attempt_projection(*, user_id: int):
    score_expr = cast(SpeakingExam.result_json["overall_band"].as_string(), Float)

    return (
        select(
            SpeakingExam.id.label("id"),
            literal("speaking").label("kind"),
            SpeakingExam.speaking_test_id.label("test_id"),
            SpeakingTest.title.label("test_title"),
            cast(SpeakingTest.duration_minutes * literal(60), Integer).label("time_limit"),
            _attempt_status_expr(
                finished_at_col=SpeakingExam.finished_at,
                finish_reason_col=SpeakingExam.finish_reason,
            ).label("status"),
            cast(SpeakingExam.finish_reason, String).label("finish_reason"),
            SpeakingExam.started_at.label("started_at"),
            SpeakingExam.finished_at.label("finished_at"),
            SpeakingExam.created_at.label("created_at"),
            SpeakingExam.updated_at.label("updated_at"),
            score_expr.label("estimated_band"),
        )
        .join(SpeakingTest, SpeakingTest.id == SpeakingExam.speaking_test_id)
        .where(SpeakingExam.user_id == user_id)
    )


def _student_attempts_projection(*, user_id: int, module: str | None):
    projections = []
    if module in {None, "reading"}:
        projections.append(_reading_attempt_projection(user_id=user_id))
    if module in {None, "listening"}:
        projections.append(_listening_attempt_projection(user_id=user_id))
    if module in {None, "writing"}:
        projections.append(_writing_attempt_projection(user_id=user_id))
    if module in {None, "speaking"}:
        projections.append(_speaking_attempt_projection(user_id=user_id))

    if not projections:
        return select(
            literal(0).label("id"),
            literal("").label("kind"),
            literal(0).label("test_id"),
            literal("").label("test_title"),
            literal(0).label("time_limit"),
            literal("in_progress").label("status"),
            literal(None).label("finish_reason"),
            literal(None).label("started_at"),
            literal(None).label("finished_at"),
            literal(None).label("created_at"),
            literal(None).label("updated_at"),
            literal(None).label("estimated_band"),
        ).where(literal(False))

    if len(projections) == 1:
        return projections[0]
    return union_all(*projections)


async def get_first_active_reading_test(db: AsyncSession) -> ReadingTest | None:
    stmt = select(ReadingTest).where(ReadingTest.is_active.is_(True)).order_by(asc(ReadingTest.id)).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_first_active_listening_test(db: AsyncSession) -> ListeningTest | None:
    stmt = (
        select(ListeningTest)
        .where(ListeningTest.is_active.is_(True))
        .order_by(asc(ListeningTest.id))
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_first_active_writing_test(db: AsyncSession) -> WritingTest | None:
    stmt = select(WritingTest).where(WritingTest.is_active.is_(True)).order_by(asc(WritingTest.id)).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_first_active_speaking_test(db: AsyncSession) -> SpeakingTest | None:
    stmt = select(SpeakingTest).where(SpeakingTest.is_active.is_(True)).order_by(asc(SpeakingTest.id)).limit(1)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_reading_test(db: AsyncSession, test_id: int) -> ReadingTest | None:
    return await db.get(ReadingTest, test_id)


async def get_listening_test(db: AsyncSession, test_id: int) -> ListeningTest | None:
    return await db.get(ListeningTest, test_id)


async def get_writing_test(db: AsyncSession, test_id: int) -> WritingTest | None:
    return await db.get(WritingTest, test_id)


async def get_speaking_test(db: AsyncSession, test_id: int) -> SpeakingTest | None:
    return await db.get(SpeakingTest, test_id)


async def get_reading_exam_with_relations(db: AsyncSession, exam_id: int) -> ReadingExam | None:
    stmt = (
        select(ReadingExam)
        .execution_options(populate_existing=True)
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
        .execution_options(populate_existing=True)
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
        .execution_options(populate_existing=True)
        .where(WritingExam.id == exam_id)
        .options(
            selectinload(WritingExam.writing_test).selectinload(WritingTest.writing_parts),
            selectinload(WritingExam.writing_parts).selectinload(WritingExamPart.part),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_speaking_exam_with_relations(db: AsyncSession, exam_id: int) -> SpeakingExam | None:
    stmt = (
        select(SpeakingExam)
        .execution_options(populate_existing=True)
        .where(SpeakingExam.id == exam_id)
        .options(
            selectinload(SpeakingExam.speaking_test)
            .selectinload(SpeakingTest.parts)
            .selectinload(SpeakingPart.questions),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_in_progress_overall_exam_by_user(db: AsyncSession, *, user_id: int) -> OverallExam | None:
    stmt = (
        select(OverallExam)
        .where(
            OverallExam.user_id == user_id,
            OverallExam.status == "in_progress",
        )
        .order_by(OverallExam.id.desc())
        .limit(1)
        .options(
            selectinload(OverallExam.listening_test),
            selectinload(OverallExam.reading_test),
            selectinload(OverallExam.writing_test),
            selectinload(OverallExam.speaking_test),
            selectinload(OverallExam.listening_exam).selectinload(ListeningExam.question_answers),
            selectinload(OverallExam.reading_exam).selectinload(ReadingExam.question_answers),
            selectinload(OverallExam.writing_exam).selectinload(WritingExam.writing_parts),
            selectinload(OverallExam.speaking_exam),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_overall_exam_with_relations(db: AsyncSession, overall_id: int) -> OverallExam | None:
    stmt = (
        select(OverallExam)
        .where(OverallExam.id == overall_id)
        .options(
            selectinload(OverallExam.listening_test),
            selectinload(OverallExam.reading_test),
            selectinload(OverallExam.writing_test),
            selectinload(OverallExam.speaking_test),
            selectinload(OverallExam.listening_exam).selectinload(ListeningExam.question_answers),
            selectinload(OverallExam.reading_exam).selectinload(ReadingExam.question_answers),
            selectinload(OverallExam.writing_exam)
            .selectinload(WritingExam.writing_parts)
            .selectinload(WritingExamPart.part),
            selectinload(OverallExam.speaking_exam),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_in_progress_overall_by_module_exam(
    db: AsyncSession,
    *,
    module: str,
    exam_id: int,
) -> OverallExam | None:
    if module == "listening":
        condition = OverallExam.listening_exam_id == exam_id
    elif module == "reading":
        condition = OverallExam.reading_exam_id == exam_id
    elif module == "writing":
        condition = OverallExam.writing_exam_id == exam_id
    else:
        condition = OverallExam.speaking_exam_id == exam_id

    stmt = (
        select(OverallExam)
        .where(
            condition,
            OverallExam.status == "in_progress",
        )
        .options(
            selectinload(OverallExam.listening_test),
            selectinload(OverallExam.reading_test),
            selectinload(OverallExam.writing_test),
            selectinload(OverallExam.speaking_test),
            selectinload(OverallExam.listening_exam).selectinload(ListeningExam.question_answers),
            selectinload(OverallExam.reading_exam).selectinload(ReadingExam.question_answers),
            selectinload(OverallExam.writing_exam).selectinload(WritingExam.writing_parts),
            selectinload(OverallExam.speaking_exam),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_all_user_overall_exams_with_relations(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[OverallExam]:
    stmt = (
        select(OverallExam)
        .where(OverallExam.user_id == user_id)
        .options(
            selectinload(OverallExam.listening_test),
            selectinload(OverallExam.reading_test),
            selectinload(OverallExam.writing_test),
            selectinload(OverallExam.speaking_test),
            selectinload(OverallExam.listening_exam).selectinload(ListeningExam.question_answers),
            selectinload(OverallExam.reading_exam).selectinload(ReadingExam.question_answers),
            selectinload(OverallExam.writing_exam).selectinload(WritingExam.writing_parts),
            selectinload(OverallExam.speaking_exam),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


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


async def list_user_speaking_exams(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
) -> list[SpeakingExam]:
    return await paginate_query(
        db,
        select(SpeakingExam).where(SpeakingExam.user_id == user_id),
        SpeakingExam.id,
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
            selectinload(ReadingExam.question_answers)
            .selectinload(ReadingExamQuestionAnswer.question)
            .selectinload(ReadingQuestion.question_block),
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
            selectinload(ListeningExam.question_answers)
            .selectinload(ListeningExamQuestionAnswer.question)
            .selectinload(ListeningQuestion.question_block),
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
            selectinload(WritingExam.writing_parts).selectinload(WritingExamPart.part),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_all_user_speaking_exams_with_relations(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[SpeakingExam]:
    stmt = (
        select(SpeakingExam)
        .where(SpeakingExam.user_id == user_id)
        .options(
            selectinload(SpeakingExam.speaking_test),
        )
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_student_attempt_rows(
    db: AsyncSession,
    *,
    user_id: int,
    module: str | None,
    search: str | None,
    test_id: int | None,
    status: str | None,
    ordering: str,
    offset: int,
    limit: int,
) -> list[dict]:
    attempts_sq = _student_attempts_projection(user_id=user_id, module=module).subquery()
    stmt = select(attempts_sq)
    stmt = _student_attempt_filters(
        stmt,
        attempts_sq=attempts_sq,
        search=search,
        test_id=test_id,
        status=status,
    )
    stmt = stmt.order_by(*_student_attempt_order_columns(attempts_sq=attempts_sq, ordering=ordering))
    stmt = stmt.offset(max(0, offset)).limit(max(1, limit))

    rows = (await db.execute(stmt)).mappings().all()
    return [dict(row) for row in rows]


async def count_student_attempt_rows(
    db: AsyncSession,
    *,
    user_id: int,
    module: str | None,
    search: str | None,
    test_id: int | None,
    status: str | None,
) -> int:
    attempts_sq = _student_attempts_projection(user_id=user_id, module=module).subquery()
    stmt = select(func.count()).select_from(attempts_sq)
    stmt = _student_attempt_filters(
        stmt,
        attempts_sq=attempts_sq,
        search=search,
        test_id=test_id,
        status=status,
    )
    count_value = (await db.execute(stmt)).scalar_one()
    return int(count_value or 0)
