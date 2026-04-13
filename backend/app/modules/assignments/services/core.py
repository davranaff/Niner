from __future__ import annotations

import re
from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.db.model_enums import (
    AssignmentAttemptStatusEnum,
    AssignmentStatusEnum,
    ProgressTestTypeEnum,
    SkillGapStatusEnum,
)
from app.db.models import (
    AssignmentErrorItem,
    AssignmentSkillGap,
    RoleEnum,
    SpeakingExam,
    TrainingAssignment,
    TrainingAssignmentAttempt,
    User,
    WritingExam,
)
from app.modules.assignments import repository
from app.modules.assignments.services.generated_tests import (
    ACTIVE_GENERATION_STATUSES,
    GENERATION_STATUS_FAILED,
    GENERATION_STATUS_IDLE,
    GENERATION_STATUS_QUEUED,
    serialize_generated_test,
)
from app.modules.exams import repository as exams_repository
from app.workers.queue import enqueue_assignment_test_generation

_ANSWER_NORMALIZE_RE = re.compile(r"[^a-z0-9]+")

_OBJECTIVE_SKILL_LABELS: dict[str, str] = {
    "true_false_ng": "True / False / Not Given",
    "multiple_choice": "Multiple Choice",
    "matching_headings": "Matching Headings",
    "matching_features": "Matching Features",
    "matching_paragraph_info": "Matching Paragraph Information",
    "matching_sentence_endings": "Matching Sentence Endings",
    "table_completion": "Table Completion",
    "flow_chart_completion": "Flow-chart Completion",
    "note_completion": "Note Completion",
    "summary_completion": "Summary Completion",
    "sentence_completion": "Sentence Completion",
    "short_answers": "Short Answer Questions",
    "list_of_options": "List of Options",
    "choose_title": "Choose Title",
}

_SPEAKING_CRITERIA_LABELS = {
    "fluency": "Fluency and Coherence",
    "lexical": "Lexical Resource",
    "grammar": "Grammatical Range and Accuracy",
    "pronunciation": "Pronunciation",
}


def _normalize_answer(value: str | None) -> str:
    normalized = str(value or "").strip().lower()
    normalized = normalized.replace("&", " and ")
    normalized = _ANSWER_NORMALIZE_RE.sub(" ", normalized)
    return " ".join(token for token in normalized.split() if token)


def _module_from_exam_kind(kind: str) -> ProgressTestTypeEnum:
    mapping = {
        "reading": ProgressTestTypeEnum.reading,
        "listening": ProgressTestTypeEnum.listening,
        "writing": ProgressTestTypeEnum.writing,
        "speaking": ProgressTestTypeEnum.speaking,
    }
    if kind not in mapping:
        raise ApiError(code="invalid_exam_kind", message=f"Unsupported exam kind: {kind}", status_code=400)
    return mapping[kind]


def _skill_label_from_block_type(block_type: str | None) -> str:
    normalized = str(block_type or "objective_accuracy").strip().lower()
    if not normalized:
        normalized = "objective_accuracy"
    return _OBJECTIVE_SKILL_LABELS.get(normalized, normalized.replace("_", " ").title())


def _to_decimal_score(value: Decimal | float | int) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _skill_gap_status_from_score(score: Decimal) -> SkillGapStatusEnum:
    if score >= Decimal("0.85"):
        return SkillGapStatusEnum.resolved
    if score >= Decimal("0.55"):
        return SkillGapStatusEnum.improving
    return SkillGapStatusEnum.open


def _serialize_error_item(item: AssignmentErrorItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "module": item.module,
        "exam_kind": item.exam_kind,
        "exam_id": item.exam_id,
        "source_key": item.source_key,
        "skill_key": item.skill_key,
        "skill_label": item.skill_label,
        "title": item.title,
        "prompt": item.prompt,
        "expected_answer": item.expected_answer,
        "user_answer": item.user_answer,
        "severity": item.severity,
        "details": dict(item.details or {}),
        "occurred_at": item.occurred_at,
    }


def _serialize_skill_gap(gap: AssignmentSkillGap | None) -> dict[str, Any] | None:
    if gap is None:
        return None

    return {
        "id": gap.id,
        "module": gap.module,
        "skill_key": gap.skill_key,
        "label": gap.label,
        "status": gap.status,
        "severity_score": gap.severity_score,
        "occurrences": gap.occurrences,
        "last_seen_at": gap.last_seen_at,
        "details": dict(gap.details or {}),
    }


