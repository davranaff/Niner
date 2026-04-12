from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.errors import ApiError
from app.core.pagination import page_response
from app.core.security import generate_random_token, sha256_token
from app.db.models import (
    FinishReasonEnum,
    ListeningExam,
    ReadingExam,
    RoleEnum,
    SpeakingExam,
    TeacherStudentInvite,
    TeacherStudentLink,
    User,
    WritingExam,
)
from app.modules.exams import repository as exams_repository
from app.modules.exams.score import listening_band_score, reading_band_score, round_band_to_half
from app.modules.teacher_students import repository


def _is_expired(expires_at: datetime) -> bool:
    now = datetime.now(UTC)
    if expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    return expires_at <= now


async def create_invite(db: AsyncSession, teacher: User) -> dict[str, object]:
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can create invites", status_code=403)

    token = generate_random_token(24)
    expires_at = datetime.now(UTC) + timedelta(hours=24)

    invite = TeacherStudentInvite(
        teacher_id=teacher.id,
        token_hash=sha256_token(token),
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()

    query = urlencode(
        {
            "token": token,
            "teacher_id": teacher.id,
            "teacher_email": teacher.email,
        }
    )
    invite_link = f"{settings.frontend_base_url.rstrip('/')}/teacher-invite?{query}"

    return {
        "invite_token": token,
        "invite_link": invite_link,
        "expires_at": expires_at,
    }


async def accept_invite(db: AsyncSession, student: User, token: str) -> dict[str, object]:
    if student.role != RoleEnum.student:
        raise ApiError(code="forbidden", message="Only students can accept invite", status_code=403)

    token_hash = sha256_token(token)
    invite = await repository.get_invite_by_token_hash(db, token_hash)
    if invite is None:
        raise ApiError(code="invalid_invite", message="Invite token is invalid", status_code=404)

    if invite.used_at is not None:
        raise ApiError(code="invalid_invite", message="Invite token already used", status_code=400)

    if _is_expired(invite.expires_at):
        raise ApiError(code="invalid_invite", message="Invite token expired", status_code=400)

    existing_link = await repository.get_active_link_by_student_id(db, student.id)
    if existing_link is not None:
        raise ApiError(
            code="teacher_already_linked",
            message="Student already linked to a teacher",
            status_code=409,
        )

    link = TeacherStudentLink(teacher_id=invite.teacher_id, student_id=student.id)
    invite.used_at = datetime.now(UTC)
    invite.used_by_student_id = student.id
    db.add(link)
    await db.commit()

    teacher = await db.get(User, invite.teacher_id)
    if teacher is None:
        raise ApiError(code="teacher_not_found", message="Teacher not found", status_code=404)

    return {
        "teacher_id": teacher.id,
        "student_id": student.id,
        "student_email": student.email,
        "student_first_name": student.first_name,
        "student_last_name": student.last_name,
    }


async def list_students(
    db: AsyncSession,
    teacher: User,
    *,
    limit: int,
    offset: int,
):
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can list linked students", status_code=403)

    rows = await repository.list_students_for_teacher(db, teacher_id=teacher.id, limit=limit, offset=offset)
    items = [
        {
            "teacher_id": row.teacher_id,
            "student_id": row.student_id,
            "student_email": row.student.email,
            "student_first_name": row.student.first_name,
            "student_last_name": row.student.last_name,
        }
        for row in rows
    ]
    return page_response(items=items, limit=limit, offset=offset).model_dump()


async def unbind_by_teacher(db: AsyncSession, teacher: User, student_id: int) -> None:
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can unbind students", status_code=403)

    link = await repository.get_link_by_teacher_student(db, teacher_id=teacher.id, student_id=student_id)
    if link is None:
        raise ApiError(code="link_not_found", message="Teacher-student link not found", status_code=404)

    await db.delete(link)
    await db.commit()


async def unbind_self(db: AsyncSession, student: User) -> None:
    if student.role != RoleEnum.student:
        raise ApiError(code="forbidden", message="Only students can unbind from teacher", status_code=403)

    link = await repository.get_active_link_by_student_id(db, student.id)
    if link is None:
        raise ApiError(code="link_not_found", message="Teacher-student link not found", status_code=404)

    await db.delete(link)
    await db.commit()


async def is_linked_teacher(db: AsyncSession, *, teacher_id: int, student_id: int) -> bool:
    link = await repository.get_link_by_teacher_student(
        db,
        teacher_id=teacher_id,
        student_id=student_id,
    )
    return link is not None


async def assert_access_to_student(db: AsyncSession, actor: User, student_id: int) -> None:
    if actor.role == RoleEnum.admin:
        return
    if actor.id == student_id:
        return

    if actor.role == RoleEnum.teacher:
        linked = await is_linked_teacher(db, teacher_id=actor.id, student_id=student_id)
        if linked:
            return

    raise ApiError(code="forbidden", message="Cannot access requested student data", status_code=403)


def _student_name(student: User) -> str:
    return f"{student.first_name} {student.last_name}".strip()


def _normalize_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=UTC)
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _resolve_attempt_status(*, finished_at: datetime | None, finish_reason: FinishReasonEnum | None) -> str:
    if finished_at is None:
        return "in_progress"
    if finish_reason == FinishReasonEnum.left:
        return "terminated"
    return "completed"


