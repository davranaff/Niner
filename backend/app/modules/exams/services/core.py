from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import normalize_limit, normalize_offset, serialize_page
from app.db.models import (
    AiSummaryModuleEnum,
    FinishReasonEnum,
    ListeningExam,
    ListeningExamQuestionAnswer,
    ListeningQuestion,
    OverallExam,
    ProgressTestTypeEnum,
    ReadingExam,
    ReadingExamQuestionAnswer,
    ReadingQuestion,
    SpeakingExam,
    UserAnalytics,
    UserProgress,
    User,
    WritingExam,
    WritingExamPart,
)
from app.modules.assignments import services as assignment_services
from app.modules.ai_summary.services.core import create_auto_summary
from app.modules.exams import repository
from app.modules.exams.score import (
    listening_band_score,
    reading_band_score,
    round_band_to_half,
)
from app.modules.exams.services.validation import (
    validate_listening_draft_payload,
    validate_listening_submit_payload,
    validate_reading_draft_payload,
    validate_reading_submit_payload,
    validate_writing_draft_payload,
    validate_writing_submit_payload,
)
from app.modules.listening.service import question_numbering as listening_question_numbering
from app.modules.reading.service import question_numbering as reading_question_numbering
from app.modules.speaking.schemas import (
    LiveServerEvent,
    SpeakingAttemptOut,
    SpeakingAttemptStatus,
    SpeakingConnectionState,
    SpeakingExaminerDecisionIn,
    SpeakingExaminerDecisionOut,
    SpeakingSessionState,
    SpeakingSessionStatus,
    SpeakingSpeaker,
    SpeakingTestDetail,
)
from app.modules.speaking.services.examiner import decide_examiner_turn
from app.modules.speaking.services.realtime import speaking_realtime_hub
from app.modules.speaking.services.scoring import score_speaking_session
from app.modules.speaking.services.core import serialize_speaking_test_detail
from app.workers.queue import enqueue_writing_evaluation

logger = logging.getLogger(__name__)

_ANSWER_NORMALIZE_RE = re.compile(r"[^a-z0-9\s']")
_ANSWER_SPLIT_RE = re.compile(r"\s*(?:\bor\b|/|;|\|)\s*", flags=re.IGNORECASE)
_ANSWER_ARTICLES = {"a", "an", "the"}

ExamKind = Literal["reading", "listening", "writing", "speaking"]
ExamAttemptStatus = Literal["in_progress", "completed", "terminated"]
ExamResultStatus = Literal["success", "failed", "in_progress"]
SubmitFinishReasonOverride = Literal["left", "time_is_up"]
OverallModuleKind = Literal["listening", "reading", "writing", "speaking"]
OverallExamStatus = Literal["in_progress", "completed", "terminated"]
OverallExamPhase = Literal["module", "break", "completed", "terminated"]
OverallExamResultStatus = Literal["in_progress", "success", "failed"]
OverallModuleAttemptStatus = Literal["not_started", "in_progress", "completed", "terminated"]

DEFAULT_STUDENT_ATTEMPTS_ORDERING = "-updated_at"
ALLOWED_STUDENT_ATTEMPTS_ORDERING = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
    "started_at",
    "-started_at",
    "finished_at",
    "-finished_at",
    "test_title",
    "-test_title",
    "estimated_band",
    "-estimated_band",
}
DEFAULT_OVERALL_ATTEMPTS_ORDERING = "-updated_at"
ALLOWED_OVERALL_ATTEMPTS_ORDERING = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
    "started_at",
    "-started_at",
    "finished_at",
    "-finished_at",
    "overall_band",
    "-overall_band",
}
BREAK_DURATION_SECONDS = 300


def _calculate_elapsed_seconds(started_at: datetime | None, finished_at: datetime | None) -> int | None:
    if not started_at or not finished_at:
        return None
    if started_at.tzinfo is None and finished_at.tzinfo is not None:
        finished_at = finished_at.replace(tzinfo=None)
    elif started_at.tzinfo is not None and finished_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=None)

    elapsed = int((finished_at - started_at).total_seconds())
    return max(elapsed, 0)


def _resolve_finish_reason(
    elapsed_seconds: int | None,
    limit_seconds: int,
    *,
    forced_reason: FinishReasonEnum | None = None,
) -> FinishReasonEnum:
    if forced_reason is not None:
        return forced_reason
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


async def _get_speaking_exam_owned(db: AsyncSession, exam_id: int, user_id: int) -> SpeakingExam:
    exam = await repository.get_speaking_exam_with_relations(db, exam_id)
    if exam is None:
        raise ApiError(code="exam_not_found", message="Speaking exam not found", status_code=404)
    if exam.user_id != user_id:
        raise ApiError(code="forbidden", message="Cannot access exam owned by another user", status_code=403)
    return exam


def _serialize_exam_summary(kind: ExamKind, exam: Any) -> dict[str, Any]:
    if kind == "reading":
        test_id = exam.reading_test_id
    elif kind == "listening":
        test_id = exam.listening_test_id
    elif kind == "writing":
        test_id = exam.writing_test_id
    else:
        test_id = exam.speaking_test_id

    return {
        "id": exam.id,
        "kind": kind,
        "user_id": exam.user_id,
        "test_id": test_id,
        "started_at": exam.started_at,
        "finished_at": exam.finished_at,
        "finish_reason": exam.finish_reason.value if exam.finish_reason else None,
    }


def _resolve_attempt_status(exam: Any) -> ExamAttemptStatus:
    if exam.finished_at is None:
        return "in_progress"
    if exam.finish_reason == FinishReasonEnum.left:
        return "terminated"
    return "completed"


def _resolve_exam_result_status(exam: Any) -> ExamResultStatus:
    if exam.finished_at is None:
        return "in_progress"
    if exam.finish_reason == FinishReasonEnum.completed:
        return "success"
    return "failed"


def _calculate_time_spent_seconds(
    started_at: datetime | None,
    finished_at: datetime | None,
) -> int | None:
    if started_at is None:
        return None
    effective_finished_at = finished_at or datetime.now(UTC)
    return _calculate_elapsed_seconds(started_at, effective_finished_at)


def _calculate_result_time_spent_seconds(
    started_at: datetime | None,
    finished_at: datetime | None,
) -> int | None:
    # Backward-compatible alias used across legacy and new call sites.
    return _calculate_time_spent_seconds(started_at, finished_at)


async def _get_or_create_user_analytics(db: AsyncSession, *, user_id: int) -> UserAnalytics:
    analytics = (
        await db.execute(select(UserAnalytics).where(UserAnalytics.user_id == user_id))
    ).scalar_one_or_none()
    if analytics is not None:
        return analytics

    analytics = UserAnalytics(user_id=user_id)
    db.add(analytics)
    await db.flush()
    return analytics