def _serialize_attempt(attempt: TrainingAssignmentAttempt | None) -> dict[str, Any] | None:
    if attempt is None:
        return None

    return {
        "id": attempt.id,
        "status": attempt.status,
        "response_text": attempt.response_text,
        "score": attempt.score,
        "feedback": attempt.feedback,
        "details": dict(attempt.details or {}),
        "started_at": attempt.started_at,
        "completed_at": attempt.completed_at,
        "created_at": attempt.created_at,
        "updated_at": attempt.updated_at,
    }


def _serialize_assignment(assignment: TrainingAssignment) -> dict[str, Any]:
    latest_attempt = None
    if assignment.attempts:
        latest_attempt = max(assignment.attempts, key=lambda item: item.id)

    return {
        "id": assignment.id,
        "module": assignment.module,
        "source_exam_kind": assignment.source_exam_kind,
        "source_exam_id": assignment.source_exam_id,
        "task_type": assignment.task_type,
        "title": assignment.title,
        "instructions": assignment.instructions,
        "payload": dict(assignment.payload or {}),
        "status": assignment.status,
        "recommended_at": assignment.recommended_at,
        "started_at": assignment.started_at,
        "completed_at": assignment.completed_at,
        "due_at": assignment.due_at,
        "attempts_count": len(assignment.attempts),
        "skill_gap": _serialize_skill_gap(assignment.skill_gap),
        "latest_attempt": _serialize_attempt(latest_attempt),
        "generated_test": serialize_generated_test(assignment),
    }


async def _upsert_error_item(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    exam_kind: str,
    exam_id: int,
    source_key: str,
    skill_key: str,
    skill_label: str,
    title: str,
    prompt: str | None,
    expected_answer: str | None,
    user_answer: str | None,
    severity: int,
    details: dict[str, Any] | None = None,
) -> AssignmentErrorItem:
    error_item = await repository.get_error_item_by_source(
        db,
        user_id=user_id,
        exam_kind=exam_kind,
        exam_id=exam_id,
        source_key=source_key,
    )

    if error_item is None:
        error_item = AssignmentErrorItem(
            user_id=user_id,
            module=module,
            exam_kind=exam_kind,
            exam_id=exam_id,
            source_key=source_key,
            skill_key=skill_key,
            skill_label=skill_label,
            title=title,
            prompt=prompt,
            expected_answer=expected_answer,
            user_answer=user_answer,
            severity=max(1, int(severity)),
            details=dict(details or {}),
            occurred_at=datetime.now(UTC),
        )
        db.add(error_item)
        await db.flush()
        return error_item

    error_item.module = module
    error_item.skill_key = skill_key
    error_item.skill_label = skill_label
    error_item.title = title
    error_item.prompt = prompt
    error_item.expected_answer = expected_answer
    error_item.user_answer = user_answer
    error_item.severity = max(1, int(severity))
    error_item.details = dict(details or {})
    error_item.occurred_at = datetime.now(UTC)
    await db.flush()
    return error_item


async def _count_skill_errors(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    skill_key: str,
) -> int:
    stmt = select(func.count()).select_from(AssignmentErrorItem).where(
        AssignmentErrorItem.user_id == user_id,
        AssignmentErrorItem.module == module,
        AssignmentErrorItem.skill_key == skill_key,
    )
    value = (await db.execute(stmt)).scalar_one()
    return int(value or 0)


async def _upsert_skill_gap(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    skill_key: str,
    label: str,
    severity_score: Decimal,
    last_error_item_id: int | None,
    details: dict[str, Any] | None = None,
) -> AssignmentSkillGap:
    now = datetime.now(UTC)
    total_occurrences = await _count_skill_errors(
        db,
        user_id=user_id,
        module=module,
        skill_key=skill_key,
    )
    gap = await repository.get_skill_gap_by_key(
        db,
        user_id=user_id,
        module=module,
        skill_key=skill_key,
    )

    if gap is None:
        gap = AssignmentSkillGap(
            user_id=user_id,
            module=module,
            skill_key=skill_key,
            label=label,
            status=_skill_gap_status_from_score(severity_score),
            severity_score=severity_score,
            occurrences=total_occurrences,
            last_error_item_id=last_error_item_id,
            last_seen_at=now,
            details=dict(details or {}),
        )
        db.add(gap)
        await db.flush()
        return gap

    gap.label = label
    gap.severity_score = severity_score
    gap.status = _skill_gap_status_from_score(severity_score)
    gap.occurrences = total_occurrences
    gap.last_error_item_id = last_error_item_id
    gap.last_seen_at = now
    gap.details = dict(details or {})
    await db.flush()
    return gap


