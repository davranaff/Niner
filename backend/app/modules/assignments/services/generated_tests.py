from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.db.models import (
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionAnswer,
    ListeningQuestionBlock,
    ListeningQuestionOption,
    ListeningTest,
    ProgressTestTypeEnum,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    SpeakingPart,
    SpeakingQuestion,
    SpeakingTest,
    TrainingAssignment,
    WritingPart,
    WritingTest,
)
from app.modules.assignments import repository
from app.modules.exams import repository as exams_repository

TARGET_OBJECTIVE_QUESTION_COUNT = 10
GENERATION_STATUS_IDLE = "idle"
GENERATION_STATUS_QUEUED = "queued"
GENERATION_STATUS_PROCESSING = "processing"
GENERATION_STATUS_READY = "ready"
GENERATION_STATUS_FAILED = "failed"
ACTIVE_GENERATION_STATUSES = {GENERATION_STATUS_QUEUED, GENERATION_STATUS_PROCESSING}


def _safe_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    text = str(value or "").strip()
    if not text or not text.isdigit():
        return None
    return int(text)


def _extract_int_list(payload: dict[str, Any], key: str) -> list[int]:
    raw = payload.get(key)
    if not isinstance(raw, list):
        return []
    values: list[int] = []
    for item in raw:
        parsed = _safe_int(item)
        if parsed is not None:
            values.append(parsed)
    return values


def _assignment_skill_label(assignment: TrainingAssignment) -> str | None:
    if assignment.skill_gap is not None and str(assignment.skill_gap.label or "").strip():
        return str(assignment.skill_gap.label).strip()
    if assignment.source_error_item is not None and str(assignment.source_error_item.skill_label or "").strip():
        return str(assignment.source_error_item.skill_label).strip()
    return None


def serialize_generated_test(assignment: TrainingAssignment) -> dict[str, Any]:
    return {
        "status": str(assignment.generation_status or GENERATION_STATUS_IDLE),
        "progress_percent": max(0, min(100, int(assignment.generation_progress or 0))),
        "test_id": assignment.generated_test_id,
        "requested_at": assignment.generation_requested_at,
        "started_at": assignment.generation_started_at,
        "generated_at": assignment.generated_at,
        "error": assignment.generation_error,
    }


def serialize_generated_test_origin(assignment: TrainingAssignment) -> dict[str, Any] | None:
    if assignment.generated_test_id is None:
        return None

    return {
        "kind": "assignment_generated",
        "assignment_id": assignment.id,
        "assignment_title": assignment.title,
        "skill_label": _assignment_skill_label(assignment),
        "source_exam_kind": assignment.source_exam_kind,
        "source_exam_id": assignment.source_exam_id,
        "generated_at": assignment.generated_at,
    }


async def get_generated_test_origin_map(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    test_ids: list[int],
) -> dict[int, dict[str, Any]]:
    rows = await repository.list_generated_assignments_for_tests(
        db,
        user_id=user_id,
        module=module,
        test_ids=test_ids,
    )
    origin_by_test_id: dict[int, dict[str, Any]] = {}
    for assignment in rows:
        test_id = _safe_int(assignment.generated_test_id)
        if test_id is None or test_id in origin_by_test_id:
            continue
        payload = serialize_generated_test_origin(assignment)
        if payload is not None:
            origin_by_test_id[test_id] = payload
    return origin_by_test_id


async def get_generated_test_origin(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    test_id: int,
) -> dict[str, Any] | None:
    payload = await get_generated_test_origin_map(
        db,
        user_id=user_id,
        module=module,
        test_ids=[test_id],
    )
    return payload.get(test_id)


async def _set_generation_state(
    db: AsyncSession,
    assignment: TrainingAssignment,
    *,
    status: str,
    progress: int,
    error: str | None = None,
    generated_test_id: int | None = None,
) -> None:
    now = datetime.now(UTC)
    assignment.generation_status = status
    assignment.generation_progress = max(0, min(100, int(progress)))
    assignment.generation_error = error

    if status == GENERATION_STATUS_PROCESSING and assignment.generation_started_at is None:
        assignment.generation_started_at = now

    if status == GENERATION_STATUS_READY:
        assignment.generated_test_id = generated_test_id
        assignment.generated_at = now
        if assignment.generation_started_at is None:
            assignment.generation_started_at = now
    elif generated_test_id is not None:
        assignment.generated_test_id = generated_test_id

    await db.flush()


def _reading_time_limit(question_count: int) -> int:
    return max(10 * 60, min(30 * 60, question_count * 3 * 60))


def _listening_time_limit(question_count: int) -> int:
    return max(10 * 60, min(30 * 60, question_count * 3 * 60))


def _assignment_payload(assignment: TrainingAssignment) -> dict[str, Any]:
    return dict(assignment.payload or {})