async def _record_exam_progress(
    db: AsyncSession,
    *,
    user_id: int,
    test_type: ProgressTestTypeEnum,
    band_score: float | None,
    correct_answers: int | None,
    total_questions: int | None,
    time_taken_seconds: int | None,
    test_date: datetime | None,
) -> None:
    if band_score is None:
        return

    normalized_test_date = test_date or datetime.now(UTC)
    progress_score = Decimal(str(band_score))
    progress = UserProgress(
        user_id=user_id,
        test_date=normalized_test_date,
        band_score=progress_score,
        correct_answers=correct_answers,
        total_questions=total_questions,
        time_taken_seconds=time_taken_seconds,
        test_type=test_type,
    )
    db.add(progress)

    analytics = await _get_or_create_user_analytics(db, user_id=user_id)
    previous_total_tests = int(analytics.total_tests_taken or 0)
    previous_average = Decimal(str(analytics.average_band_score or Decimal("0.0")))

    analytics.total_tests_taken = previous_total_tests + 1
    analytics.total_study_time_seconds = int(analytics.total_study_time_seconds or 0) + int(time_taken_seconds or 0)
    analytics.last_test_date = normalized_test_date
    analytics.best_band_score = max(Decimal(str(analytics.best_band_score or Decimal("0.0"))), progress_score)

    cumulative = previous_average * Decimal(previous_total_tests)
    analytics.average_band_score = (cumulative + progress_score) / Decimal(analytics.total_tests_taken)
    await db.flush()


def _objective_band_score(kind: Literal["reading", "listening"], correct_count: int) -> float:
    return reading_band_score(correct_count) if kind == "reading" else listening_band_score(correct_count)


def _serialize_objective_exam_result(
    kind: Literal["reading", "listening"],
    exam: ReadingExam | ListeningExam,
    question_answers: list[ReadingExamQuestionAnswer | ListeningExamQuestionAnswer],
) -> dict[str, Any]:
    result = _resolve_exam_result_status(exam)
    correct_count = sum(1 for answer in question_answers if answer.is_correct)
    has_answers = bool(question_answers)

    score = _objective_band_score(kind, correct_count) if (has_answers or result != "in_progress") else None
    return {
        "result": result,
        "score": score,
        "correct_answers": correct_count,
        "time_spent": _calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
    }


def _serialize_writing_exam_result(exam: WritingExam) -> dict[str, Any]:
    return {
        "result": _resolve_exam_result_status(exam),
        "score": _calculate_writing_estimated_band(exam.writing_parts),
        "correct_answers": None,
        "time_spent": _calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
    }


def _calculate_reading_or_listening_estimated_band(
    question_answers: list[Any],
    *,
    kind: Literal["reading", "listening"],
) -> float | None:
    if not question_answers:
        return None

    correct_count = sum(1 for answer in question_answers if answer.is_correct)
    return _objective_band_score(kind, correct_count)


def _calculate_writing_estimated_band(parts: list[WritingExamPart]) -> float | None:
    submitted_parts = [part for part in parts if (part.essay or "").strip()]
    if not submitted_parts:
        return None
    if any(part.score is None for part in submitted_parts):
        return None

    total_weight = Decimal("0.0")
    weighted_total = Decimal("0.0")

    for part in submitted_parts:
        part_score = Decimal(str(part.score))
        order = int(getattr(getattr(part, "part", None), "order", 0) or 0)
        weight = Decimal("2.0") if order == 2 else Decimal("1.0")
        weighted_total += part_score * weight
        total_weight += weight

    if total_weight <= Decimal("0.0"):
        return None

    average = weighted_total / total_weight
    return round_band_to_half(average)


def _calculate_speaking_estimated_band(exam: SpeakingExam) -> float | None:
    if not exam.result_json:
        return None

    try:
        band = exam.result_json.get("overall_band")
        return float(band) if band is not None else None
    except Exception:  # noqa: BLE001
        return None


async def _ensure_auto_summary_for_exam(
    db: AsyncSession,
    *,
    user: User,
    module: AiSummaryModuleEnum,
    exam_id: int,
) -> None:
    try:
        await create_auto_summary(
            db,
            user=user,
            module=module,
            exam_id=exam_id,
            attempts_limit=1,
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to create AI summary job",
            extra={"exam_id": exam_id, "summary_module": module.value},
        )


async def _ensure_post_exam_assignments(
    db: AsyncSession,
    *,
    user: User,
    kind: ExamKind,
    exam_id: int,
) -> None:
    try:
        if kind in {"reading", "listening"}:
            await assignment_services.ensure_objective_exam_assignments(
                db,
                user,
                kind=kind,
                exam_id=exam_id,
            )
            return

        if kind == "writing":
            await assignment_services.ensure_writing_exam_assignments(
                db,
                user,
                exam_id=exam_id,
            )
            return

        await assignment_services.ensure_speaking_exam_assignments(
            db,
            user,
            exam_id=exam_id,
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to generate post-exam assignments",
            extra={"exam_kind": kind, "exam_id": exam_id, "user_id": user.id},
        )


def _serialize_student_attempt_item(kind: ExamKind, exam: Any) -> dict[str, Any]:
    if kind == "reading":
        test = exam.reading_test
        test_id = exam.reading_test_id
        estimated_band = _calculate_reading_or_listening_estimated_band(
            exam.question_answers,
            kind="reading",
        )
    elif kind == "listening":
        test = exam.listening_test
        test_id = exam.listening_test_id
        estimated_band = _calculate_reading_or_listening_estimated_band(
            exam.question_answers,
            kind="listening",
        )
    elif kind == "writing":
        test = exam.writing_test
        test_id = exam.writing_test_id
        estimated_band = _calculate_writing_estimated_band(exam.writing_parts)
    else:
        test = exam.speaking_test
        test_id = exam.speaking_test_id
        estimated_band = _calculate_speaking_estimated_band(exam)

    return {
        "id": exam.id,
        "kind": kind,
        "test_id": test_id,
        "test_title": test.title,
        "time_limit": int(test.time_limit) if hasattr(test, "time_limit") else int(test.duration_minutes * 60),
        "status": _resolve_attempt_status(exam),
        "finish_reason": exam.finish_reason.value if exam.finish_reason else None,
        "started_at": exam.started_at,
        "finished_at": exam.finished_at,
        "created_at": exam.created_at,
        "updated_at": exam.updated_at,
        "estimated_band": estimated_band,
    }


def _matches_student_attempt_search(item: dict[str, Any], search: str | None) -> bool:
    if not search:
        return True

    normalized = search.strip().lower()
    if not normalized:
        return True

    return normalized in str(item["test_title"]).lower()


def _sort_student_attempts(
    items: list[dict[str, Any]],
    ordering: str,
) -> list[dict[str, Any]]:
    normalized_ordering = (
        ordering if ordering in ALLOWED_STUDENT_ATTEMPTS_ORDERING else DEFAULT_STUDENT_ATTEMPTS_ORDERING
    )
    reverse = normalized_ordering.startswith("-")
    field = normalized_ordering[1:] if reverse else normalized_ordering

    non_null_items = [item for item in items if item.get(field) is not None]
    null_items = [item for item in items if item.get(field) is None]

    if field in {"created_at", "updated_at", "started_at", "finished_at"}:
        def key_fn(item: dict[str, Any]) -> Any:
            return item[field]
    elif field == "estimated_band":
        def key_fn(item: dict[str, Any]) -> Any:
            return float(item[field])
    else:
        def key_fn(item: dict[str, Any]) -> Any:
            return str(item[field]).lower()

    sorted_items = sorted(non_null_items, key=key_fn, reverse=reverse)
    return sorted_items + null_items