async def _upsert_assignment(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    source_exam_kind: str,
    source_exam_id: int,
    dedupe_key: str,
    task_type: str,
    title: str,
    instructions: str,
    payload: dict[str, Any],
    skill_gap_id: int | None,
    source_error_item_id: int | None,
) -> TrainingAssignment:
    assignment = await repository.get_assignment_by_dedupe_key(
        db,
        user_id=user_id,
        dedupe_key=dedupe_key,
    )

    if assignment is None:
        assignment = TrainingAssignment(
            user_id=user_id,
            module=module,
            source_exam_kind=source_exam_kind,
            source_exam_id=source_exam_id,
            dedupe_key=dedupe_key,
            task_type=task_type,
            title=title,
            instructions=instructions,
            payload=dict(payload),
            status=AssignmentStatusEnum.recommended,
            recommended_at=datetime.now(UTC),
            skill_gap_id=skill_gap_id,
            source_error_item_id=source_error_item_id,
        )
        db.add(assignment)
        await db.flush()
        return assignment

    assignment.module = module
    assignment.source_exam_kind = source_exam_kind
    assignment.source_exam_id = source_exam_id
    assignment.task_type = task_type
    assignment.title = title
    assignment.instructions = instructions
    assignment.payload = dict(payload)
    assignment.skill_gap_id = skill_gap_id
    assignment.source_error_item_id = source_error_item_id

    if assignment.status != AssignmentStatusEnum.completed:
        assignment.status = AssignmentStatusEnum.recommended
        assignment.completed_at = None

    await db.flush()
    return assignment


def _reading_block_type_map(exam) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for passage in exam.reading_test.passages:
        for block in passage.question_blocks:
            for question in block.questions:
                mapping[int(question.id)] = str(block.block_type)
    return mapping


def _listening_block_type_map(exam) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for part in exam.listening_test.parts:
        for block in part.question_blocks:
            for question in block.questions:
                mapping[int(question.id)] = str(block.block_type)
    return mapping