def _objective_target_question_count(assignment: TrainingAssignment) -> int:
    target_count = _safe_int(_assignment_payload(assignment).get("target_question_count"))
    if target_count is None:
        return TARGET_OBJECTIVE_QUESTION_COUNT
    return max(1, min(20, target_count))


def _assignment_skill_key(assignment: TrainingAssignment) -> str:
    payload = _assignment_payload(assignment)
    for value in (
        payload.get("skill_key"),
        getattr(getattr(assignment, "skill_gap", None), "skill_key", None),
        getattr(getattr(assignment, "source_error_item", None), "skill_key", None),
    ):
        text = str(value or "").strip().lower()
        if text:
            return text
    return ""


def _assignment_objective_block_type(assignment: TrainingAssignment) -> str | None:
    payload = _assignment_payload(assignment)
    raw_block_type = str(payload.get("block_type") or "").strip().lower()
    if raw_block_type:
        return raw_block_type

    skill_key = _assignment_skill_key(assignment)
    if ":" in skill_key:
        _, _, suffix = skill_key.partition(":")
        normalized = suffix.strip().lower()
        if normalized:
            return normalized

    source_details = dict(getattr(getattr(assignment, "source_error_item", None), "details", {}) or {})
    normalized = str(source_details.get("block_type") or "").strip().lower()
    return normalized or None


async def _list_generated_test_ids(
    db: AsyncSession,
    *,
    module: ProgressTestTypeEnum,
) -> set[int]:
    stmt = select(TrainingAssignment.generated_test_id).where(
        TrainingAssignment.module == module,
        TrainingAssignment.generated_test_id.is_not(None),
    )
    rows = (await db.execute(stmt)).scalars().all()
    return {int(value) for value in rows if value is not None}


async def _list_active_reading_donor_tests(
    db: AsyncSession,
    *,
    exclude_test_ids: Iterable[int],
) -> list[ReadingTest]:
    excluded_ids = sorted({int(test_id) for test_id in exclude_test_ids})
    stmt = (
        select(ReadingTest)
        .where(ReadingTest.is_active.is_(True))
        .options(
            selectinload(ReadingTest.passages)
            .selectinload(ReadingPassage.question_blocks)
            .selectinload(ReadingQuestionBlock.questions)
            .selectinload(ReadingQuestion.options),
            selectinload(ReadingTest.passages)
            .selectinload(ReadingPassage.question_blocks)
            .selectinload(ReadingQuestionBlock.questions)
            .selectinload(ReadingQuestion.answers),
        )
        .order_by(ReadingTest.id.desc())
    )
    if excluded_ids:
        stmt = stmt.where(ReadingTest.id.notin_(excluded_ids))
    return list((await db.execute(stmt)).scalars().all())


async def _list_active_listening_donor_tests(
    db: AsyncSession,
    *,
    source_voice_url: str | None,
    exclude_test_ids: Iterable[int],
) -> list[ListeningTest]:
    excluded_ids = sorted({int(test_id) for test_id in exclude_test_ids})
    stmt = (
        select(ListeningTest)
        .where(ListeningTest.is_active.is_(True))
        .options(
            selectinload(ListeningTest.parts)
            .selectinload(ListeningPart.question_blocks)
            .selectinload(ListeningQuestionBlock.questions)
            .selectinload(ListeningQuestion.options),
            selectinload(ListeningTest.parts)
            .selectinload(ListeningPart.question_blocks)
            .selectinload(ListeningQuestionBlock.questions)
            .selectinload(ListeningQuestion.answers),
        )
        .order_by(ListeningTest.id.desc())
    )

    if source_voice_url is None:
        stmt = stmt.where(ListeningTest.voice_url.is_(None))
    else:
        stmt = stmt.where(ListeningTest.voice_url == source_voice_url)

    if excluded_ids:
        stmt = stmt.where(ListeningTest.id.notin_(excluded_ids))
    return list((await db.execute(stmt)).scalars().all())


def _iter_reading_question_contexts(
    test: ReadingTest,
) -> Iterable[tuple[ReadingPassage, ReadingQuestionBlock, ReadingQuestion]]:
    for passage in sorted(test.passages, key=lambda item: item.passage_number):
        for block in sorted(passage.question_blocks, key=lambda item: item.order):
            for question in sorted(block.questions, key=lambda item: item.order):
                yield passage, block, question


def _iter_listening_question_contexts(
    test: ListeningTest,
) -> Iterable[tuple[ListeningPart, ListeningQuestionBlock, ListeningQuestion]]:
    for part in sorted(test.parts, key=lambda item: item.order):
        for block in sorted(part.question_blocks, key=lambda item: item.order):
            for question in sorted(block.questions, key=lambda item: item.order):
                yield part, block, question


