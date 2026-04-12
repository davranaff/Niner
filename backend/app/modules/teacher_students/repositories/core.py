from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.pagination import paginate_query
from app.db.models import TeacherStudentInvite, TeacherStudentLink, User


async def get_active_link_by_student_id(db: AsyncSession, student_id: int) -> TeacherStudentLink | None:
    stmt = select(TeacherStudentLink).where(TeacherStudentLink.student_id == student_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_link_by_teacher_student(
    db: AsyncSession,
    *,
    teacher_id: int,
    student_id: int,
) -> TeacherStudentLink | None:
    stmt = select(TeacherStudentLink).where(
        and_(
            TeacherStudentLink.teacher_id == teacher_id,
            TeacherStudentLink.student_id == student_id,
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_invite_by_token_hash(db: AsyncSession, token_hash: str) -> TeacherStudentInvite | None:
    stmt = select(TeacherStudentInvite).where(TeacherStudentInvite.token_hash == token_hash)
    return (await db.execute(stmt)).scalar_one_or_none()


async def list_students_for_teacher(
    db: AsyncSession,
    *,
    teacher_id: int,
    offset: int,
    limit: int,
) -> list[TeacherStudentLink]:
    stmt = (
        select(TeacherStudentLink)
        .where(TeacherStudentLink.teacher_id == teacher_id)
        .join(User, User.id == TeacherStudentLink.student_id)
        .options(selectinload(TeacherStudentLink.student).selectinload(User.profile))
    )
    return await paginate_query(db, stmt, TeacherStudentLink.id, limit, offset)


async def list_all_students_for_teacher(
    db: AsyncSession,
    *,
    teacher_id: int,
) -> list[TeacherStudentLink]:
    stmt = (
        select(TeacherStudentLink)
        .where(TeacherStudentLink.teacher_id == teacher_id)
        .join(User, User.id == TeacherStudentLink.student_id)
        .options(selectinload(TeacherStudentLink.student).selectinload(User.profile))
    )
    return list((await db.execute(stmt)).scalars().all())


async def has_valid_manual_invite(
    db: AsyncSession,
    *,
    teacher_id: int,
    now: datetime,
) -> TeacherStudentInvite | None:
    stmt = select(TeacherStudentInvite).where(
        and_(
            TeacherStudentInvite.teacher_id == teacher_id,
            TeacherStudentInvite.used_at.is_(None),
            TeacherStudentInvite.expires_at > now,
        )
    )
    return (await db.execute(stmt)).scalars().first()