def _resolve_writing_band(exam: WritingExam) -> float | None:
    submitted_parts = [part for part in exam.writing_parts if (part.essay or "").strip()]
    if not submitted_parts:
        return None
    if any(part.score is None for part in submitted_parts):
        return None

    weighted_total = Decimal("0.0")
    total_weight = Decimal("0.0")
    for part in submitted_parts:
        part_score = Decimal(str(part.score))
        part_order = int(getattr(getattr(part, "part", None), "order", 0) or 0)
        part_weight = Decimal("2.0") if part_order == 2 else Decimal("1.0")
        weighted_total += part_score * part_weight
        total_weight += part_weight

    if total_weight <= Decimal("0.0"):
        return None
    return round_band_to_half(weighted_total / total_weight)


def _resolve_reading_band(exam: ReadingExam) -> float | None:
    if not exam.question_answers and exam.finished_at is None:
        return None
    correct_count = sum(1 for answer in exam.question_answers if answer.is_correct)
    return reading_band_score(correct_count)


def _resolve_listening_band(exam: ListeningExam) -> float | None:
    if not exam.question_answers and exam.finished_at is None:
        return None
    correct_count = sum(1 for answer in exam.question_answers if answer.is_correct)
    return listening_band_score(correct_count)


def _resolve_speaking_band(exam: SpeakingExam) -> float | None:
    if not exam.result_json:
        return None
    overall_band = exam.result_json.get("overall_band")
    return float(overall_band) if overall_band is not None else None


def _resolve_time_limit_seconds(module: str, exam: object) -> int:
    if module in {"reading", "listening", "writing"}:
        return int(getattr(getattr(exam, f"{module}_test"), "time_limit", 0))
    return int(getattr(getattr(exam, "speaking_test"), "duration_minutes", 0) * 60)


def _build_attempt_payload(
    *,
    module: str,
    exam: object,
    student: User,
    estimated_band: float | None,
    question_type_issues: list[str],
    integrity_events: list[dict[str, object]],
) -> dict[str, object]:
    module_test = getattr(exam, f"{module}_test") if module != "speaking" else getattr(exam, "speaking_test")
    finish_reason = getattr(exam, "finish_reason")
    status = _resolve_attempt_status(
        finished_at=getattr(exam, "finished_at"),
        finish_reason=finish_reason,
    )

    return {
        "attempt_id": f"{module}-{getattr(exam, 'id')}",
        "exam_id": int(getattr(exam, "id")),
        "module": module,
        "student_id": int(student.id),
        "student_name": _student_name(student),
        "student_email": student.email,
        "test_id": int(getattr(exam, f"{module}_test_id") if module != "speaking" else getattr(exam, "speaking_test_id")),
        "test_title": str(getattr(module_test, "title")),
        "status": status,
        "finish_reason": finish_reason.value if finish_reason else None,
        "started_at": getattr(exam, "started_at"),
        "finished_at": getattr(exam, "finished_at"),
        "created_at": getattr(exam, "created_at"),
        "updated_at": getattr(exam, "updated_at"),
        "estimated_band": estimated_band,
        "time_limit_seconds": _resolve_time_limit_seconds(module, exam),
        "question_type_issues": question_type_issues,
        "integrity_events": integrity_events,
        "integrity_flag": bool(integrity_events),
    }


