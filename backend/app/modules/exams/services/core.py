from __future__ import annotations

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import serialize_page
from app.db.models import (
    AiSummaryModuleEnum,
    FinishReasonEnum,
    ListeningExam,
    ListeningExamQuestionAnswer,
    ListeningQuestion,
    ReadingExam,
    ReadingExamQuestionAnswer,
    ReadingQuestion,
    User,
    WritingExam,
    WritingExamPart,
)
from app.modules.ai_summary.services.core import create_auto_summary
from app.modules.exams import repository
from app.modules.exams.score import reading_band_score
from app.modules.exams.services.validation import (
    validate_listening_submit_payload,
    validate_reading_submit_payload,
    validate_writing_submit_payload,
)
from app.modules.listening.service import question_numbering as listening_question_numbering
from app.modules.reading.service import question_numbering as reading_question_numbering
from app.workers.queue import enqueue_writing_evaluation

logger = logging.getLogger(__name__)

ExamKind = Literal["reading", "listening", "writing"]


def _calculate_elapsed_seconds(started_at: datetime | None, finished_at: datetime | None) -> int | None:
    if not started_at or not finished_at:
        return None
    if started_at.tzinfo is None and finished_at.tzinfo is not None:
        finished_at = finished_at.replace(tzinfo=None)
    elif started_at.tzinfo is not None and finished_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=None)

    elapsed = int((finished_at - started_at).total_seconds())
    return max(elapsed, 0)


def _calculate_time_spent_seconds(
    started_at: datetime | None,
    finished_at: datetime | None,
) -> int | None:
    elapsed_seconds = _calculate_elapsed_seconds(started_at, finished_at)
    if elapsed_seconds is None:
        return None
    return elapsed_seconds


def _resolve_finish_reason(elapsed_seconds: int | None, limit_seconds: int) -> FinishReasonEnum:
    if elapsed_seconds is not None and elapsed_seconds >= limit_seconds:
        return FinishReasonEnum.time_is_up
    return FinishReasonEnum.completed


async def _get_reading_exam_owned(db: AsyncSession, exam_id: int, user_id: int) -> ReadingExam:
    exam = await repository.get_reading_exam_with_relations(db, exam_id)
    if exam is None:
        raise ApiError(code="exam_not_found", message="Reading exam not found", status_code=404)
    if exam.user_id != user_id:
        raise ApiError(code="forbidden", message="Cannot access exam owned by another user", status_code=403)
    return exam


async def _get_listening_exam_owned(db: AsyncSession, exam_id: int, user_id: int) -> ListeningExam:
    exam = await repository.get_listening_exam_with_relations(db, exam_id)
    if exam is None:
        raise ApiError(code="exam_not_found", message="Listening exam not found", status_code=404)
    if exam.user_id != user_id:
        raise ApiError(code="forbidden", message="Cannot access exam owned by another user", status_code=403)
    return exam


async def _get_writing_exam_owned(db: AsyncSession, exam_id: int, user_id: int) -> WritingExam:
    exam = await repository.get_writing_exam_with_relations(db, exam_id)
    if exam is None:
        raise ApiError(code="exam_not_found", message="Writing exam not found", status_code=404)
    if exam.user_id != user_id:
        raise ApiError(code="forbidden", message="Cannot access exam owned by another user", status_code=403)
    return exam


def _serialize_exam_summary(kind: ExamKind, exam: Any) -> dict[str, Any]:
    if kind == "reading":
        test_id = exam.reading_test_id
    elif kind == "listening":
        test_id = exam.listening_test_id
    else:
        test_id = exam.writing_test_id

    return {
        "id": exam.id,
        "kind": kind,
        "user_id": exam.user_id,
        "test_id": test_id,
        "started_at": exam.started_at,
        "finished_at": exam.finished_at,
        "finish_reason": exam.finish_reason.value if exam.finish_reason else None,
    }