async def ensure_objective_exam_assignments(
    db: AsyncSession,
    user: User,
    *,
    kind: str,
    exam_id: int,
) -> list[TrainingAssignment]:
    if kind not in {"reading", "listening"}:
        raise ApiError(code="invalid_exam_kind", message=f"Unsupported objective exam kind: {kind}", status_code=400)

    module = _module_from_exam_kind(kind)

    if kind == "reading":
        exam = await exams_repository.get_reading_exam_with_relations(db, exam_id)
        if exam is None or exam.user_id != user.id:
            raise ApiError(code="exam_not_found", message="Reading exam not found", status_code=404)
        if exam.finished_at is None:
            return []
        wrong_answers = [row for row in exam.question_answers if not row.is_correct]
        block_type_map = _reading_block_type_map(exam)
        total_questions = max(1, sum(1 for _ in block_type_map.keys()))
    else:
        exam = await exams_repository.get_listening_exam_with_relations(db, exam_id)
        if exam is None or exam.user_id != user.id:
            raise ApiError(code="exam_not_found", message="Listening exam not found", status_code=404)
        if exam.finished_at is None:
            return []
        wrong_answers = [row for row in exam.question_answers if not row.is_correct]
        block_type_map = _listening_block_type_map(exam)
        total_questions = max(1, sum(1 for _ in block_type_map.keys()))

    if not wrong_answers:
        await db.commit()
        return []

    skill_errors: dict[str, list[AssignmentErrorItem]] = defaultdict(list)

    for answer_row in wrong_answers:
        question_id = int(answer_row.question_id)
        block_type = block_type_map.get(question_id, "objective_accuracy")
        skill_label = _skill_label_from_block_type(block_type)
        skill_key = f"{kind}:{str(block_type).strip().lower() or 'objective_accuracy'}"

        error_item = await _upsert_error_item(
            db,
            user_id=user.id,
            module=module,
            exam_kind=kind,
            exam_id=exam_id,
            source_key=f"question-{question_id}",
            skill_key=skill_key,
            skill_label=skill_label,
            title=f"Incorrect answer in {skill_label}",
            prompt=getattr(answer_row.question, "question_text", None),
            expected_answer=answer_row.correct_answer,
            user_answer=answer_row.user_answer,
            severity=2 if not str(answer_row.user_answer or "").strip() else 1,
            details={
                "question_id": question_id,
                "block_type": block_type,
            },
        )
        skill_errors[skill_key].append(error_item)

    created_assignments: list[TrainingAssignment] = []
    total_wrong = len(wrong_answers)

    for skill_key, errors in skill_errors.items():
        example = errors[0]
        exam_skill_error_count = len(errors)
        weakness_ratio = Decimal(str(exam_skill_error_count / total_questions))
        severity_score = _to_decimal_score(min(Decimal("1.00"), Decimal("0.40") + weakness_ratio))

        gap = await _upsert_skill_gap(
            db,
            user_id=user.id,
            module=module,
            skill_key=skill_key,
            label=example.skill_label,
            severity_score=severity_score,
            last_error_item_id=example.id,
            details={
                "exam_kind": kind,
                "exam_id": exam_id,
                "last_exam_errors": exam_skill_error_count,
                "total_exam_errors": total_wrong,
            },
        )

        dedupe_key = f"{kind}:{exam_id}:{skill_key}:objective_retry"
        assignment = await _upsert_assignment(
            db,
            user_id=user.id,
            module=module,
            source_exam_kind=kind,
            source_exam_id=exam_id,
            dedupe_key=dedupe_key,
            task_type="objective_retry",
            title=f"{example.skill_label} recovery drill",
            instructions=(
                f"Review why your answer was incorrect in {example.skill_label}. "
                "Then solve 10 timed items of the same type and explain each correction."
            ),
            payload={
                "module": kind,
                "skill_key": skill_key,
                "block_type": str((example.details or {}).get("block_type") or "").strip().lower(),
                "exam_id": exam_id,
                "target_question_count": 10,
                "source_question_ids": [item.details.get("question_id") for item in errors],
                "expected_answers": [item.expected_answer for item in errors if item.expected_answer],
            },
            skill_gap_id=gap.id,
            source_error_item_id=example.id,
        )
        created_assignments.append(assignment)

    await db.commit()
    return created_assignments


async def ensure_writing_exam_assignments(
    db: AsyncSession,
    user: User,
    *,
    exam_id: int,
) -> list[TrainingAssignment]:
    exam: WritingExam | None = await exams_repository.get_writing_exam_with_relations(db, exam_id)
    if exam is None or exam.user_id != user.id:
        raise ApiError(code="exam_not_found", message="Writing exam not found", status_code=404)
    if exam.finished_at is None:
        return []

    module = ProgressTestTypeEnum.writing
    created_assignments: list[TrainingAssignment] = []
    error_items_by_skill: dict[str, list[AssignmentErrorItem]] = defaultdict(list)

    for part in exam.writing_parts:
        essay = str(part.essay or "").strip()
        if not essay:
            continue

        part_order = int(getattr(getattr(part, "part", None), "order", 1) or 1)
        word_count = len([token for token in essay.split() if token.strip()])
        min_words = 250 if part_order == 2 else 150

        if word_count < min_words:
            skill_key = f"writing:task_{part_order}_word_count"
            error_item = await _upsert_error_item(
                db,
                user_id=user.id,
                module=module,
                exam_kind="writing",
                exam_id=exam_id,
                source_key=f"part-{part.part_id}-word-count",
                skill_key=skill_key,
                skill_label=f"Task {part_order} response length",
                title=f"Task {part_order} response is below IELTS minimum length",
                prompt=f"Task {part_order}",
                expected_answer=f"At least {min_words} words",
                user_answer=f"{word_count} words",
                severity=2,
                details={
                    "part_id": int(part.part_id),
                    "part_order": part_order,
                    "word_count": word_count,
                    "minimum_words": min_words,
                },
            )
            error_items_by_skill[skill_key].append(error_item)

        if part.score is not None and Decimal(str(part.score)) < Decimal("6.50"):
            skill_key = f"writing:task_{part_order}_quality"
            error_item = await _upsert_error_item(
                db,
                user_id=user.id,
                module=module,
                exam_kind="writing",
                exam_id=exam_id,
                source_key=f"part-{part.part_id}-quality",
                skill_key=skill_key,
                skill_label=f"Task {part_order} quality",
                title=f"Task {part_order} scored below target",
                prompt=f"Task {part_order}",
                expected_answer="Target 6.5+",
                user_answer=f"{part.score}",
                severity=2,
                details={
                    "part_id": int(part.part_id),
                    "part_order": part_order,
                    "score": float(part.score),
                },
            )
            error_items_by_skill[skill_key].append(error_item)

    for skill_key, errors in error_items_by_skill.items():
        example = errors[0]
        severity_score = _to_decimal_score(min(Decimal("1.00"), Decimal("0.50") + Decimal(str(len(errors) * 0.1))))

        gap = await _upsert_skill_gap(
            db,
            user_id=user.id,
            module=module,
            skill_key=skill_key,
            label=example.skill_label,
            severity_score=severity_score,
            last_error_item_id=example.id,
            details={
                "exam_kind": "writing",
                "exam_id": exam_id,
                "error_count": len(errors),
            },
        )

        task_type = "writing_revision"
        dedupe_key = f"writing:{exam_id}:{skill_key}:{task_type}"
        assignment = await _upsert_assignment(
            db,
            user_id=user.id,
            module=module,
            source_exam_kind="writing",
            source_exam_id=exam_id,
            dedupe_key=dedupe_key,
            task_type=task_type,
            title=f"Writing improvement: {example.skill_label}",
            instructions=(
                "Rewrite the same task with clearer structure, stronger lexical range, "
                "and explicit error corrections from your previous attempt."
            ),
            payload={
                "module": "writing",
                "skill_key": skill_key,
                "exam_id": exam_id,
                "source_part_ids": [item.details.get("part_id") for item in errors],
            },
            skill_gap_id=gap.id,
            source_error_item_id=example.id,
        )
        created_assignments.append(assignment)

    await db.commit()
    return created_assignments