def _extend_reading_selection(
    selected: list[tuple[ReadingPassage, ReadingQuestionBlock, ReadingQuestion]],
    selected_ids: set[int],
    *,
    test: ReadingTest,
    target_block_type: str,
    limit: int,
    include_question_ids: set[int] | None = None,
    include_block_ids: set[int] | None = None,
) -> None:
    if len(selected) >= limit:
        return

    normalized_target = target_block_type.strip().lower()
    for passage, block, question in _iter_reading_question_contexts(test):
        if len(selected) >= limit:
            return
        if str(block.block_type or "").strip().lower() != normalized_target:
            continue
        if include_question_ids is not None and question.id not in include_question_ids:
            continue
        if include_block_ids is not None and block.id not in include_block_ids:
            continue
        if question.id in selected_ids:
            continue
        selected.append((passage, block, question))
        selected_ids.add(int(question.id))


def _extend_listening_selection(
    selected: list[tuple[ListeningPart, ListeningQuestionBlock, ListeningQuestion]],
    selected_ids: set[int],
    *,
    test: ListeningTest,
    target_block_type: str,
    limit: int,
    include_question_ids: set[int] | None = None,
    include_block_ids: set[int] | None = None,
) -> None:
    if len(selected) >= limit:
        return

    normalized_target = target_block_type.strip().lower()
    for part, block, question in _iter_listening_question_contexts(test):
        if len(selected) >= limit:
            return
        if str(block.block_type or "").strip().lower() != normalized_target:
            continue
        if include_question_ids is not None and question.id not in include_question_ids:
            continue
        if include_block_ids is not None and block.id not in include_block_ids:
            continue
        if question.id in selected_ids:
            continue
        selected.append((part, block, question))
        selected_ids.add(int(question.id))


def _infer_reading_block_type(
    test: ReadingTest,
    *,
    source_question_ids: set[int],
    fallback: str | None,
) -> str | None:
    normalized_fallback = str(fallback or "").strip().lower()
    if normalized_fallback:
        return normalized_fallback

    for _, block, question in _iter_reading_question_contexts(test):
        if question.id in source_question_ids:
            normalized = str(block.block_type or "").strip().lower()
            if normalized:
                return normalized
    return None


def _infer_listening_block_type(
    test: ListeningTest,
    *,
    source_question_ids: set[int],
    fallback: str | None,
) -> str | None:
    normalized_fallback = str(fallback or "").strip().lower()
    if normalized_fallback:
        return normalized_fallback

    for _, block, question in _iter_listening_question_contexts(test):
        if question.id in source_question_ids:
            normalized = str(block.block_type or "").strip().lower()
            if normalized:
                return normalized
    return None


def _clone_reading_answers(question: ReadingQuestion) -> list[ReadingQuestionAnswer]:
    return [
        ReadingQuestionAnswer(correct_answers=answer.correct_answers)
        for answer in sorted(question.answers, key=lambda item: item.id)
    ]


def _clone_reading_options(question: ReadingQuestion) -> list[ReadingQuestionOption]:
    return [
        ReadingQuestionOption(
            option_text=option.option_text,
            is_correct=option.is_correct,
            order=option.order,
        )
        for option in sorted(question.options, key=lambda item: item.order)
    ]