async def create_exam(db: AsyncSession, user: User, kind: ExamKind, test_id: int) -> dict[str, Any]:
    if kind == "reading":
        test = await repository.get_reading_test(db, test_id)
        if not test:
            raise ApiError(code="reading_test_not_found", message="Reading test not found", status_code=404)
        exam = ReadingExam(user_id=user.id, reading_test_id=test_id)
    elif kind == "listening":
        test = await repository.get_listening_test(db, test_id)
        if not test:
            raise ApiError(code="listening_test_not_found", message="Listening test not found", status_code=404)
        exam = ListeningExam(user_id=user.id, listening_test_id=test_id)
    else:
        test = await repository.get_writing_test(db, test_id)
        if not test:
            raise ApiError(code="writing_test_not_found", message="Writing test not found", status_code=404)
        exam = WritingExam(user_id=user.id, writing_test_id=test_id)

    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return _serialize_exam_summary(kind, exam)


async def start_exam(db: AsyncSession, user: User, kind: ExamKind, exam_id: int) -> dict[str, Any]:
    if kind == "reading":
        exam = await _get_reading_exam_owned(db, exam_id, user.id)
    elif kind == "listening":
        exam = await _get_listening_exam_owned(db, exam_id, user.id)
    else:
        exam = await _get_writing_exam_owned(db, exam_id, user.id)

    if exam.started_at is None:
        exam.started_at = datetime.now(UTC)
        await db.commit()

    return _serialize_exam_summary(kind, exam)


def _extract_correct_answers_for_question(question: Any) -> list[str]:
    values: list[str] = []
    values.extend([str(option.option_text).strip() for option in question.options if option.is_correct])
    values.extend([str(answer.correct_answers).strip() for answer in question.answers])

    unique: list[str] = []
    for item in values:
        if item and item.lower() not in {x.lower() for x in unique}:
            unique.append(item)
    return unique


def _match_answer(user_answer: str, valid_answers: list[str]) -> bool:
    normalized = user_answer.strip().lower()
    return any(normalized == candidate.strip().lower() for candidate in valid_answers)


def _serialize_existing_reading_or_listening_result(
    kind: Literal["reading", "listening"],
    exam: ReadingExam | ListeningExam,
    numbering: dict[int, int],
) -> dict[str, Any]:
    answers_payload: list[dict[str, Any]] = []
    for answer in exam.question_answers:
        payload = {
            "id": answer.id,
            "question": answer.question_id,
            "user_answer": answer.user_answer,
            "correct_answer": answer.correct_answer,
            "is_correct": answer.is_correct,
            "question_number": numbering.get(answer.question_id),
        }
        answers_payload.append(payload)

    correct_count = sum(1 for item in answers_payload if item["is_correct"])
    return {
        "answers": answers_payload,
        "score": reading_band_score(correct_count),
        "correct_answers": correct_count,
        "time_spent": _calculate_time_spent_seconds(exam.started_at, exam.finished_at),
    }