async def ensure_speaking_exam_assignments(
    db: AsyncSession,
    user: User,
    *,
    exam_id: int,
) -> list[TrainingAssignment]:
    exam: SpeakingExam | None = await exams_repository.get_speaking_exam_with_relations(db, exam_id)
    if exam is None or exam.user_id != user.id:
        raise ApiError(code="exam_not_found", message="Speaking exam not found", status_code=404)
    if exam.finished_at is None or not exam.result_json:
        return []

    criteria_payload = exam.result_json.get("criteria")
    if not isinstance(criteria_payload, list):
        return []

    module = ProgressTestTypeEnum.speaking
    created_assignments: list[TrainingAssignment] = []
    target_band = Decimal("7.00")

    for criterion in criteria_payload:
        if not isinstance(criterion, dict):
            continue

        key = str(criterion.get("key") or "").strip().lower()
        if key not in _SPEAKING_CRITERIA_LABELS:
            continue

        raw_band = criterion.get("band", 0)
        band = Decimal(str(raw_band or 0))
        if band >= target_band:
            continue

        label = _SPEAKING_CRITERIA_LABELS[key]
        rationale = str(criterion.get("rationale") or "").strip()
        evidence_items = criterion.get("evidence")
        evidence: list[str] = []
        if isinstance(evidence_items, list):
            evidence = [str(item).strip() for item in evidence_items if str(item).strip()]

        skill_key = f"speaking:{key}"
        error_item = await _upsert_error_item(
            db,
            user_id=user.id,
            module=module,
            exam_kind="speaking",
            exam_id=exam_id,
            source_key=f"criterion-{key}",
            skill_key=skill_key,
            skill_label=label,
            title=f"Speaking criterion below target: {label}",
            prompt=rationale or label,
            expected_answer="Target 7.0+",
            user_answer=f"{band}",
            severity=2,
            details={
                "criterion": key,
                "band": float(band),
                "target_band": float(target_band),
                "evidence": evidence,
            },
        )

        gap_strength = min(Decimal("1.00"), (target_band - band) / Decimal("3.00") + Decimal("0.40"))
        severity_score = _to_decimal_score(gap_strength)

        gap = await _upsert_skill_gap(
            db,
            user_id=user.id,
            module=module,
            skill_key=skill_key,
            label=label,
            severity_score=severity_score,
            last_error_item_id=error_item.id,
            details={
                "exam_kind": "speaking",
                "exam_id": exam_id,
                "criterion": key,
            },
        )

        dedupe_key = f"speaking:{exam_id}:{skill_key}:speaking_drill"
        assignment = await _upsert_assignment(
            db,
            user_id=user.id,
            module=module,
            source_exam_kind="speaking",
            source_exam_id=exam_id,
            dedupe_key=dedupe_key,
            task_type="speaking_drill",
            title=f"Speaking drill: {label}",
            instructions=(
                "Record a 2-minute response on the same topic, then self-review for coherence, "
                "lexical precision, grammar control, and pronunciation clarity."
            ),
            payload={
                "module": "speaking",
                "skill_key": skill_key,
                "exam_id": exam_id,
                "criterion": key,
                "evidence": evidence,
            },
            skill_gap_id=gap.id,
            source_error_item_id=error_item.id,
        )
        created_assignments.append(assignment)

    await db.commit()
    return created_assignments