async def _collect_student_attempts(db: AsyncSession, student: User) -> list[dict[str, object]]:
    reading_rows = await exams_repository.list_all_user_reading_exams_with_relations(db, user_id=student.id)
    listening_rows = await exams_repository.list_all_user_listening_exams_with_relations(db, user_id=student.id)
    writing_rows = await exams_repository.list_all_user_writing_exams_with_relations(db, user_id=student.id)
    speaking_rows = await exams_repository.list_all_user_speaking_exams_with_relations(db, user_id=student.id)

    attempts: list[dict[str, object]] = []

    for exam in reading_rows:
        question_type_issues = [
            str(answer.question.question_block.block_type)
            for answer in exam.question_answers
            if not answer.is_correct and answer.question and answer.question.question_block
        ]
        attempts.append(
            _build_attempt_payload(
                module="reading",
                exam=exam,
                student=student,
                estimated_band=_resolve_reading_band(exam),
                question_type_issues=question_type_issues,
                integrity_events=[],
            )
        )

    for exam in listening_rows:
        question_type_issues = [
            str(answer.question.question_block.block_type)
            for answer in exam.question_answers
            if not answer.is_correct and answer.question and answer.question.question_block
        ]
        attempts.append(
            _build_attempt_payload(
                module="listening",
                exam=exam,
                student=student,
                estimated_band=_resolve_listening_band(exam),
                question_type_issues=question_type_issues,
                integrity_events=[],
            )
        )

    for exam in writing_rows:
        question_type_issues = [
            "task_2" if int(getattr(getattr(part, "part", None), "order", 1) or 1) == 2 else "task_1"
            for part in exam.writing_parts
            if (part.essay or "").strip() and part.score is not None and float(part.score) < 6.0
        ]
        attempts.append(
            _build_attempt_payload(
                module="writing",
                exam=exam,
                student=student,
                estimated_band=_resolve_writing_band(exam),
                question_type_issues=question_type_issues,
                integrity_events=[],
            )
        )

    for exam in speaking_rows:
        integrity_events = [
            event for event in (exam.integrity_events or []) if isinstance(event, dict)
        ]
        attempts.append(
            _build_attempt_payload(
                module="speaking",
                exam=exam,
                student=student,
                estimated_band=_resolve_speaking_band(exam),
                question_type_issues=[],
                integrity_events=integrity_events,
            )
        )

    attempts.sort(
        key=lambda item: _normalize_datetime(
            (item["updated_at"] or item["created_at"]) if isinstance(item, dict) else None
        ),
        reverse=True,
    )
    return attempts


def _module_band_map(attempts: list[dict[str, object]]) -> dict[str, float]:
    module_bands: dict[str, float] = {"reading": 0.0, "listening": 0.0, "writing": 0.0}
    for module in module_bands.keys():
        module_attempt = next(
            (
                item
                for item in attempts
                if item["module"] == module and item.get("estimated_band") is not None
            ),
            None,
        )
        if module_attempt is not None:
            module_bands[module] = float(module_attempt["estimated_band"] or 0.0)
    return module_bands


def _resolve_weak_module(module_bands: dict[str, float]) -> str:
    ordered = sorted(module_bands.items(), key=lambda item: (item[1], item[0]))
    return ordered[0][0] if ordered else "reading"


