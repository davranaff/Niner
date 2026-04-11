from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_roles
from app.db.models import RoleEnum, User
from app.db.session import get_db
from app.modules.auth.schemas import MessageOut
from app.modules.teacher_students import services
from app.modules.teacher_students.schemas import TeacherInviteOut, TeacherStudentListOut

router = APIRouter(tags=["teacher-students"])


@router.post("/teacher/students/invites", response_model=TeacherInviteOut)
async def create_teacher_student_invite(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> TeacherInviteOut:
    payload = await services.create_invite(db, current_user)
    return TeacherInviteOut.model_validate(payload)


@router.get("/teacher/students", response_model=TeacherStudentListOut)
async def list_teacher_students(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> TeacherStudentListOut:
    payload = await services.list_students(db, current_user, offset=offset, limit=limit)
    return TeacherStudentListOut.model_validate(payload)


@router.delete("/teacher/students/{student_id}", response_model=MessageOut)
async def unbind_student_by_teacher(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> MessageOut:
    await services.unbind_by_teacher(db, current_user, student_id=student_id)
    return MessageOut(message="Student unbound")