async def list_assignments(
    db: AsyncSession,
    user: User,
    *,
    limit: int,
    offset: int,
    module: ProgressTestTypeEnum | None,
    status: AssignmentStatusEnum | None,
) -> dict[str, Any]:
    if user.role not in {RoleEnum.student, RoleEnum.admin}:
        raise ApiError(code="forbidden", message="Only students can access assignments", status_code=403)

    rows = await repository.list_assignments_for_user(
        db,
        user_id=user.id,
        module=module,
        status=status,
        limit=limit,
        offset=offset,
    )
    total = await repository.count_assignments_for_user(
        db,
        user_id=user.id,
        module=module,
        status=status,
    )

    return {
        "items": [_serialize_assignment(row) for row in rows],
        "count": total,
        "limit": max(1, limit),
        "offset": max(0, offset),
    }


async def get_assignment_details(
    db: AsyncSession,
    user: User,
    *,
    assignment_id: int,
) -> dict[str, Any]:
    if user.role not in {RoleEnum.student, RoleEnum.admin}:
        raise ApiError(code="forbidden", message="Only students can access assignments", status_code=403)

    assignment = await repository.get_assignment_owned(db, user_id=user.id, assignment_id=assignment_id)
    if assignment is None:
        raise ApiError(code="assignment_not_found", message="Assignment not found", status_code=404)

    if assignment.skill_gap is not None:
        error_items = await repository.list_error_items_for_exam_skill(
            db,
            user_id=user.id,
            exam_kind=assignment.source_exam_kind,
            exam_id=assignment.source_exam_id,
            module=assignment.module,
            skill_key=assignment.skill_gap.skill_key,
        )
    else:
        error_items = await repository.list_error_items_for_exam(
            db,
            user_id=user.id,
            exam_kind=assignment.source_exam_kind,
            exam_id=assignment.source_exam_id,
        )

    attempts = sorted(list(assignment.attempts), key=lambda item: item.id, reverse=True)
    serialized_attempts = [
        payload
        for payload in (_serialize_attempt(item) for item in attempts)
        if payload is not None
    ]

    return {
        "assignment": _serialize_assignment(assignment),
        "skill_gap": _serialize_skill_gap(assignment.skill_gap),
        "error_items": [_serialize_error_item(item) for item in error_items],
        "attempts": serialized_attempts,
    }


async def request_assignment_test_generation(
    db: AsyncSession,
    user: User,
    *,
    assignment_id: int,
) -> dict[str, Any]:
    if user.role not in {RoleEnum.student, RoleEnum.admin}:
        raise ApiError(code="forbidden", message="Only students can generate assignment tests", status_code=403)

    assignment = await repository.get_assignment_owned(db, user_id=user.id, assignment_id=assignment_id)
    if assignment is None:
        raise ApiError(code="assignment_not_found", message="Assignment not found", status_code=404)

    current_status = str(assignment.generation_status or GENERATION_STATUS_IDLE)
    if assignment.generated_test_id is not None or current_status in ACTIVE_GENERATION_STATUSES:
        return {"assignment": _serialize_assignment(assignment)}

    assignment.generation_status = GENERATION_STATUS_QUEUED
    assignment.generation_progress = 5
    assignment.generation_error = None
    assignment.generation_requested_at = datetime.now(UTC)
    assignment.generation_started_at = None
    assignment.generated_at = None
    await db.commit()

    try:
        await enqueue_assignment_test_generation(assignment.id)
    except Exception as exc:  # noqa: BLE001
        assignment = await repository.get_assignment_owned(db, user_id=user.id, assignment_id=assignment_id)
        if assignment is not None:
            assignment.generation_status = GENERATION_STATUS_FAILED
            assignment.generation_progress = 0
            assignment.generation_error = str(exc)
            await db.commit()
        raise ApiError(
            code="assignment_generation_enqueue_failed",
            message="Could not queue weak-area test generation",
            status_code=503,
        ) from exc

    assignment = await repository.get_assignment_owned(db, user_id=user.id, assignment_id=assignment_id)
    if assignment is None:
        raise ApiError(code="assignment_not_found", message="Assignment not found", status_code=404)

    return {"assignment": _serialize_assignment(assignment)}