def _strength_and_weakness(module_bands: dict[str, float]) -> tuple[list[str], list[str]]:
    strongest_module = max(module_bands.items(), key=lambda item: item[1])[0]
    weakest_module = _resolve_weak_module(module_bands)
    strengths = [f"Stable performance in {strongest_module} module."]
    weaknesses = [f"Band gap persists in {weakest_module} module."]
    return strengths, weaknesses


def _build_student_analytics(student: User, attempts: list[dict[str, object]]) -> dict[str, object]:
    module_bands = _module_band_map(attempts)
    available_bands = [value for value in module_bands.values() if value > 0]
    latest_band = round_band_to_half(sum(available_bands) / len(available_bands)) if available_bands else 0.0
    weak_module = _resolve_weak_module(module_bands)
    strengths, weaknesses = _strength_and_weakness(module_bands)
    last_activity = next(
        (item["updated_at"] for item in attempts if item.get("updated_at") is not None),
        student.updated_at,
    )
    integrity_flag = any(bool(item.get("integrity_flag")) for item in attempts)
    target_band = float(getattr(getattr(student, "profile", None), "target_band_score", Decimal("6.0")))

    return {
        "student_id": int(student.id),
        "student_name": _student_name(student),
        "student_email": student.email,
        "target_band": target_band,
        "latest_band": float(latest_band),
        "module_bands": module_bands,
        "attempts_count": len(attempts),
        "weak_module": weak_module,
        "last_activity": last_activity,
        "integrity_flag": integrity_flag,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": [
            f"Assign focused drills for {weak_module}.",
            "Run one strict timed mock this week.",
        ],
        "recent_attempt_ids": [str(item["attempt_id"]) for item in attempts[:5]],
    }


def _paginate(items: list[dict[str, object]], *, limit: int, offset: int) -> dict[str, object]:
    safe_limit = max(1, int(limit))
    safe_offset = max(0, int(offset))
    return {
        "results": items[safe_offset : safe_offset + safe_limit],
        "count": len(items),
        "limit": safe_limit,
        "offset": safe_offset,
    }


def _to_dashboard_attempt_item(attempt: dict[str, object]) -> dict[str, object]:
    return {
        "attempt_id": attempt["attempt_id"],
        "student_id": attempt["student_id"],
        "student_name": attempt["student_name"],
        "student_email": attempt["student_email"],
        "module": attempt["module"],
        "test_id": attempt["test_id"],
        "test_title": attempt["test_title"],
        "status": attempt["status"],
        "finish_reason": attempt["finish_reason"],
        "updated_at": attempt["updated_at"],
        "estimated_band": attempt["estimated_band"],
        "time_limit_seconds": int(attempt["time_limit_seconds"]),
    }


async def _teacher_students_and_attempts(db: AsyncSession, teacher: User) -> tuple[list[User], dict[int, list[dict[str, object]]]]:
    links = await repository.list_all_students_for_teacher(db, teacher_id=teacher.id)
    students = [link.student for link in links if link.student is not None]
    attempts_by_student: dict[int, list[dict[str, object]]] = {}
    for student in students:
        attempts_by_student[student.id] = await _collect_student_attempts(db, student)
    return students, attempts_by_student


async def list_student_insights(
    db: AsyncSession,
    teacher: User,
    *,
    limit: int,
    offset: int,
    search: str | None,
    weak_module: str | None,
    integrity: str | None,
) -> dict[str, object]:
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can access student analytics", status_code=403)

    students, attempts_by_student = await _teacher_students_and_attempts(db, teacher)
    search_normalized = (search or "").strip().lower()

    rows: list[dict[str, object]] = []
    for student in students:
        analytics = _build_student_analytics(student, attempts_by_student.get(student.id, []))

        if search_normalized:
            haystack = f"{analytics['student_name']} {analytics['student_email']}".lower()
            if search_normalized not in haystack:
                continue
        if weak_module and weak_module != "all" and analytics["weak_module"] != weak_module:
            continue
        if integrity == "flagged" and not analytics["integrity_flag"]:
            continue

        rows.append(analytics)

    rows.sort(
        key=lambda item: _normalize_datetime(item["last_activity"] if isinstance(item, dict) else None),
        reverse=True,
    )
    return _paginate(rows, limit=limit, offset=offset)