async def _create_reading_generated_test(db: AsyncSession, assignment: TrainingAssignment) -> int:
    exam = await exams_repository.get_reading_exam_with_relations(db, assignment.source_exam_id)
    if exam is None or exam.reading_test is None:
        raise ApiError(code="assignment_source_missing", message="Reading source exam not found", status_code=404)

    source_question_ids = set(_extract_int_list(_assignment_payload(assignment), "source_question_ids"))
    if not source_question_ids and assignment.source_error_item is not None:
        question_id = _safe_int((assignment.source_error_item.details or {}).get("question_id"))
        if question_id is not None:
            source_question_ids.add(question_id)
    if not source_question_ids:
        raise ApiError(code="assignment_source_missing", message="No source reading questions found", status_code=400)

    target_question_count = _objective_target_question_count(assignment)
    target_block_type = _infer_reading_block_type(
        exam.reading_test,
        source_question_ids=source_question_ids,
        fallback=_assignment_objective_block_type(assignment),
    )
    if not target_block_type:
        raise ApiError(code="assignment_source_missing", message="Reading weak-area block type not found", status_code=400)

    skill_label = _assignment_skill_label(assignment) or "weak area"
    generated_test = ReadingTest(
        title=f"Weak-area Reading Drill: {skill_label}",
        description=(
            f"Generated from Reading exam #{assignment.source_exam_id}. "
            f"Focus on {skill_label} with up to {target_question_count} targeted items of the same question type."
        ),
        time_limit=_reading_time_limit(len(source_question_ids)),
        total_questions=0,
        is_active=True,
    )
    db.add(generated_test)
    await db.flush()

    selected_questions: list[tuple[ReadingPassage, ReadingQuestionBlock, ReadingQuestion]] = []
    selected_question_ids: set[int] = set()

    source_block_ids = {
        int(block.id)
        for _, block, question in _iter_reading_question_contexts(exam.reading_test)
        if question.id in source_question_ids and str(block.block_type or "").strip().lower() == target_block_type
    }

    _extend_reading_selection(
        selected_questions,
        selected_question_ids,
        test=exam.reading_test,
        target_block_type=target_block_type,
        limit=target_question_count,
        include_question_ids=source_question_ids,
    )
    _extend_reading_selection(
        selected_questions,
        selected_question_ids,
        test=exam.reading_test,
        target_block_type=target_block_type,
        limit=target_question_count,
        include_block_ids=source_block_ids,
    )
    _extend_reading_selection(
        selected_questions,
        selected_question_ids,
        test=exam.reading_test,
        target_block_type=target_block_type,
        limit=target_question_count,
    )

    donor_test_ids = await _list_generated_test_ids(db, module=ProgressTestTypeEnum.reading)
    donor_test_ids.add(int(exam.reading_test.id))
    donor_tests = await _list_active_reading_donor_tests(db, exclude_test_ids=donor_test_ids)
    for donor_test in donor_tests:
        _extend_reading_selection(
            selected_questions,
            selected_question_ids,
            test=donor_test,
            target_block_type=target_block_type,
            limit=target_question_count,
        )
        if len(selected_questions) >= target_question_count:
            break

    total_questions = 0
    passage_order = 1
    generated_passages: dict[int, ReadingPassage] = {}
    generated_blocks: dict[int, ReadingQuestionBlock] = {}
    block_order_by_passage_id: dict[int, int] = {}
    question_order_by_block_id: dict[int, int] = {}

    for source_passage, source_block, source_question in selected_questions:
        generated_passage = generated_passages.get(source_passage.id)
        if generated_passage is None:
            generated_passage = ReadingPassage(
                test_id=generated_test.id,
                title=source_passage.title,
                content=source_passage.content,
                passage_number=passage_order,
            )
            db.add(generated_passage)
            await db.flush()
            generated_passages[source_passage.id] = generated_passage
            block_order_by_passage_id[source_passage.id] = 1
            passage_order += 1

        generated_block = generated_blocks.get(source_block.id)
        if generated_block is None:
            generated_block = ReadingQuestionBlock(
                passage_id=generated_passage.id,
                title=source_block.title,
                description=source_block.description,
                block_type=source_block.block_type,
                order=block_order_by_passage_id[source_passage.id],
                question_heading=source_block.question_heading,
                list_of_headings=source_block.list_of_headings,
                table_completion=source_block.table_completion,
                flow_chart_completion=source_block.flow_chart_completion,
                table_json=source_block.table_json,
                parse_status=source_block.parse_status,
                parse_error=None,
            )
            db.add(generated_block)
            await db.flush()
            generated_blocks[source_block.id] = generated_block
            question_order_by_block_id[source_block.id] = 1
            block_order_by_passage_id[source_passage.id] += 1

        generated_question = ReadingQuestion(
            question_block_id=generated_block.id,
            question_text=source_question.question_text,
            order=question_order_by_block_id[source_block.id],
        )
        db.add(generated_question)
        await db.flush()
        question_order_by_block_id[source_block.id] += 1

        for answer in _clone_reading_answers(source_question):
            answer.question_id = generated_question.id
            db.add(answer)
        for option in _clone_reading_options(source_question):
            option.question_id = generated_question.id
            db.add(option)
        total_questions += 1

    if total_questions == 0:
        raise ApiError(code="assignment_source_missing", message="Reading drill has no questions", status_code=400)

    generated_test.total_questions = total_questions
    generated_test.time_limit = _reading_time_limit(total_questions)
    generated_test.description = (
        f"Generated from Reading exam #{assignment.source_exam_id}. "
        f"Contains {total_questions} targeted {skill_label} items using the same weak question type."
    )
    await db.flush()
    return int(generated_test.id)


def _clone_listening_answers(question: ListeningQuestion) -> list[ListeningQuestionAnswer]:
    return [
        ListeningQuestionAnswer(correct_answers=answer.correct_answers)
        for answer in sorted(question.answers, key=lambda item: item.id)
    ]


def _clone_listening_options(question: ListeningQuestion) -> list[ListeningQuestionOption]:
    return [
        ListeningQuestionOption(
            option_text=option.option_text,
            is_correct=option.is_correct,
            order=option.order,
        )
        for option in sorted(question.options, key=lambda item: item.order)
    ]


