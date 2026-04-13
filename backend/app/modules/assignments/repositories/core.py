from __future__ import annotations

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.model_enums import AssignmentStatusEnum, ProgressTestTypeEnum
from app.db.models import (
    AssignmentErrorItem,
    AssignmentSkillGap,
    TrainingAssignment,
    TrainingAssignmentAttempt,
)


def _apply_assignment_filters(
    stmt: Select,
    *,
    user_id: int,
    module: ProgressTestTypeEnum | None,
    status: AssignmentStatusEnum | None,
) -> Select:
    stmt = stmt.where(TrainingAssignment.user_id == user_id)
    if module is not None:
        stmt = stmt.where(TrainingAssignment.module == module)
    if status is not None:
        stmt = stmt.where(TrainingAssignment.status == status)
    return stmt


async def get_error_item_by_source(
    db: AsyncSession,
    *,
    user_id: int,
    exam_kind: str,
    exam_id: int,
    source_key: str,
) -> AssignmentErrorItem | None:
    stmt = select(AssignmentErrorItem).where(
        AssignmentErrorItem.user_id == user_id,
        AssignmentErrorItem.exam_kind == exam_kind,
        AssignmentErrorItem.exam_id == exam_id,
        AssignmentErrorItem.source_key == source_key,
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_error_items_for_exam(
    db: AsyncSession,
    *,
    user_id: int,
    exam_kind: str,
    exam_id: int,
) -> list[AssignmentErrorItem]:
    stmt = (
        select(AssignmentErrorItem)
        .where(
            AssignmentErrorItem.user_id == user_id,
            AssignmentErrorItem.exam_kind == exam_kind,
            AssignmentErrorItem.exam_id == exam_id,
        )
        .order_by(AssignmentErrorItem.id.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_error_items_for_exam_skill(
    db: AsyncSession,
    *,
    user_id: int,
    exam_kind: str,
    exam_id: int,
    module: ProgressTestTypeEnum,
    skill_key: str,
) -> list[AssignmentErrorItem]:
    stmt = (
        select(AssignmentErrorItem)
        .where(
            AssignmentErrorItem.user_id == user_id,
            AssignmentErrorItem.exam_kind == exam_kind,
            AssignmentErrorItem.exam_id == exam_id,
            AssignmentErrorItem.module == module,
            AssignmentErrorItem.skill_key == skill_key,
        )
        .order_by(AssignmentErrorItem.id.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_skill_gap_by_key(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    skill_key: str,
) -> AssignmentSkillGap | None:
    stmt = select(AssignmentSkillGap).where(
        AssignmentSkillGap.user_id == user_id,
        AssignmentSkillGap.module == module,
        AssignmentSkillGap.skill_key == skill_key,
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_assignment_by_dedupe_key(
    db: AsyncSession,
    *,
    user_id: int,
    dedupe_key: str,
) -> TrainingAssignment | None:
    stmt = select(TrainingAssignment).where(
        TrainingAssignment.user_id == user_id,
        TrainingAssignment.dedupe_key == dedupe_key,
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def count_assignments_for_user(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum | None,
    status: AssignmentStatusEnum | None,
) -> int:
    stmt = select(func.count()).select_from(TrainingAssignment)
    stmt = _apply_assignment_filters(stmt, user_id=user_id, module=module, status=status)
    value = (await db.execute(stmt)).scalar_one()
    return int(value or 0)


async def list_assignments_for_user(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum | None,
    status: AssignmentStatusEnum | None,
    limit: int,
    offset: int,
) -> list[TrainingAssignment]:
    stmt = (
        select(TrainingAssignment)
        .options(
            selectinload(TrainingAssignment.skill_gap),
            selectinload(TrainingAssignment.attempts),
        )
        .order_by(TrainingAssignment.recommended_at.desc(), TrainingAssignment.id.desc())
        .offset(max(0, offset))
        .limit(max(1, limit))
    )
    stmt = _apply_assignment_filters(stmt, user_id=user_id, module=module, status=status)
    return list((await db.execute(stmt)).scalars().all())


async def get_assignment_owned(
    db: AsyncSession,
    *,
    user_id: int,
    assignment_id: int,
) -> TrainingAssignment | None:
    stmt = (
        select(TrainingAssignment)
        .where(
            TrainingAssignment.id == assignment_id,
            TrainingAssignment.user_id == user_id,
        )
        .options(
            selectinload(TrainingAssignment.skill_gap),
            selectinload(TrainingAssignment.attempts),
            selectinload(TrainingAssignment.source_error_item),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_assignment_with_relations(
    db: AsyncSession,
    *,
    assignment_id: int,
) -> TrainingAssignment | None:
    stmt = (
        select(TrainingAssignment)
        .where(TrainingAssignment.id == assignment_id)
        .options(
            selectinload(TrainingAssignment.skill_gap),
            selectinload(TrainingAssignment.attempts),
            selectinload(TrainingAssignment.source_error_item),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_latest_assignment_attempt(
    db: AsyncSession,
    *,
    assignment_id: int,
) -> TrainingAssignmentAttempt | None:
    stmt = (
        select(TrainingAssignmentAttempt)
        .where(TrainingAssignmentAttempt.assignment_id == assignment_id)
        .order_by(TrainingAssignmentAttempt.id.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_generated_assignments_for_tests(
    db: AsyncSession,
    *,
    user_id: int,
    module: ProgressTestTypeEnum,
    test_ids: list[int],
) -> list[TrainingAssignment]:
    if not test_ids:
        return []

    stmt = (
        select(TrainingAssignment)
        .where(
            TrainingAssignment.user_id == user_id,
            TrainingAssignment.module == module,
            TrainingAssignment.generated_test_id.is_not(None),
            TrainingAssignment.generated_test_id.in_(test_ids),
        )
        .options(
            selectinload(TrainingAssignment.skill_gap),
            selectinload(TrainingAssignment.source_error_item),
        )
        .order_by(TrainingAssignment.id.desc())
    )
    return list((await db.execute(stmt)).scalars().all())