def _resolve_overall_result_status(overall_exam: OverallExam) -> OverallExamResultStatus:
    if overall_exam.status == "in_progress":
        return "in_progress"
    if overall_exam.status == "terminated":
        return "failed"

    linked_exams = [
        overall_exam.listening_exam,
        overall_exam.reading_exam,
        overall_exam.writing_exam,
        overall_exam.speaking_exam,
    ]
    if any(exam is None for exam in linked_exams):
        return "failed"
    if any(exam.finish_reason != FinishReasonEnum.completed for exam in linked_exams if exam is not None):
        return "failed"
    return "success"


def _resolve_overall_module_status(exam: Any | None) -> OverallModuleAttemptStatus:
    if exam is None:
        return "not_started"
    return _resolve_attempt_status(exam)


def _serialize_overall_module_attempt(
    module: str,
    *,
    test_id: int,
    test_title: str,
    exam: Any | None,
) -> dict[str, Any]:
    if exam is None:
        return {
            "module": module,
            "test_id": test_id,
            "test_title": test_title,
            "exam_id": None,
            "status": "not_started",
            "finish_reason": None,
            "result": None,
            "score": None,
            "correct_answers": None,
            "time_spent": None,
            "started_at": None,
            "finished_at": None,
        }

    if module in {"listening", "reading"}:
        correct_answers = sum(1 for answer in exam.question_answers if answer.is_correct)
        has_answers = bool(exam.question_answers)
        score = (
            _objective_band_score(module, correct_answers)
            if (has_answers or exam.finished_at is not None)
            else None
        )
    elif module == "writing":
        score = _calculate_writing_estimated_band(exam.writing_parts)
        correct_answers = None
    else:
        score = _calculate_speaking_estimated_band(exam)
        correct_answers = None

    return {
        "module": module,
        "test_id": test_id,
        "test_title": test_title,
        "exam_id": exam.id,
        "status": _resolve_overall_module_status(exam),
        "finish_reason": exam.finish_reason.value if exam.finish_reason else None,
        "result": _resolve_exam_result_status(exam),
        "score": score,
        "correct_answers": correct_answers,
        "time_spent": _calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
        "started_at": exam.started_at,
        "finished_at": exam.finished_at,
    }


def _compute_break_remaining_seconds(overall_exam: OverallExam) -> int | None:
    if overall_exam.phase != "break" or overall_exam.break_started_at is None:
        return None
    break_started_at = overall_exam.break_started_at
    now = datetime.now(UTC)
    if break_started_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    deadline = break_started_at + timedelta(seconds=int(overall_exam.break_duration_seconds))
    remaining = int((deadline - now).total_seconds())
    return max(0, remaining)


def _calculate_overall_band(overall_exam: OverallExam) -> tuple[float | None, bool]:
    if overall_exam.writing_exam is None or overall_exam.speaking_exam is None:
        return (None, False)

    listening_score = (
        _calculate_reading_or_listening_estimated_band(
            overall_exam.listening_exam.question_answers,
            kind="listening",
        )
        if overall_exam.listening_exam is not None
        else None
    )
    reading_score = (
        _calculate_reading_or_listening_estimated_band(
            overall_exam.reading_exam.question_answers,
            kind="reading",
        )
        if overall_exam.reading_exam is not None
        else None
    )
    writing_score = _calculate_writing_estimated_band(overall_exam.writing_exam.writing_parts)
    speaking_score = _calculate_speaking_estimated_band(overall_exam.speaking_exam)

    if writing_score is None:
        return (None, True)
    if speaking_score is None:
        return (None, True)
    if listening_score is None or reading_score is None:
        return (None, False)

    total = (
        Decimal(str(listening_score))
        + Decimal(str(reading_score))
        + Decimal(str(writing_score))
        + Decimal(str(speaking_score))
    )
    average = total / Decimal("4")
    return (round_band_to_half(average), False)


def _serialize_overall_modules(overall_exam: OverallExam) -> list[dict[str, Any]]:
    return [
        _serialize_overall_module_attempt(
            "listening",
            test_id=overall_exam.listening_test_id,
            test_title=overall_exam.listening_test.title,
            exam=overall_exam.listening_exam,
        ),
        _serialize_overall_module_attempt(
            "reading",
            test_id=overall_exam.reading_test_id,
            test_title=overall_exam.reading_test.title,
            exam=overall_exam.reading_exam,
        ),
        _serialize_overall_module_attempt(
            "writing",
            test_id=overall_exam.writing_test_id,
            test_title=overall_exam.writing_test.title,
            exam=overall_exam.writing_exam,
        ),
        _serialize_overall_module_attempt(
            "speaking",
            test_id=overall_exam.speaking_test_id,
            test_title=overall_exam.speaking_test.title,
            exam=overall_exam.speaking_exam,
        ),
    ]


def _serialize_overall_exam_state(overall_exam: OverallExam) -> dict[str, Any]:
    return {
        "id": overall_exam.id,
        "user_id": overall_exam.user_id,
        "status": overall_exam.status,
        "phase": overall_exam.phase,
        "current_module": overall_exam.current_module,
        "result": _resolve_overall_result_status(overall_exam),
        "break_started_at": overall_exam.break_started_at,
        "break_duration_seconds": int(overall_exam.break_duration_seconds),
        "break_remaining_seconds": _compute_break_remaining_seconds(overall_exam),
        "started_at": overall_exam.started_at,
        "finished_at": overall_exam.finished_at,
        "finish_reason": overall_exam.finish_reason.value if overall_exam.finish_reason else None,
        "listening_test_id": overall_exam.listening_test_id,
        "reading_test_id": overall_exam.reading_test_id,
        "writing_test_id": overall_exam.writing_test_id,
        "speaking_test_id": overall_exam.speaking_test_id,
        "listening_exam_id": overall_exam.listening_exam_id,
        "reading_exam_id": overall_exam.reading_exam_id,
        "writing_exam_id": overall_exam.writing_exam_id,
        "speaking_exam_id": overall_exam.speaking_exam_id,
        "modules": _serialize_overall_modules(overall_exam),
        "created_at": overall_exam.created_at,
        "updated_at": overall_exam.updated_at,
    }


def _serialize_overall_exam_result(overall_exam: OverallExam) -> dict[str, Any]:
    overall_band, overall_band_pending = _calculate_overall_band(overall_exam)
    return {
        "id": overall_exam.id,
        "user_id": overall_exam.user_id,
        "status": overall_exam.status,
        "phase": overall_exam.phase,
        "result": _resolve_overall_result_status(overall_exam),
        "overall_band": overall_band,
        "overall_band_pending": overall_band_pending,
        "started_at": overall_exam.started_at,
        "finished_at": overall_exam.finished_at,
        "finish_reason": overall_exam.finish_reason.value if overall_exam.finish_reason else None,
        "modules": _serialize_overall_modules(overall_exam),
    }


