from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import page_response
from app.core.security import generate_random_token, sha256_token
from app.db.models import RoleEnum, TeacherStudentInvite, TeacherStudentLink, User
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

    return {
        "invite_token": token,
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