async def _create_listening_generated_test(db: AsyncSession, assignment: TrainingAssignment) -> int:
    exam = await exams_repository.get_listening_exam_with_relations(db, assignment.source_exam_id)
    if exam is None or exam.listening_test is None:
        raise ApiError(code="assignment_source_missing", message="Listening source exam not found", status_code=404)

    source_question_ids = set(_extract_int_list(_assignment_payload(assignment), "source_question_ids"))
    if not source_question_ids and assignment.source_error_item is not None:
        question_id = _safe_int((assignment.source_error_item.details or {}).get("question_id"))
        if question_id is not None:
            source_question_ids.add(question_id)
    if not source_question_ids:
        raise ApiError(code="assignment_source_missing", message="No source listening questions found", status_code=400)

    target_question_count = _objective_target_question_count(assignment)
    target_block_type = _infer_listening_block_type(
        exam.listening_test,
        source_question_ids=source_question_ids,
        fallback=_assignment_objective_block_type(assignment),
    )
    if not target_block_type:
        raise ApiError(code="assignment_source_missing", message="Listening weak-area block type not found", status_code=400)

    skill_label = _assignment_skill_label(assignment) or "weak area"
    generated_test = ListeningTest(
        title=f"Weak-area Listening Drill: {skill_label}",
        description=(
            f"Generated from Listening exam #{assignment.source_exam_id}. "
            f"Replay the original audio and focus on up to {target_question_count} targeted {skill_label} items."
        ),
        time_limit=_listening_time_limit(len(source_question_ids)),
        total_questions=0,
        is_active=True,
        voice_url=exam.listening_test.voice_url,
    )
    db.add(generated_test)
    await db.flush()

    selected_questions: list[tuple[ListeningPart, ListeningQuestionBlock, ListeningQuestion]] = []
    selected_question_ids: set[int] = set()

    source_block_ids = {
        int(block.id)
        for _, block, question in _iter_listening_question_contexts(exam.listening_test)
        if question.id in source_question_ids and str(block.block_type or "").strip().lower() == target_block_type
    }

    _extend_listening_selection(
        selected_questions,
        selected_question_ids,
        test=exam.listening_test,
        target_block_type=target_block_type,
        limit=target_question_count,
        include_question_ids=source_question_ids,
    )
    _extend_listening_selection(
        selected_questions,
        selected_question_ids,
        test=exam.listening_test,
        target_block_type=target_block_type,
        limit=target_question_count,
        include_block_ids=source_block_ids,
    )
    _extend_listening_selection(
        selected_questions,
        selected_question_ids,
        test=exam.listening_test,
        target_block_type=target_block_type,
        limit=target_question_count,
    )

    donor_test_ids = await _list_generated_test_ids(db, module=ProgressTestTypeEnum.listening)
    donor_test_ids.add(int(exam.listening_test.id))
    donor_tests = await _list_active_listening_donor_tests(
        db,
        source_voice_url=exam.listening_test.voice_url,
        exclude_test_ids=donor_test_ids,
    )
    for donor_test in donor_tests:
        _extend_listening_selection(
            selected_questions,
            selected_question_ids,
            test=donor_test,
            target_block_type=target_block_type,
            limit=target_question_count,
        )
        if len(selected_questions) >= target_question_count:
            break

    total_questions = 0
    part_order = 1
    generated_parts: dict[int, ListeningPart] = {}
    generated_blocks: dict[int, ListeningQuestionBlock] = {}
    block_order_by_part_id: dict[int, int] = {}
    question_order_by_block_id: dict[int, int] = {}

    for source_part, source_block, source_question in selected_questions:
        generated_part = generated_parts.get(source_part.id)
        if generated_part is None:
            generated_part = ListeningPart(
                test_id=generated_test.id,
                title=source_part.title,
                order=part_order,
            )
            db.add(generated_part)
            await db.flush()
            generated_parts[source_part.id] = generated_part
            block_order_by_part_id[source_part.id] = 1
            part_order += 1

        generated_block = generated_blocks.get(source_block.id)
        if generated_block is None:
            generated_block = ListeningQuestionBlock(
                part_id=generated_part.id,
                title=source_block.title,
                description=source_block.description,
                block_type=source_block.block_type,
                order=block_order_by_part_id[source_part.id],
                table_completion=source_block.table_completion,
                table_json=source_block.table_json,
                parse_status=source_block.parse_status,
                parse_error=None,
            )
            db.add(generated_block)
            await db.flush()
            generated_blocks[source_block.id] = generated_block
            question_order_by_block_id[source_block.id] = 1
            block_order_by_part_id[source_part.id] += 1

        generated_question = ListeningQuestion(
            question_block_id=generated_block.id,
            question_text=source_question.question_text,
            order=question_order_by_block_id[source_block.id],
        )
        db.add(generated_question)
        await db.flush()
        question_order_by_block_id[source_block.id] += 1

        for answer in _clone_listening_answers(source_question):
            answer.question_id = generated_question.id
            db.add(answer)
        for option in _clone_listening_options(source_question):
            option.question_id = generated_question.id
            db.add(option)
        total_questions += 1

    if total_questions == 0:
        raise ApiError(code="assignment_source_missing", message="Listening drill has no questions", status_code=400)

    generated_test.total_questions = total_questions
    generated_test.time_limit = _listening_time_limit(total_questions)
    generated_test.description = (
        f"Generated from Listening exam #{assignment.source_exam_id}. "
        f"Contains {total_questions} targeted {skill_label} items with compatible audio context."
    )
    await db.flush()
    return int(generated_test.id)