def _serialize_overall_exam_list_item(overall_exam: OverallExam) -> dict[str, Any]:
    overall_band, overall_band_pending = _calculate_overall_band(overall_exam)
    return {
        "id": overall_exam.id,
        "status": overall_exam.status,
        "phase": overall_exam.phase,
        "result": _resolve_overall_result_status(overall_exam),
        "current_module": overall_exam.current_module,
        "overall_band": overall_band,
        "overall_band_pending": overall_band_pending,
        "started_at": overall_exam.started_at,
        "finished_at": overall_exam.finished_at,
        "finish_reason": overall_exam.finish_reason.value if overall_exam.finish_reason else None,
        "listening_test_id": overall_exam.listening_test_id,
        "reading_test_id": overall_exam.reading_test_id,
        "writing_test_id": overall_exam.writing_test_id,
        "speaking_test_id": overall_exam.speaking_test_id,
        "listening_exam_id": overall_exam.listening_exam_id,
        "reading_exam_id": overall_exam.reading_exam_id,
        "writing_exam_id": overall_exam.writing_exam_id,
        "speaking_exam_id": overall_exam.speaking_exam_id,
        "created_at": overall_exam.created_at,
        "updated_at": overall_exam.updated_at,
    }


def _sort_overall_attempts(
    items: list[dict[str, Any]],
    ordering: str,
) -> list[dict[str, Any]]:
    normalized_ordering = (
        ordering if ordering in ALLOWED_OVERALL_ATTEMPTS_ORDERING else DEFAULT_OVERALL_ATTEMPTS_ORDERING
    )
    reverse = normalized_ordering.startswith("-")
    field = normalized_ordering[1:] if reverse else normalized_ordering

    non_null_items = [item for item in items if item.get(field) is not None]
    null_items = [item for item in items if item.get(field) is None]

    if field in {"created_at", "updated_at", "started_at", "finished_at"}:

        def key_fn(item: dict[str, Any]) -> Any:
            return item[field]

    else:

        def key_fn(item: dict[str, Any]) -> Any:
            return float(item[field])

    sorted_items = sorted(non_null_items, key=key_fn, reverse=reverse)
    return sorted_items + null_items


async def _get_overall_exam_owned(db: AsyncSession, overall_id: int, user_id: int) -> OverallExam:
    overall_exam = await repository.get_overall_exam_with_relations(db, overall_id)
    if overall_exam is None:
        raise ApiError(code="overall_exam_not_found", message="Overall exam not found", status_code=404)
    if overall_exam.user_id != user_id:
        raise ApiError(code="forbidden", message="Cannot access attempt owned by another user", status_code=403)
    return overall_exam


async def _apply_overall_transition_after_submit(
    db: AsyncSession,
    *,
    module: OverallModuleKind,
    exam_id: int,
    finish_reason: FinishReasonEnum | None,
    finished_at: datetime | None,
) -> None:
    overall_exam = await repository.get_in_progress_overall_by_module_exam(db, module=module, exam_id=exam_id)
    if overall_exam is None:
        return

    if finish_reason == FinishReasonEnum.left:
        overall_exam.status = "terminated"
        overall_exam.phase = "terminated"
        overall_exam.finished_at = finished_at or datetime.now(UTC)
        overall_exam.finish_reason = FinishReasonEnum.left
        overall_exam.break_started_at = None
        await db.commit()
        return

    if module == "speaking":
        overall_exam.status = "completed"
        overall_exam.phase = "completed"
        overall_exam.current_module = "speaking"
        overall_exam.finished_at = finished_at or datetime.now(UTC)
        overall_exam.finish_reason = FinishReasonEnum.completed
        overall_exam.break_started_at = None
        await db.commit()
        return

    overall_exam.phase = "break"
    overall_exam.current_module = module
    overall_exam.break_started_at = datetime.now(UTC)
    await db.commit()


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
    elif kind == "writing":
        test = await repository.get_writing_test(db, test_id)
        if not test:
            raise ApiError(code="writing_test_not_found", message="Writing test not found", status_code=404)
        exam = WritingExam(user_id=user.id, writing_test_id=test_id)
    else:
        test = await repository.get_speaking_test(db, test_id)
        if not test:
            raise ApiError(code="speaking_test_not_found", message="Speaking test not found", status_code=404)
        exam = SpeakingExam(
            user_id=user.id,
            speaking_test_id=test_id,
            current_part_id="part1",
            current_question_index=0,
            note_draft="",
        )

    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return _serialize_exam_summary(kind, exam)


async def start_exam(db: AsyncSession, user: User, kind: ExamKind, exam_id: int) -> dict[str, Any]:
    if kind == "reading":
        exam = await _get_reading_exam_owned(db, exam_id, user.id)
    elif kind == "listening":
        exam = await _get_listening_exam_owned(db, exam_id, user.id)
    elif kind == "writing":
        exam = await _get_writing_exam_owned(db, exam_id, user.id)
    else:
        exam = await _get_speaking_exam_owned(db, exam_id, user.id)

    if exam.started_at is None:
        exam.started_at = datetime.now(UTC)
        if kind == "speaking":
            exam.session_status = "connected"
            exam.connection_state = "connected"
        await db.commit()

    return _serialize_exam_summary(kind, exam)


async def save_reading_exam_draft(
    db: AsyncSession,
    user: User,
    exam_id: int,
    answers: list[dict[str, Any]],
) -> dict[str, Any]:
    exam = await _get_reading_exam_owned(db, exam_id, user.id)
    if exam.finished_at is not None:
        raise ApiError(code="exam_already_finished", message="Reading exam is already finished", status_code=409)

    question_index: dict[int, ReadingQuestion] = {
        question.id: question
        for passage in exam.reading_test.passages
        for block in passage.question_blocks
        for question in block.questions
    }
    normalized_answers = validate_reading_draft_payload(answers, question_index=question_index)

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

    if exam.started_at is None:
        exam.started_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(exam)
    return {
        "saved_items": len(normalized_answers),
        "started_at": exam.started_at,
        "updated_at": exam.updated_at,
    }


async def save_listening_exam_draft(
    db: AsyncSession,
    user: User,
    exam_id: int,
    answers: list[dict[str, Any]],
) -> dict[str, Any]:
    exam = await _get_listening_exam_owned(db, exam_id, user.id)
    if exam.finished_at is not None:
        raise ApiError(code="exam_already_finished", message="Listening exam is already finished", status_code=409)

    question_index: dict[int, ListeningQuestion] = {
        question.id: question
        for part in exam.listening_test.parts
        for block in part.question_blocks
        for question in block.questions
    }
    normalized_answers = validate_listening_draft_payload(answers, question_index=question_index)

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

    if exam.started_at is None:
        exam.started_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(exam)
    return {
        "saved_items": len(normalized_answers),
        "started_at": exam.started_at,
        "updated_at": exam.updated_at,
    }


