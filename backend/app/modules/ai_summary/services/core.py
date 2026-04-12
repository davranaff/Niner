from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import page_response
from app.db.models import (
    AiModuleSummary,
    AiSummaryModuleEnum,
    AiSummarySourceEnum,
    AiSummaryStatusEnum,
    RoleEnum,
    User,
)
from app.modules.ai_summary import repository
from app.modules.teacher_students.services.core import assert_access_to_student
from app.workers.queue import enqueue_module_summary

logger = logging.getLogger(__name__)

MANUAL_SUMMARY_DAILY_LIMIT = 3


def _manual_debounce_window_start(now: datetime | None = None) -> datetime:
    return (now or datetime.now(UTC)) - timedelta(days=1)


def _manual_debounce_hit(manual_count: int, limit: int = MANUAL_SUMMARY_DAILY_LIMIT) -> bool:
    return manual_count >= limit


def serialize_summary(row: AiModuleSummary) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "module": row.module,
        "source": row.source,
        "status": row.status,
        "lang": row.lang,
        "attempts_limit": row.attempts_limit,
        "exam_id": row.exam_id,
        "trigger_user_id": row.trigger_user_id,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "started_at": row.started_at,
        "finished_at": row.finished_at,
        "result_json": row.result_json,
        "result_text": row.result_text,
        "error_text": row.error_text,
    }


async def _create_summary_job(
    db: AsyncSession,
    *,
    target_user_id: int,
    module: AiSummaryModuleEnum,
    source: AiSummarySourceEnum,
    attempts_limit: int,
    lang: str,
    trigger_user_id: int | None,
    exam_id: int | None,
) -> dict[str, Any]:
    row = await repository.create_summary(
        db,
        user_id=target_user_id,
        module=module,
        source=source,
        attempts_limit=attempts_limit,
        lang=lang,
        trigger_user_id=trigger_user_id,
        exam_id=exam_id,
    )
    await db.commit()
    await db.refresh(row)

    try:
        await enqueue_module_summary(row.id)
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to enqueue AI summary generation",
            extra={"summary_id": row.id, "summary_module": row.module.value},
        )

    return serialize_summary(row)


async def create_manual_summary(
    db: AsyncSession,
    actor: User,
    *,
    module: AiSummaryModuleEnum,
    student_id: int | None,
    attempts_limit: int,
    lang: str,
) -> dict[str, Any]:
    target_user_id = student_id or actor.id
    await assert_access_to_student(db, actor, target_user_id)

    if actor.role == RoleEnum.teacher and student_id is None:
        # Teachers can trigger for themselves only without explicit student selection.
        target_user_id = actor.id

    since = _manual_debounce_window_start()
    manual_count = await repository.count_manual_summaries_since(
        db,
        user_id=target_user_id,
        module=module,
        since=since,
    )
    if _manual_debounce_hit(manual_count):
        raise ApiError(
            code="summary_debounce_conflict",
            message=f"Manual summary is allowed up to {MANUAL_SUMMARY_DAILY_LIMIT} times per day for this module",
            status_code=409,
            details={"used": manual_count, "limit": MANUAL_SUMMARY_DAILY_LIMIT},
        )

    return await _create_summary_job(
        db,
        target_user_id=target_user_id,
        module=module,
        source=AiSummarySourceEnum.manual,
        attempts_limit=attempts_limit,
        lang=lang,
        trigger_user_id=actor.id,
        exam_id=None,
    )


async def create_auto_summary(
    db: AsyncSession,
    *,
    user: User,
    module: AiSummaryModuleEnum,
    exam_id: int,
    attempts_limit: int = 10,
    lang: str = "en",
) -> dict[str, Any]:
    existing = await repository.get_latest_summary_for_exam(
        db,
        user_id=user.id,
        module=module,
        source=AiSummarySourceEnum.auto_submit,
        exam_id=exam_id,
    )
    if existing is not None and existing.status != AiSummaryStatusEnum.failed:
        return serialize_summary(existing)

    return await _create_summary_job(
        db,
        target_user_id=user.id,
        module=module,
        source=AiSummarySourceEnum.auto_submit,
        attempts_limit=attempts_limit,
        lang=lang,
        trigger_user_id=user.id,
        exam_id=exam_id,
    )


async def get_summary_or_404(db: AsyncSession, summary_id: int) -> AiModuleSummary:
    row = await repository.get_summary(db, summary_id)
    if row is None:
        raise ApiError(code="summary_not_found", message="AI summary not found", status_code=404)
    return row


async def get_summary_detail(db: AsyncSession, actor: User, summary_id: int) -> dict[str, Any]:
    row = await get_summary_or_404(db, summary_id)
    await assert_access_to_student(db, actor, row.user_id)
    return serialize_summary(row)


async def list_summaries(
    db: AsyncSession,
    actor: User,
    *,
    student_id: int | None,
    module: AiSummaryModuleEnum | None,
    source: AiSummarySourceEnum | None,
    exam_id: int | None,
    offset: int,
    limit: int,
) -> dict[str, Any]:
    if actor.role == RoleEnum.admin:
        target_user_id = student_id
    else:
        if student_id is not None:
            await assert_access_to_student(db, actor, student_id)
            target_user_id = student_id
        else:
            target_user_id = actor.id

    rows = await repository.list_summaries(
        db,
        user_id=target_user_id,
        module=module,
        source=source,
        exam_id=exam_id,
        offset=offset,
        limit=limit,
    )
    return page_response(
        items=[serialize_summary(item) for item in rows],
        limit=limit,
        offset=offset,
    ).model_dump()