def _writing_part_time_limit(order: int) -> int:
    return 40 * 60 if int(order or 0) == 2 else 20 * 60


async def _create_writing_generated_test(db: AsyncSession, assignment: TrainingAssignment) -> int:
    exam = await exams_repository.get_writing_exam_with_relations(db, assignment.source_exam_id)
    if exam is None or exam.writing_test is None:
        raise ApiError(code="assignment_source_missing", message="Writing source exam not found", status_code=404)

    source_part_ids = set(_extract_int_list(dict(assignment.payload or {}), "source_part_ids"))
    if not source_part_ids and assignment.source_error_item is not None:
        part_id = _safe_int((assignment.source_error_item.details or {}).get("part_id"))
        if part_id is not None:
            source_part_ids.add(part_id)
    if not source_part_ids:
        source_part_ids = {int(part.id) for part in exam.writing_test.writing_parts}

    selected_parts = [
        part for part in sorted(exam.writing_test.writing_parts, key=lambda item: item.order) if part.id in source_part_ids
    ]
    if not selected_parts:
        raise ApiError(code="assignment_source_missing", message="Writing drill has no tasks", status_code=400)

    skill_label = _assignment_skill_label(assignment) or "writing recovery"
    generated_test = WritingTest(
        title=f"Weak-area Writing Drill: {skill_label}",
        description=(
            f"Generated from Writing exam #{assignment.source_exam_id}. "
            f"Rewrite the task with explicit focus on {skill_label}."
        ),
        time_limit=sum(_writing_part_time_limit(part.order) for part in selected_parts),
        is_active=True,
    )
    db.add(generated_test)
    await db.flush()

    for part in selected_parts:
        practice_brief = "\n\n".join(
            [
                f"Original IELTS task {part.order}:",
                part.task,
                f"Focus for this drill: {skill_label}.",
                "Write a stronger version than your previous attempt and correct the weakness explicitly.",
            ]
        )
        generated_part = WritingPart(
            test_id=generated_test.id,
            order=part.order,
            task=practice_brief,
            image_url=part.image_url,
            file_urls=list(part.file_urls or []),
        )
        db.add(generated_part)

    await db.flush()
    return int(generated_test.id)