async def get_teacher_student_insight(
    db: AsyncSession,
    teacher: User,
    *,
    student_id: int,
) -> dict[str, object]:
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can access student analytics", status_code=403)
    await assert_access_to_student(db, teacher, student_id)

    student_stmt = (
        select(User)
        .where(User.id == student_id)
        .options(selectinload(User.profile))
    )
    student = (await db.execute(student_stmt)).scalar_one_or_none()
    if student is None:
        raise ApiError(code="student_not_found", message="Student not found", status_code=404)

    attempts = await _collect_student_attempts(db, student)
    analytics = _build_student_analytics(student, attempts)
    writing_exam_rows = await exams_repository.list_all_user_writing_exams_with_relations(
        db,
        user_id=student.id,
    )
    writing_exam_by_id = {row.id: row for row in writing_exam_rows}

    writing_submissions: list[dict[str, object]] = []
    for attempt in attempts:
        if attempt["module"] != "writing":
            continue
        exam = writing_exam_by_id.get(int(attempt["exam_id"]))
        if exam is None:
            continue
        responses = {
            f"task_{int(getattr(getattr(part, 'part', None), 'order', 1) or 1)}": str(part.essay or "")
            for part in exam.writing_parts
            if (part.essay or "").strip()
        }
        if responses:
            writing_submissions.append(
                {
                    "id": f"writing-submission-{exam.id}",
                    "attempt_id": attempt["attempt_id"],
                    "draft_saved_at": exam.updated_at,
                    "responses": responses,
                }
            )

    integrity_events = []
    for attempt in attempts:
        for event in attempt.get("integrity_events", []):
            if not isinstance(event, dict):
                continue
            integrity_events.append(
                {
                    "id": str(event.get("id") or f"integrity-{attempt['attempt_id']}"),
                    "attempt_id": attempt["attempt_id"],
                    "type": str(event.get("type") or "event"),
                    "severity": str(event.get("severity") or "warning"),
                    "created_at": str(event.get("created_at") or attempt["updated_at"]),
                    "description": str(event.get("message") or "Integrity event detected."),
                }
            )

    return {
        "student": {
            "id": int(student.id),
            "name": _student_name(student),
            "email": student.email,
            "target_band": float(getattr(getattr(student, "profile", None), "target_band_score", Decimal("6.0"))),
        },
        "analytics": analytics,
        "latest_attempts": [_to_dashboard_attempt_item(item) for item in attempts[:5]],
        "writing_submissions": writing_submissions[:5],
        "integrity_events": integrity_events[:10],
    }