async def save_writing_exam_draft(
    db: AsyncSession,
    user: User,
    exam_id: int,
    parts_payload: list[dict[str, Any]],
) -> dict[str, Any]:
    exam = await _get_writing_exam_owned(db, exam_id, user.id)
    if exam.finished_at is not None:
        raise ApiError(code="exam_already_finished", message="Writing exam is already finished", status_code=409)

    part_index = {part.id: part for part in exam.writing_test.writing_parts}
    normalized_parts = validate_writing_draft_payload(parts_payload, part_ids=set(part_index.keys()))

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

    if exam.started_at is None:
        exam.started_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(exam)
    return {
        "saved_items": len(normalized_parts),
        "started_at": exam.started_at,
        "updated_at": exam.updated_at,
    }


def _extract_correct_answers_for_question(question: Any) -> list[str]:
    values: list[str] = []
    values.extend([str(option.option_text).strip() for option in question.options if option.is_correct])
    values.extend([str(answer.correct_answers).strip() for answer in question.answers])

    unique: list[str] = []
    for item in values:
        if item and item.lower() not in {x.lower() for x in unique}:
            unique.append(item)
    return unique


def _normalize_answer_for_match(value: str) -> str:
    normalized = str(value or "").strip().lower()
    normalized = normalized.replace("&", " and ")
    normalized = _ANSWER_NORMALIZE_RE.sub(" ", normalized)
    normalized = " ".join(normalized.split())

    tokens = [token for token in normalized.split(" ") if token]
    if len(tokens) > 1:
        tokens = [token for token in tokens if token not in _ANSWER_ARTICLES]
    return " ".join(tokens).strip()


def _expand_candidate_answers(valid_answers: list[str]) -> set[str]:
    candidates: set[str] = set()
    for raw in valid_answers:
        candidate = str(raw or "").strip()
        if not candidate:
            continue
        candidates.add(candidate)
        split_items = [item.strip() for item in _ANSWER_SPLIT_RE.split(candidate) if item.strip()]
        candidates.update(split_items)
    return candidates


def _match_answer(user_answer: str, valid_answers: list[str]) -> bool:
    normalized_user_answer = _normalize_answer_for_match(user_answer)
    if not normalized_user_answer:
        return False

    expanded_candidates = _expand_candidate_answers(valid_answers)
    return any(
        normalized_user_answer == _normalize_answer_for_match(candidate)
        for candidate in expanded_candidates
    )


async def submit_reading_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    answers: list[dict[str, Any]],
    *,
    finish_reason_override: SubmitFinishReasonOverride | None = None,
) -> dict[str, Any]:
    exam = await _get_reading_exam_owned(db, exam_id, user.id)
    time_limit_seconds = int(exam.reading_test.time_limit)

    if exam.finished_at is not None:
        await _ensure_post_exam_assignments(
            db,
            user=user,
            kind="reading",
            exam_id=exam.id,
        )
        await _ensure_auto_summary_for_exam(
            db,
            user=user,
            module=AiSummaryModuleEnum.reading,
            exam_id=exam.id,
        )
        await _apply_overall_transition_after_submit(
            db,
            module="reading",
            exam_id=exam.id,
            finish_reason=exam.finish_reason,
            finished_at=exam.finished_at,
        )
        return _serialize_objective_exam_result("reading", exam, exam.question_answers)

    question_index: dict[int, ReadingQuestion] = {
        question.id: question
        for passage in exam.reading_test.passages
        for block in passage.question_blocks
        for question in block.questions
    }

    normalized_answers = validate_reading_submit_payload(answers, question_index=question_index)

    correct_count = 0

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

        if is_correct:
            correct_count += 1

    finished_at = datetime.now(UTC)
    if exam.started_at is None:
        exam.started_at = finished_at

    elapsed_seconds = _calculate_elapsed_seconds(exam.started_at, finished_at)
    forced_reason = FinishReasonEnum(finish_reason_override) if finish_reason_override else None
    exam.finished_at = finished_at
    exam.finish_reason = _resolve_finish_reason(
        elapsed_seconds,
        time_limit_seconds,
        forced_reason=forced_reason,
    )
    await _record_exam_progress(
        db,
        user_id=user.id,
        test_type=ProgressTestTypeEnum.reading,
        band_score=_objective_band_score("reading", correct_count),
        correct_answers=correct_count,
        total_questions=len(question_index),
        time_taken_seconds=_calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
        test_date=exam.finished_at,
    )
    await db.commit()

    await _ensure_post_exam_assignments(
        db,
        user=user,
        kind="reading",
        exam_id=exam.id,
    )

    await _ensure_auto_summary_for_exam(
        db,
        user=user,
        module=AiSummaryModuleEnum.reading,
        exam_id=exam.id,
    )

    await _apply_overall_transition_after_submit(
        db,
        module="reading",
        exam_id=exam.id,
        finish_reason=exam.finish_reason,
        finished_at=exam.finished_at,
    )

    return {
        "result": _resolve_exam_result_status(exam),
        "score": _objective_band_score("reading", correct_count),
        "correct_answers": correct_count,
        "time_spent": _calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
    }


async def submit_listening_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    answers: list[dict[str, Any]],
    *,
    finish_reason_override: SubmitFinishReasonOverride | None = None,
) -> dict[str, Any]:
    exam = await _get_listening_exam_owned(db, exam_id, user.id)
    time_limit_seconds = int(exam.listening_test.time_limit)

    if exam.finished_at is not None:
        await _ensure_post_exam_assignments(
            db,
            user=user,
            kind="listening",
            exam_id=exam.id,
        )
        await _ensure_auto_summary_for_exam(
            db,
            user=user,
            module=AiSummaryModuleEnum.listening,
            exam_id=exam.id,
        )
        await _apply_overall_transition_after_submit(
            db,
            module="listening",
            exam_id=exam.id,
            finish_reason=exam.finish_reason,
            finished_at=exam.finished_at,
        )
        return _serialize_objective_exam_result("listening", exam, exam.question_answers)

    question_index: dict[int, ListeningQuestion] = {
        question.id: question
        for part in exam.listening_test.parts
        for block in part.question_blocks
        for question in block.questions
    }

    normalized_answers = validate_listening_submit_payload(answers, question_index=question_index)

    correct_count = 0

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

        if is_correct:
            correct_count += 1

    finished_at = datetime.now(UTC)
    if exam.started_at is None:
        exam.started_at = finished_at

    elapsed_seconds = _calculate_elapsed_seconds(exam.started_at, finished_at)
    forced_reason = FinishReasonEnum(finish_reason_override) if finish_reason_override else None
    exam.finished_at = finished_at
    exam.finish_reason = _resolve_finish_reason(
        elapsed_seconds,
        time_limit_seconds,
        forced_reason=forced_reason,
    )
    await _record_exam_progress(
        db,
        user_id=user.id,
        test_type=ProgressTestTypeEnum.listening,
        band_score=_objective_band_score("listening", correct_count),
        correct_answers=correct_count,
        total_questions=len(question_index),
        time_taken_seconds=_calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
        test_date=exam.finished_at,
    )
    await db.commit()

    await _ensure_post_exam_assignments(
        db,
        user=user,
        kind="listening",
        exam_id=exam.id,
    )

    await _ensure_auto_summary_for_exam(
        db,
        user=user,
        module=AiSummaryModuleEnum.listening,
        exam_id=exam.id,
    )

    await _apply_overall_transition_after_submit(
        db,
        module="listening",
        exam_id=exam.id,
        finish_reason=exam.finish_reason,
        finished_at=exam.finished_at,
    )

    return {
        "result": _resolve_exam_result_status(exam),
        "score": _objective_band_score("listening", correct_count),
        "correct_answers": correct_count,
        "time_spent": _calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
    }