def _speaking_prompt_bank(criterion: str, anchor_prompt: str, evidence: list[str]) -> list[dict[str, Any]]:
    evidence_text = "; ".join(item for item in evidence if item) or "your previous exam evidence"
    if criterion == "lexical":
        return [
            {
                "title": "Part 1 lexical warm-up",
                "guidance": "Push for variety, precision, and topic-specific vocabulary.",
                "questions": [
                    {
                        "code": "weak-part1-q1",
                        "label": "Vocabulary stretch",
                        "prompt": anchor_prompt or "Describe a memorable place in your city using precise vocabulary.",
                        "seconds": 45,
                        "follow_ups": ["Use at least two less common descriptive words.", "Give one specific example."],
                    }
                ],
            },
            {
                "title": "Part 2 lexical long turn",
                "guidance": "Sustain a two-minute answer with clear lexical range.",
                "questions": [
                    {
                        "code": "weak-part2-q1",
                        "label": "Topic development",
                        "prompt": "Describe a challenge you overcame and explain how it changed your thinking.",
                        "seconds": 120,
                        "cue_card": {
                            "topic": "Challenge and growth",
                            "prompt": "Talk about a challenge you overcame.",
                            "bullet_points": [
                                "what the challenge was",
                                "what made it difficult",
                                "what steps you took",
                                "what you learned from it",
                            ],
                            "note_prompt": "Use topic-specific and precise vocabulary.",
                            "preparation_seconds": 60,
                            "target_answer_seconds": 120,
                        },
                    }
                ],
            },
            {
                "title": "Part 3 lexical discussion",
                "guidance": "Expand ideas with topic-specific vocabulary instead of repetition.",
                "questions": [
                    {
                        "code": "weak-part3-q1",
                        "label": "Extended discussion",
                        "prompt": f"How can people improve their expressive vocabulary in spoken English? Reference: {evidence_text}.",
                        "seconds": 75,
                        "follow_ups": ["What habits help most?", "Why do many learners repeat simple words?"],
                    }
                ],
            },
        ]

    if criterion == "grammar":
        return [
            {
                "title": "Part 1 grammar warm-up",
                "guidance": "Aim for accurate tense control and varied sentence forms.",
                "questions": [
                    {
                        "code": "weak-part1-q1",
                        "label": "Grammar control",
                        "prompt": anchor_prompt or "Tell me about a routine you used to have but changed recently.",
                        "seconds": 45,
                        "follow_ups": ["Explain why it changed.", "Compare the old routine with the new one."],
                    }
                ],
            },
            {
                "title": "Part 2 grammar long turn",
                "guidance": "Use complex but controlled sentences in the long turn.",
                "questions": [
                    {
                        "code": "weak-part2-q1",
                        "label": "Narrative control",
                        "prompt": "Describe a time when you had to solve a difficult problem quickly.",
                        "seconds": 120,
                        "cue_card": {
                            "topic": "Problem solving",
                            "prompt": "Describe a time when you solved a difficult problem quickly.",
                            "bullet_points": [
                                "what the problem was",
                                "why time was limited",
                                "what decision you made",
                                "what the final result was",
                            ],
                            "note_prompt": "Show control over tense shifts and longer sentences.",
                            "preparation_seconds": 60,
                            "target_answer_seconds": 120,
                        },
                    }
                ],
            },
            {
                "title": "Part 3 grammar discussion",
                "guidance": "Develop ideas with conditionals, comparison, and cause-effect structures.",
                "questions": [
                    {
                        "code": "weak-part3-q1",
                        "label": "Structured discussion",
                        "prompt": "Why do people make avoidable mistakes when they speak under pressure?",
                        "seconds": 75,
                        "follow_ups": ["How could schools reduce this?", "Would technology help?"],
                    }
                ],
            },
        ]

    if criterion == "pronunciation":
        return [
            {
                "title": "Part 1 pronunciation warm-up",
                "guidance": "Prioritize stress, chunking, and clear endings.",
                "questions": [
                    {
                        "code": "weak-part1-q1",
                        "label": "Clear delivery",
                        "prompt": anchor_prompt or "Describe a hobby that helps you relax after a long day.",
                        "seconds": 45,
                        "follow_ups": ["What part of it do you enjoy most?", "When do you usually do it?"],
                    }
                ],
            },
            {
                "title": "Part 2 pronunciation long turn",
                "guidance": "Keep a steady rhythm and clear sentence endings in the long turn.",
                "questions": [
                    {
                        "code": "weak-part2-q1",
                        "label": "Pronunciation focus",
                        "prompt": "Describe a person whose communication style you admire.",
                        "seconds": 120,
                        "cue_card": {
                            "topic": "Communication style",
                            "prompt": "Describe a person whose communication style you admire.",
                            "bullet_points": [
                                "who the person is",
                                "how they speak",
                                "why their style is effective",
                                "what you learned from them",
                            ],
                            "note_prompt": "Speak with clear pauses, stress, and endings.",
                            "preparation_seconds": 60,
                            "target_answer_seconds": 120,
                        },
                    }
                ],
            },
            {
                "title": "Part 3 pronunciation discussion",
                "guidance": "Maintain clarity while explaining longer ideas.",
                "questions": [
                    {
                        "code": "weak-part3-q1",
                        "label": "Clarity under pressure",
                        "prompt": "Why do some people sound less clear when they are nervous?",
                        "seconds": 75,
                        "follow_ups": ["How can they improve?", "Does practice always help?"],
                    }
                ],
            },
        ]

    return [
        {
            "title": "Part 1 fluency warm-up",
            "guidance": "Keep ideas moving with fewer pauses and stronger linking.",
            "questions": [
                {
                    "code": "weak-part1-q1",
                    "label": "Flow and development",
                    "prompt": anchor_prompt or "Tell me about an activity you enjoy doing with other people.",
                    "seconds": 45,
                    "follow_ups": ["Why do you enjoy it?", "How often do you do it?"],
                }
            ],
        },
        {
            "title": "Part 2 fluency long turn",
            "guidance": "Sustain the answer smoothly for two minutes with examples.",
            "questions": [
                {
                    "code": "weak-part2-q1",
                    "label": "Extended response",
                    "prompt": "Describe an experience that taught you something important.",
                    "seconds": 120,
                    "cue_card": {
                        "topic": "Learning from experience",
                        "prompt": "Describe an experience that taught you something important.",
                        "bullet_points": [
                            "what happened",
                            "why it was important",
                            "what you learned",
                            "how it changed you",
                        ],
                        "note_prompt": "Keep your response connected and well-paced.",
                        "preparation_seconds": 60,
                        "target_answer_seconds": 120,
                    },
                }
            ],
        },
        {
            "title": "Part 3 fluency discussion",
            "guidance": "Develop answers with linking and quick idea extension.",
            "questions": [
                {
                    "code": "weak-part3-q1",
                    "label": "Discussion depth",
                    "prompt": f"Why do some speakers lose fluency when the topic becomes abstract? Reference: {evidence_text}.",
                    "seconds": 75,
                    "follow_ups": ["How can they train for this?", "Do debates help?"],
                }
            ],
        },
    ]