async def get_teacher_dashboard(db: AsyncSession, teacher: User) -> dict[str, object]:
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can access teacher dashboard", status_code=403)

    students, attempts_by_student = await _teacher_students_and_attempts(db, teacher)
    analytics_rows = [
        _build_student_analytics(student, attempts_by_student.get(student.id, []))
        for student in students
    ]
    all_attempts = [attempt for attempts in attempts_by_student.values() for attempt in attempts]
    all_attempts.sort(
        key=lambda item: _normalize_datetime(item["updated_at"] if isinstance(item, dict) else None),
        reverse=True,
    )

    divisor = max(1, len(analytics_rows))
    average_module_bands = {
        "reading": round_band_to_half(sum(item["module_bands"]["reading"] for item in analytics_rows) / divisor),
        "listening": round_band_to_half(sum(item["module_bands"]["listening"] for item in analytics_rows) / divisor),
        "writing": round_band_to_half(sum(item["module_bands"]["writing"] for item in analytics_rows) / divisor),
    }
    average_overall = round_band_to_half(sum(float(item["latest_band"]) for item in analytics_rows) / divisor)
    one_week_ago = datetime.now(UTC) - timedelta(days=7)
    active_students = sum(
        1
        for item in analytics_rows
        if _normalize_datetime(item["last_activity"] if isinstance(item, dict) else None) >= one_week_ago
    )

    completion_stats = {
        "completed": sum(1 for attempt in all_attempts if attempt["status"] == "completed"),
        "terminated": sum(1 for attempt in all_attempts if attempt["status"] == "terminated"),
        "in_progress": sum(1 for attempt in all_attempts if attempt["status"] == "in_progress"),
    }

    integrity_alerts = []
    for attempt in all_attempts:
        for event in attempt.get("integrity_events", []):
            if not isinstance(event, dict):
                continue
            integrity_alerts.append(
                {
                    "id": str(event.get("id") or f"integrity-{attempt['attempt_id']}"),
                    "attempt_id": attempt["attempt_id"],
                    "student_id": attempt["student_id"],
                    "student_name": attempt["student_name"],
                    "module": attempt["module"],
                    "severity": str(event.get("severity") or "warning"),
                    "created_at": str(event.get("created_at") or attempt["updated_at"]),
                    "description": str(event.get("message") or "Integrity event detected."),
                }
            )

    return {
        "teacher": {
            "id": int(teacher.id),
            "name": _student_name(teacher),
            "email": teacher.email,
        },
        "total_students": len(students),
        "active_students": active_students,
        "average_overall_band": float(average_overall),
        "average_module_bands": average_module_bands,
        "recent_attempts": [_to_dashboard_attempt_item(item) for item in all_attempts[:5]],
        "students_at_risk": [
            item
            for item in analytics_rows
            if float(item["latest_band"]) < float(item["target_band"]) or bool(item["integrity_flag"])
        ][:3],
        "top_improvers": sorted(
            analytics_rows,
            key=lambda item: float(item["latest_band"]),
            reverse=True,
        )[:3],
        "integrity_alerts": integrity_alerts[:5],
        "completion_stats": completion_stats,
    }


async def get_teacher_analytics(db: AsyncSession, teacher: User) -> dict[str, object]:
    if teacher.role != RoleEnum.teacher:
        raise ApiError(code="forbidden", message="Only teachers can access teacher analytics", status_code=403)

    students, attempts_by_student = await _teacher_students_and_attempts(db, teacher)
    analytics_rows = [
        _build_student_analytics(student, attempts_by_student.get(student.id, []))
        for student in students
    ]
    all_attempts = [attempt for attempts in attempts_by_student.values() for attempt in attempts]

    divisor = max(1, len(analytics_rows))
    average_module_bands = {
        "reading": round_band_to_half(sum(item["module_bands"]["reading"] for item in analytics_rows) / divisor),
        "listening": round_band_to_half(sum(item["module_bands"]["listening"] for item in analytics_rows) / divisor),
        "writing": round_band_to_half(sum(item["module_bands"]["writing"] for item in analytics_rows) / divisor),
    }
    average_overall = round_band_to_half(sum(float(item["latest_band"]) for item in analytics_rows) / divisor)

    weak_module_counter: Counter[str] = Counter(item["weak_module"] for item in analytics_rows)
    question_type_counter: Counter[str] = Counter()
    for attempt in all_attempts:
        question_type_counter.update(
            str(issue) for issue in attempt.get("question_type_issues", []) if str(issue).strip()
        )

    completion_vs_termination = {
        "completed": sum(1 for attempt in all_attempts if attempt["status"] == "completed"),
        "terminated": sum(1 for attempt in all_attempts if attempt["status"] == "terminated"),
    }

    return {
        "average_overall_band": float(average_overall),
        "average_module_bands": average_module_bands,
        "weak_areas": [
            {"label": label, "count": count}
            for label, count in weak_module_counter.most_common()
        ],
        "question_type_issues": [
            {"label": label, "count": count}
            for label, count in question_type_counter.most_common()
        ],
        "completion_vs_termination": completion_vs_termination,
        "at_risk_students": [
            item
            for item in analytics_rows
            if float(item["latest_band"]) < float(item["target_band"]) or bool(item["integrity_flag"])
        ],
    }