async def submit_writing_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    parts_payload: list[dict[str, Any]],
    *,
    finish_reason_override: SubmitFinishReasonOverride | None = None,
) -> dict[str, Any]:
    exam = await _get_writing_exam_owned(db, exam_id, user.id)
    time_limit_seconds = int(exam.writing_test.time_limit)

    if exam.finished_at is not None:
        await _ensure_post_exam_assignments(
            db,
            user=user,
            kind="writing",
            exam_id=exam.id,
        )
        await _ensure_auto_summary_for_exam(
            db,
            user=user,
            module=AiSummaryModuleEnum.writing,
            exam_id=exam.id,
        )
        await _apply_overall_transition_after_submit(
            db,
            module="writing",
            exam_id=exam.id,
            finish_reason=exam.finish_reason,
            finished_at=exam.finished_at,
        )
        return _serialize_writing_exam_result(exam)

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
    forced_reason = FinishReasonEnum(finish_reason_override) if finish_reason_override else None
    exam.finished_at = finished_at
    exam.finish_reason = _resolve_finish_reason(
        elapsed_seconds,
        time_limit_seconds,
        forced_reason=forced_reason,
    )
    await _record_exam_progress(
        db,
        user_id=user.id,
        test_type=ProgressTestTypeEnum.writing,
        band_score=_calculate_writing_estimated_band(exam.writing_parts),
        correct_answers=None,
        total_questions=len(part_index),
        time_taken_seconds=_calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
        test_date=exam.finished_at,
    )
    await db.commit()

    await _ensure_post_exam_assignments(
        db,
        user=user,
        kind="writing",
        exam_id=exam.id,
    )

    serialized_exam = await _get_writing_exam_owned(db, exam.id, user.id)

    await _ensure_auto_summary_for_exam(
        db,
        user=user,
        module=AiSummaryModuleEnum.writing,
        exam_id=exam.id,
    )

    for exam_part_id in exam_part_ids:
        try:
            await enqueue_writing_evaluation(exam_part_id)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Failed to enqueue writing AI evaluation",
                extra={"exam_id": exam.id, "exam_part_id": exam_part_id},
            )

    await _apply_overall_transition_after_submit(
        db,
        module="writing",
        exam_id=exam.id,
        finish_reason=exam.finish_reason,
        finished_at=exam.finished_at,
    )

    return _serialize_writing_exam_result(serialized_exam)


async def get_exam_result(
    db: AsyncSession,
    user: User,
    kind: ExamKind,
    exam_id: int,
) -> dict[str, Any]:
    if kind == "reading":
        exam = await _get_reading_exam_owned(db, exam_id, user.id)
        return _serialize_objective_exam_result("reading", exam, exam.question_answers)
    if kind == "listening":
        exam = await _get_listening_exam_owned(db, exam_id, user.id)
        return _serialize_objective_exam_result("listening", exam, exam.question_answers)

    exam = await _get_writing_exam_owned(db, exam_id, user.id)
    await _ensure_post_exam_assignments(
        db,
        user=user,
        kind="writing",
        exam_id=exam.id,
    )
    return _serialize_writing_exam_result(exam)