async def submit_reading_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    answers: list[dict[str, Any]],
) -> dict[str, Any]:
    exam = await _get_reading_exam_owned(db, exam_id, user.id)
    numbering = reading_question_numbering(exam.reading_test)
    time_limit_seconds = int(exam.reading_test.time_limit)

    if exam.finished_at is not None:
        return _serialize_existing_reading_or_listening_result("reading", exam, numbering)

    question_index: dict[int, ReadingQuestion] = {
        question.id: question
        for passage in exam.reading_test.passages
        for block in passage.question_blocks
        for question in block.questions
    }

    normalized_answers = validate_reading_submit_payload(answers, question_index=question_index)

    output_rows: list[dict[str, Any]] = []

    for item in normalized_answers:
        question_id = int(item["id"])
        user_answer = str(item.get("value", ""))
        question = question_index[question_id]

        valid_answers = _extract_correct_answers_for_question(question)
        correct_answer = " or ".join(valid_answers)
        is_correct = _match_answer(user_answer, valid_answers)

        row = await repository.get_reading_exam_answer(
            db,
            exam_id=exam.id,
            question_id=question_id,
        )

        if row is None:
            row = ReadingExamQuestionAnswer(
                exam_id=exam.id,
                question_id=question_id,
                user_answer=user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
            )
            db.add(row)
            await db.flush()
        else:
            row.user_answer = user_answer
            row.correct_answer = correct_answer
            row.is_correct = is_correct

        output_rows.append(
            {
                "id": row.id,
                "question": question_id,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "question_number": numbering.get(question_id),
            }
        )

    finished_at = datetime.now(UTC)
    if exam.started_at is None:
        exam.started_at = finished_at

    elapsed_seconds = _calculate_elapsed_seconds(exam.started_at, finished_at)
    exam.finished_at = finished_at
    exam.finish_reason = _resolve_finish_reason(elapsed_seconds, time_limit_seconds)
    await db.commit()

    try:
        await create_auto_summary(
            db,
            user=user,
            module=AiSummaryModuleEnum.reading,
            exam_id=exam.id,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Failed to create reading AI summary job", extra={"exam_id": exam.id})

    correct_count = sum(1 for item in output_rows if item["is_correct"])
    return {
        "answers": output_rows,
        "score": reading_band_score(correct_count),
        "correct_answers": correct_count,
        "time_spent": _calculate_time_spent_seconds(exam.started_at, exam.finished_at),
    }


async def submit_listening_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    answers: list[dict[str, Any]],
) -> dict[str, Any]:
    exam = await _get_listening_exam_owned(db, exam_id, user.id)
    numbering = listening_question_numbering(exam.listening_test)
    time_limit_seconds = int(exam.listening_test.time_limit)

    if exam.finished_at is not None:
        return _serialize_existing_reading_or_listening_result("listening", exam, numbering)

    question_index: dict[int, ListeningQuestion] = {
        question.id: question
        for part in exam.listening_test.parts
        for block in part.question_blocks
        for question in block.questions
    }

    normalized_answers = validate_listening_submit_payload(answers, question_index=question_index)

    output_rows: list[dict[str, Any]] = []

    for item in normalized_answers:
        question_id = int(item["id"])
        user_answer = str(item.get("value", ""))
        question = question_index[question_id]

        valid_answers = _extract_correct_answers_for_question(question)
        correct_answer = " or ".join(valid_answers)
        is_correct = _match_answer(user_answer, valid_answers)

        row = await repository.get_listening_exam_answer(
            db,
            exam_id=exam.id,
            question_id=question_id,
        )

        if row is None:
            row = ListeningExamQuestionAnswer(
                exam_id=exam.id,
                question_id=question_id,
                user_answer=user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
            )
            db.add(row)
            await db.flush()
        else:
            row.user_answer = user_answer
            row.correct_answer = correct_answer
            row.is_correct = is_correct

        output_rows.append(
            {
                "id": row.id,
                "question": question_id,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "question_number": numbering.get(question_id),
            }
        )

    finished_at = datetime.now(UTC)
    if exam.started_at is None:
        exam.started_at = finished_at

    elapsed_seconds = _calculate_elapsed_seconds(exam.started_at, finished_at)
    exam.finished_at = finished_at
    exam.finish_reason = _resolve_finish_reason(elapsed_seconds, time_limit_seconds)
    await db.commit()

    try:
        await create_auto_summary(
            db,
            user=user,
            module=AiSummaryModuleEnum.listening,
            exam_id=exam.id,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Failed to create listening AI summary job", extra={"exam_id": exam.id})

    correct_count = sum(1 for item in output_rows if item["is_correct"])
    return {
        "answers": output_rows,
        "score": reading_band_score(correct_count),
        "correct_answers": correct_count,
        "time_spent": _calculate_time_spent_seconds(exam.started_at, exam.finished_at),
    }


def _serialize_writing_parts(exam: WritingExam) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for part in exam.writing_parts:
        essay = part.essay or ""
        out.append(
            {
                "id": part.id,
                "exam": part.exam_id,
                "part": part.part_id,
                "essay": part.essay,
                "is_checked": part.is_checked,
                "corrections": part.corrections,
                "score": float(part.score) if isinstance(part.score, Decimal) else part.score,
                "word_count": len(essay.split()) if essay else 0,
            }
        )
    return out


async def submit_writing_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    parts_payload: list[dict[str, Any]],
) -> dict[str, Any]:
    exam = await _get_writing_exam_owned(db, exam_id, user.id)
    time_limit_seconds = int(exam.writing_test.time_limit)

    if exam.finished_at is not None:
        return {
            "answers": _serialize_writing_parts(exam),
            "score": None,
            "correct_answers": None,
            "time_spent": _calculate_time_spent_seconds(exam.started_at, exam.finished_at),
        }

    part_index = {part.id: part for part in exam.writing_test.writing_parts}
    normalized_parts = validate_writing_submit_payload(parts_payload, part_ids=set(part_index.keys()))

    exam_part_ids: list[int] = []
    for item in normalized_parts:
        part_id = int(item["part_id"])
        essay = str(item.get("essay", ""))

        existing = await repository.get_writing_exam_part(
            db,
            exam_id=exam.id,
            part_id=part_id,
        )

        if existing is None:
            existing = WritingExamPart(exam_id=exam.id, part_id=part_id, essay=essay)
            db.add(existing)
            await db.flush()
        else:
            existing.essay = essay

        if not existing.is_checked:
            existing.score = None
            existing.corrections = "AI evaluation is pending. Please retry shortly to see detailed feedback."

        exam_part_ids.append(existing.id)

    finished_at = datetime.now(UTC)
    if exam.started_at is None:
        exam.started_at = finished_at

    elapsed_seconds = _calculate_elapsed_seconds(exam.started_at, finished_at)
    exam.finished_at = finished_at
    exam.finish_reason = _resolve_finish_reason(elapsed_seconds, time_limit_seconds)
    await db.commit()
    await db.refresh(exam)

    try:
        await create_auto_summary(
            db,
            user=user,
            module=AiSummaryModuleEnum.writing,
            exam_id=exam.id,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Failed to create writing AI summary job", extra={"exam_id": exam.id})

    for exam_part_id in exam_part_ids:
        try:
            await enqueue_writing_evaluation(exam_part_id)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Failed to enqueue writing AI evaluation",
                extra={"exam_id": exam.id, "exam_part_id": exam_part_id},
            )

    return {
        "answers": _serialize_writing_parts(exam),
        "score": None,
        "correct_answers": None,
        "time_spent": _calculate_time_spent_seconds(exam.started_at, exam.finished_at),
    }


async def get_my_exams(
    db: AsyncSession,
    user: User,
    reading_offset: int,
    listening_offset: int,
    writing_offset: int,
    limit: int,
) -> dict[str, Any]:
    reading_rows = await repository.list_user_reading_exams(
        db,
        user_id=user.id,
        offset=reading_offset,
        limit=limit,
    )
    listening_rows = await repository.list_user_listening_exams(
        db,
        user_id=user.id,
        offset=listening_offset,
        limit=limit,
    )
    writing_rows = await repository.list_user_writing_exams(
        db,
        user_id=user.id,
        offset=writing_offset,
        limit=limit,
    )

    return {
        "reading": serialize_page(
            reading_rows,
            serializer=lambda exam: _serialize_exam_summary("reading", exam),
            limit=limit,
            offset=reading_offset,
        ).model_dump(),
        "listening": serialize_page(
            listening_rows,
            serializer=lambda exam: _serialize_exam_summary("listening", exam),
            limit=limit,
            offset=listening_offset,
        ).model_dump(),
        "writing": serialize_page(
            writing_rows,
            serializer=lambda exam: _serialize_exam_summary("writing", exam),
            limit=limit,
            offset=writing_offset,
        ).model_dump(),
    }