async def _create_speaking_generated_test(db: AsyncSession, assignment: TrainingAssignment) -> int:
    exam = await exams_repository.get_speaking_exam_with_relations(db, assignment.source_exam_id)
    if exam is None or exam.speaking_test is None:
        raise ApiError(code="assignment_source_missing", message="Speaking source exam not found", status_code=404)

    payload = dict(assignment.payload or {})
    criterion = str(payload.get("criterion") or "fluency").strip().lower() or "fluency"
    evidence_items = payload.get("evidence")
    evidence = [str(item).strip() for item in evidence_items if str(item).strip()] if isinstance(evidence_items, list) else []

    anchor_prompt = ""
    for part in sorted(exam.speaking_test.parts, key=lambda item: item.part_order):
        questions = sorted(part.questions, key=lambda item: item.question_order)
        if questions:
            anchor_prompt = questions[0].prompt
            break

    skill_label = _assignment_skill_label(assignment) or "Speaking recovery"
    slug = f"weak-area-{assignment.id}-{int(datetime.now(UTC).timestamp())}"
    generated_test = SpeakingTest(
        slug=slug,
        title=f"Weak-area Speaking Drill: {skill_label}",
        description=(
            f"Generated from Speaking exam #{assignment.source_exam_id}. "
            f"This drill focuses on {skill_label}."
        ),
        level=exam.speaking_test.level,
        duration_minutes=10,
        instructions=[
            f"Focus on {skill_label} throughout the drill.",
            "Answer fully and avoid repeating the same simple structures.",
            "Review the result afterwards against the weak-area notes.",
        ],
        scoring_focus=[skill_label],
        is_active=True,
    )
    db.add(generated_test)
    await db.flush()

    for part_order, blueprint in enumerate(_speaking_prompt_bank(criterion, anchor_prompt, evidence), start=1):
        generated_part = SpeakingPart(
            test_id=generated_test.id,
            part_id=f"part{part_order}",
            part_order=part_order,
            title=str(blueprint["title"]),
            examiner_guidance=str(blueprint["guidance"]),
            duration_minutes=2 if part_order == 1 else 4 if part_order == 2 else 4,
        )
        db.add(generated_part)
        await db.flush()

        for question_order, question in enumerate(blueprint["questions"], start=1):
            generated_question = SpeakingQuestion(
                part_id=generated_part.id,
                question_code=str(question["code"]),
                question_order=question_order,
                short_label=str(question["label"]),
                prompt=str(question["prompt"]),
                expected_answer_seconds=int(question["seconds"]),
                rephrase_prompt=None,
                follow_ups=list(question.get("follow_ups") or []),
                cue_card=question.get("cue_card"),
            )
            db.add(generated_question)

    await db.flush()
    return int(generated_test.id)


async def perform_assignment_test_generation(db: AsyncSession, *, assignment_id: int) -> int:
    assignment = await repository.get_assignment_with_relations(db, assignment_id=assignment_id)
    if assignment is None:
        raise ApiError(code="assignment_not_found", message="Assignment not found", status_code=404)

    if assignment.generated_test_id is not None and assignment.generation_status == GENERATION_STATUS_READY:
        return int(assignment.generated_test_id)

    await _set_generation_state(
        db,
        assignment,
        status=GENERATION_STATUS_PROCESSING,
        progress=20,
        error=None,
    )

    if assignment.module == ProgressTestTypeEnum.reading:
        generated_test_id = await _create_reading_generated_test(db, assignment)
    elif assignment.module == ProgressTestTypeEnum.listening:
        generated_test_id = await _create_listening_generated_test(db, assignment)
    elif assignment.module == ProgressTestTypeEnum.writing:
        generated_test_id = await _create_writing_generated_test(db, assignment)
    elif assignment.module == ProgressTestTypeEnum.speaking:
        generated_test_id = await _create_speaking_generated_test(db, assignment)
    else:
        raise ApiError(code="invalid_assignment_module", message="Unsupported assignment module", status_code=400)

    await _set_generation_state(
        db,
        assignment,
        status=GENERATION_STATUS_READY,
        progress=100,
        error=None,
        generated_test_id=generated_test_id,
    )
    await db.commit()
    return generated_test_id