def _evaluate_attempt_score(
    *,
    response_text: str,
    payload: dict[str, Any],
    explicit_score: Decimal | None,
) -> tuple[Decimal, str]:
    if explicit_score is not None:
        score = _to_decimal_score(explicit_score)
        if score >= Decimal("0.80"):
            return score, "Strong completion. Keep this quality in your next timed drill."
        if score >= Decimal("0.55"):
            return score, "Good progress. Repeat the drill once more to stabilize accuracy."
        return score, "Needs another focused attempt on the same weak skill."

    normalized_response = _normalize_answer(response_text)
    expected_answers_raw = payload.get("expected_answers")
    expected_answers: list[str] = []
    if isinstance(expected_answers_raw, list):
        expected_answers = [
            _normalize_answer(str(item))
            for item in expected_answers_raw
            if _normalize_answer(str(item))
        ]

    if expected_answers:
        matched = normalized_response in set(expected_answers)
        if matched:
            return Decimal("1.00"), "Correct recovery on the targeted error."
        if normalized_response:
            return Decimal("0.35"), "Answer still does not match accepted variants. Review correction notes."
        return Decimal("0.10"), "No valid response detected. Retry with a complete answer."

    word_count = len([token for token in response_text.split() if token.strip()])
    if word_count >= 80:
        return Decimal("0.80"), "Comprehensive response. Continue with one more timed repetition."
    if word_count >= 30:
        return Decimal("0.60"), "Decent practice attempt. Expand detail and precision in the next retry."
    if word_count >= 10:
        return Decimal("0.40"), "Partial response. Increase depth and structure."
    return Decimal("0.20"), "Response is too short. Provide a fuller attempt."


async def submit_assignment_attempt(
    db: AsyncSession,
    user: User,
    *,
    assignment_id: int,
    response_text: str,
    explicit_score: Decimal | None,
) -> dict[str, Any]:
    if user.role not in {RoleEnum.student, RoleEnum.admin}:
        raise ApiError(code="forbidden", message="Only students can submit assignment attempts", status_code=403)

    assignment = await repository.get_assignment_owned(db, user_id=user.id, assignment_id=assignment_id)
    if assignment is None:
        raise ApiError(code="assignment_not_found", message="Assignment not found", status_code=404)

    normalized_response = str(response_text or "").strip()
    score, feedback = _evaluate_attempt_score(
        response_text=normalized_response,
        payload=dict(assignment.payload or {}),
        explicit_score=explicit_score,
    )

    if assignment.started_at is None:
        assignment.started_at = datetime.now(UTC)

    attempt = TrainingAssignmentAttempt(
        assignment_id=assignment.id,
        user_id=user.id,
        status=AssignmentAttemptStatusEnum.evaluated,
        response_text=normalized_response,
        score=score,
        feedback=feedback,
        details={
            "module": assignment.module.value,
            "task_type": assignment.task_type,
        },
        started_at=datetime.now(UTC),
        completed_at=datetime.now(UTC),
    )
    db.add(attempt)
    await db.flush()

    if score >= Decimal("0.70"):
        assignment.status = AssignmentStatusEnum.completed
        assignment.completed_at = datetime.now(UTC)
    else:
        assignment.status = AssignmentStatusEnum.in_progress
        assignment.completed_at = None

    if assignment.skill_gap is not None:
        assignment.skill_gap.severity_score = score
        assignment.skill_gap.status = _skill_gap_status_from_score(score)
        assignment.skill_gap.last_seen_at = datetime.now(UTC)

    await db.commit()
    assignment = await repository.get_assignment_owned(db, user_id=user.id, assignment_id=assignment.id)
    if assignment is None:
        raise ApiError(code="assignment_not_found", message="Assignment not found", status_code=404)

    latest_attempt = await repository.get_latest_assignment_attempt(db, assignment_id=assignment.id)
    return {
        "assignment": _serialize_assignment(assignment),
        "attempt": _serialize_attempt(latest_attempt),
    }