async def get_my_exams(
    db: AsyncSession,
    user: User,
    reading_offset: int,
    listening_offset: int,
    writing_offset: int,
    speaking_offset: int,
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
    speaking_rows = await repository.list_user_speaking_exams(
        db,
        user_id=user.id,
        offset=speaking_offset,
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
        "speaking": serialize_page(
            speaking_rows,
            serializer=lambda exam: _serialize_exam_summary("speaking", exam),
            limit=limit,
            offset=speaking_offset,
        ).model_dump(),
    }


async def list_student_attempts(
    db: AsyncSession,
    user: User,
    *,
    search: str | None,
    module: ExamKind | None,
    test_id: int | None,
    status: ExamAttemptStatus | None,
    ordering: str,
    offset: int,
    limit: int,
) -> dict[str, Any]:
    normalized_offset = normalize_offset(offset)
    normalized_limit = normalize_limit(limit)
    normalized_ordering = (
        ordering if ordering in ALLOWED_STUDENT_ATTEMPTS_ORDERING else DEFAULT_STUDENT_ATTEMPTS_ORDERING
    )

    rows = await repository.list_student_attempt_rows(
        db,
        user_id=user.id,
        module=module,
        search=search,
        test_id=test_id,
        status=status,
        ordering=normalized_ordering,
        offset=normalized_offset,
        limit=normalized_limit,
    )
    count = await repository.count_student_attempt_rows(
        db,
        user_id=user.id,
        module=module,
        search=search,
        test_id=test_id,
        status=status,
    )

    items = [
        {
            "id": int(row["id"]),
            "kind": str(row["kind"]),
            "test_id": int(row["test_id"]),
            "test_title": str(row["test_title"]),
            "time_limit": int(row["time_limit"] or 0),
            "status": str(row["status"]),
            "finish_reason": str(row["finish_reason"]) if row["finish_reason"] is not None else None,
            "started_at": row["started_at"],
            "finished_at": row["finished_at"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "estimated_band": float(row["estimated_band"]) if row["estimated_band"] is not None else None,
        }
        for row in rows
    ]

    return {
        "items": items,
        "count": count,
        "limit": normalized_limit,
        "offset": normalized_offset,
    }


def _normalize_iso(value: datetime | None, fallback: datetime) -> str:
    target = value or fallback
    if target.tzinfo is None:
        target = target.replace(tzinfo=UTC)
    return target.astimezone(UTC).isoformat()


def _safe_list_of_dict(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    output: list[dict[str, Any]] = []
    for item in value:
        if isinstance(item, dict):
            output.append(item)
    return output


def _build_speaking_session_from_exam(exam: SpeakingExam) -> SpeakingSessionState:
    test_payload = serialize_speaking_test_detail(exam.speaking_test)
    test_detail = SpeakingTestDetail.model_validate(test_payload)

    first_part_id = test_detail.parts[0].id.value if test_detail.parts else "part1"

    raw_payload = {
        "id": str(exam.id),
        "test_id": exam.speaking_test_id,
        "attempt_id": f"speaking-attempt-{exam.id}",
        "title": exam.speaking_test.title,
        "status": exam.session_status,
        "connection_state": exam.connection_state,
        "current_speaker": exam.current_speaker,
        "current_part_id": exam.current_part_id or first_part_id,
        "current_question_index": exam.current_question_index,
        "asked_question_ids": list(exam.asked_question_ids or []),
        "note_draft": exam.note_draft or "",
        "started_at": _normalize_iso(exam.started_at, exam.created_at),
        "updated_at": _normalize_iso(exam.updated_at, exam.created_at),
        "completed_at": _normalize_iso(exam.finished_at, exam.created_at) if exam.finished_at else None,
        "elapsed_seconds": int(exam.elapsed_seconds or 0),
        "prep_remaining_seconds": int(exam.prep_remaining_seconds or 0),
        "transcript_segments": _safe_list_of_dict(exam.transcript_segments),
        "turns": _safe_list_of_dict(exam.turns),
        "integrity_events": _safe_list_of_dict(exam.integrity_events),
        "result": exam.result_json,
    }
    return SpeakingSessionState.model_validate(raw_payload)


def _apply_speaking_session_to_exam(exam: SpeakingExam, session: SpeakingSessionState) -> None:
    exam.session_status = session.status.value
    exam.connection_state = session.connection_state.value
    exam.current_speaker = session.current_speaker.value
    exam.current_part_id = session.current_part_id.value
    exam.current_question_index = session.current_question_index
    exam.asked_question_ids = list(session.asked_question_ids)
    exam.note_draft = session.note_draft
    exam.elapsed_seconds = session.elapsed_seconds
    exam.prep_remaining_seconds = session.prep_remaining_seconds
    exam.transcript_segments = [segment.model_dump(mode="json") for segment in session.transcript_segments]
    exam.turns = [turn.model_dump(mode="json") for turn in session.turns]
    exam.integrity_events = [event.model_dump(mode="json") for event in session.integrity_events]
    exam.result_json = session.result.model_dump(mode="json") if session.result else None


async def get_speaking_exam_session_owned(
    db: AsyncSession,
    user: User,
    exam_id: int,
) -> dict[str, Any]:
    exam = await _get_speaking_exam_owned(db, exam_id, user.id)
    return _build_speaking_session_from_exam(exam).model_dump(mode="json")


async def persist_speaking_exam_session(
    db: AsyncSession,
    user: User,
    exam_id: int,
    session: SpeakingSessionState,
) -> dict[str, Any]:
    exam = await _get_speaking_exam_owned(db, exam_id, user.id)

    if session.id != str(exam_id):
        raise ApiError(code="exam_session_mismatch", message="Speaking session id mismatch", status_code=400)
    if session.test_id != exam.speaking_test_id:
        raise ApiError(code="exam_session_mismatch", message="Speaking test id mismatch", status_code=400)

    if exam.started_at is None:
        exam.started_at = datetime.now(UTC)

    _apply_speaking_session_to_exam(exam, session)

    if session.status in {SpeakingSessionStatus.finished, SpeakingSessionStatus.terminated} and exam.finished_at is None:
        exam.finished_at = datetime.now(UTC)
        exam.finish_reason = (
            FinishReasonEnum.completed
            if session.status == SpeakingSessionStatus.finished
            else FinishReasonEnum.left
        )

    await db.commit()
    await db.refresh(exam)

    await speaking_realtime_hub.emit(
        exam.id,
        LiveServerEvent(
            type="server.session.persisted",
            exam_id=exam.id,
            message="Speaking session snapshot stored on backend.",
            payload={"status": exam.session_status, "connection": exam.connection_state},
        ),
    )

    return _build_speaking_session_from_exam(exam).model_dump(mode="json")


async def decide_speaking_examiner_turn(
    db: AsyncSession,
    user: User,
    exam_id: int,
    payload: SpeakingExaminerDecisionIn,
) -> dict[str, Any]:
    exam = await _get_speaking_exam_owned(db, exam_id, user.id)
    if payload.session.test_id != exam.speaking_test_id:
        raise ApiError(code="exam_session_mismatch", message="Speaking test id mismatch", status_code=400)

    test_payload = serialize_speaking_test_detail(exam.speaking_test)
    test_detail = SpeakingTestDetail.model_validate(test_payload)

    decision = await decide_examiner_turn(payload, test_detail)
    return SpeakingExaminerDecisionOut.model_validate(decision).model_dump(mode="json")


async def finalize_speaking_exam(
    db: AsyncSession,
    user: User,
    exam_id: int,
    session: SpeakingSessionState,
) -> dict[str, Any]:
    exam = await _get_speaking_exam_owned(db, exam_id, user.id)
    if session.id != str(exam.id):
        raise ApiError(code="exam_session_mismatch", message="Speaking session id mismatch", status_code=400)

    test_payload = serialize_speaking_test_detail(exam.speaking_test)
    test_detail = SpeakingTestDetail.model_validate(test_payload)

    session_copy = session.model_copy(deep=True)
    session_copy.result = await score_speaking_session(session_copy, test_detail)

    completed_at_dt = datetime.now(UTC)
    if session_copy.completed_at is None:
        session_copy.completed_at = completed_at_dt.isoformat()

    if session_copy.status not in {SpeakingSessionStatus.finished, SpeakingSessionStatus.terminated}:
        session_copy.status = SpeakingSessionStatus.finished

    session_copy.connection_state = SpeakingConnectionState.disconnected
    session_copy.current_speaker = SpeakingSpeaker.none

    _apply_speaking_session_to_exam(exam, session_copy)

    if exam.started_at is None:
        exam.started_at = completed_at_dt
    exam.finished_at = completed_at_dt
    exam.finish_reason = (
        FinishReasonEnum.left
        if session_copy.status == SpeakingSessionStatus.terminated
        else _resolve_finish_reason(
            session_copy.elapsed_seconds,
            int(exam.speaking_test.duration_minutes * 60),
        )
    )
    await _record_exam_progress(
        db,
        user_id=user.id,
        test_type=ProgressTestTypeEnum.speaking,
        band_score=session_copy.result.overall_band if session_copy.result else None,
        correct_answers=None,
        total_questions=len(session_copy.asked_question_ids),
        time_taken_seconds=_calculate_result_time_spent_seconds(exam.started_at, exam.finished_at),
        test_date=exam.finished_at,
    )

    await db.commit()
    await db.refresh(exam)

    await _ensure_post_exam_assignments(
        db,
        user=user,
        kind="speaking",
        exam_id=exam.id,
    )

    attempt_status = (
        SpeakingAttemptStatus.suspicious
        if session_copy.integrity_events
        else SpeakingAttemptStatus.completed
    )

    attempt = SpeakingAttemptOut(
        id=f"speaking-attempt-{exam.id}",
        exam_id=exam.id,
        session_id=str(exam.id),
        test_id=exam.speaking_test_id,
        title=exam.speaking_test.title,
        started_at=_normalize_iso(exam.started_at, exam.created_at),
        completed_at=_normalize_iso(exam.finished_at, exam.created_at),
        duration_seconds=session_copy.elapsed_seconds,
        overall_band=session_copy.result.overall_band if session_copy.result else None,
        criteria=session_copy.result.criteria if session_copy.result else [],
        status=attempt_status,
        integrity_events=session_copy.integrity_events,
        result=session_copy.result,
        transcript_segments=session_copy.transcript_segments,
        question_ids=session_copy.asked_question_ids,
    )

    await speaking_realtime_hub.emit(
        exam.id,
        LiveServerEvent(
            type="server.session.finalized",
            exam_id=exam.id,
            message="Speaking session finalized and attempt stored.",
            payload={"attemptId": attempt.id, "overallBand": attempt.overall_band},
        ),
    )

    await _apply_overall_transition_after_submit(
        db,
        module="speaking",
        exam_id=exam.id,
        finish_reason=exam.finish_reason,
        finished_at=exam.finished_at,
    )

    return attempt.model_dump(mode="json")


async def get_speaking_exam_session(exam_id: int, db: AsyncSession) -> dict[str, Any] | None:
    exam = await repository.get_speaking_exam_with_relations(db, exam_id)
    if exam is None:
        return None
    return _build_speaking_session_from_exam(exam).model_dump(mode="json")


async def persist_speaking_session_payload(
    exam_id: int,
    session: SpeakingSessionState,
    db: AsyncSession,
) -> None:
    exam = await repository.get_speaking_exam_with_relations(db, exam_id)
    if exam is None:
        return

    if session.id != str(exam_id):
        raise ApiError(code="exam_session_mismatch", message="Speaking session id mismatch", status_code=400)
    if session.test_id != exam.speaking_test_id:
        raise ApiError(code="exam_session_mismatch", message="Speaking test id mismatch", status_code=400)

    _apply_speaking_session_to_exam(exam, session)
    await db.commit()


async def mark_speaking_session_terminated(exam_id: int, db: AsyncSession) -> None:
    exam = await repository.get_speaking_exam_with_relations(db, exam_id)
    if exam is None:
        return

    exam.session_status = "terminated"
    exam.connection_state = "disconnected"
    if exam.finished_at is None:
        exam.finished_at = datetime.now(UTC)
    if exam.finish_reason is None:
        exam.finish_reason = FinishReasonEnum.left
    await db.commit()


async def mark_speaking_connection_disconnected(exam_id: int, db: AsyncSession) -> None:
    exam = await repository.get_speaking_exam_with_relations(db, exam_id)
    if exam is None:
        return

    exam.connection_state = "disconnected"
    await db.commit()


async def start_overall_exam(
    db: AsyncSession,
    user: User,
) -> dict[str, Any]:
    existing = await repository.get_in_progress_overall_exam_by_user(db, user_id=user.id)
    if existing is not None:
        return _serialize_overall_exam_state(existing)

    listening_test = await repository.get_first_active_listening_test(db)
    if listening_test is None:
        raise ApiError(
            code="listening_test_not_found",
            message="No active listening tests available",
            status_code=404,
        )

    reading_test = await repository.get_first_active_reading_test(db)
    if reading_test is None:
        raise ApiError(
            code="reading_test_not_found",
            message="No active reading tests available",
            status_code=404,
        )

    writing_test = await repository.get_first_active_writing_test(db)
    if writing_test is None:
        raise ApiError(
            code="writing_test_not_found",
            message="No active writing tests available",
            status_code=404,
        )

    speaking_test = await repository.get_first_active_speaking_test(db)
    if speaking_test is None:
        raise ApiError(
            code="speaking_test_not_found",
            message="No active speaking tests available",
            status_code=404,
        )

    started_at = datetime.now(UTC)
    listening_exam = ListeningExam(
        user_id=user.id,
        listening_test_id=listening_test.id,
        started_at=started_at,
    )
    db.add(listening_exam)
    await db.flush()

    overall_exam = OverallExam(
        user_id=user.id,
        status="in_progress",
        phase="module",
        current_module="listening",
        started_at=started_at,
        break_duration_seconds=BREAK_DURATION_SECONDS,
        listening_test_id=listening_test.id,
        reading_test_id=reading_test.id,
        writing_test_id=writing_test.id,
        speaking_test_id=speaking_test.id,
        listening_exam_id=listening_exam.id,
    )
    db.add(overall_exam)
    await db.commit()

    refreshed = await _get_overall_exam_owned(db, overall_exam.id, user.id)
    return _serialize_overall_exam_state(refreshed)


async def get_overall_exam_state(
    db: AsyncSession,
    user: User,
    overall_id: int,
) -> dict[str, Any]:
    overall_exam = await _get_overall_exam_owned(db, overall_id, user.id)
    return _serialize_overall_exam_state(overall_exam)


async def continue_overall_exam(
    db: AsyncSession,
    user: User,
    overall_id: int,
) -> dict[str, Any]:
    overall_exam = await _get_overall_exam_owned(db, overall_id, user.id)

    if overall_exam.status != "in_progress":
        return _serialize_overall_exam_state(overall_exam)

    if overall_exam.phase != "break":
        raise ApiError(
            code="overall_exam_phase_invalid",
            message="Overall exam is not waiting on break",
            status_code=400,
        )

    if overall_exam.current_module == "listening":
        next_module: OverallModuleKind = "reading"
        if overall_exam.reading_exam_id is None:
            next_exam = ReadingExam(
                user_id=user.id,
                reading_test_id=overall_exam.reading_test_id,
                started_at=datetime.now(UTC),
            )
            db.add(next_exam)
            await db.flush()
            overall_exam.reading_exam_id = next_exam.id
    elif overall_exam.current_module == "reading":
        next_module = "writing"
        if overall_exam.writing_exam_id is None:
            next_exam = WritingExam(
                user_id=user.id,
                writing_test_id=overall_exam.writing_test_id,
                started_at=datetime.now(UTC),
            )
            db.add(next_exam)
            await db.flush()
            overall_exam.writing_exam_id = next_exam.id
    elif overall_exam.current_module == "writing":
        next_module = "speaking"
        if overall_exam.speaking_exam_id is None:
            next_exam = SpeakingExam(
                user_id=user.id,
                speaking_test_id=overall_exam.speaking_test_id,
                current_part_id="part1",
                current_question_index=0,
                note_draft="",
            )
            db.add(next_exam)
            await db.flush()
            overall_exam.speaking_exam_id = next_exam.id
    else:
        raise ApiError(
            code="overall_exam_phase_invalid",
            message="No next module available for continuation",
            status_code=400,
        )

    overall_exam.phase = "module"
    overall_exam.current_module = next_module
    overall_exam.break_started_at = None
    await db.commit()

    refreshed = await _get_overall_exam_owned(db, overall_exam.id, user.id)
    return _serialize_overall_exam_state(refreshed)


async def get_overall_exam_result(
    db: AsyncSession,
    user: User,
    overall_id: int,
) -> dict[str, Any]:
    overall_exam = await _get_overall_exam_owned(db, overall_id, user.id)
    return _serialize_overall_exam_result(overall_exam)


async def list_overall_exams(
    db: AsyncSession,
    user: User,
    *,
    status: OverallExamStatus | None,
    ordering: str,
    offset: int,
    limit: int,
) -> dict[str, Any]:
    rows = await repository.list_all_user_overall_exams_with_relations(db, user_id=user.id)
    serialized = [_serialize_overall_exam_list_item(item) for item in rows]

    if status is not None:
        serialized = [item for item in serialized if item["status"] == status]

    sorted_rows = _sort_overall_attempts(serialized, ordering)
    normalized_offset = normalize_offset(offset)
    normalized_limit = normalize_limit(limit)
    paged_rows = sorted_rows[normalized_offset : normalized_offset + normalized_limit]

    return {
        "items": paged_rows,
        "count": len(sorted_rows),
        "limit": normalized_limit,
        "offset": normalized_offset,
    }
