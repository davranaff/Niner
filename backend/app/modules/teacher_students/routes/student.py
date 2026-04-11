from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.auth.schemas import MessageOut
from app.modules.teacher_students import services
from app.modules.teacher_students.schemas import AcceptTeacherInviteIn, TeacherStudentLinkOut

router = APIRouter(tags=["teacher-students"])


@router.post("/students/me/teacher/accept-invite", response_model=TeacherStudentLinkOut)
async def accept_teacher_invite(
    payload: AcceptTeacherInviteIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeacherStudentLinkOut:
    result = await services.accept_invite(db, current_user, payload.token)
    return TeacherStudentLinkOut.model_validate(result)


@router.delete("/students/me/teacher", response_model=MessageOut)
async def unbind_teacher_from_student(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageOut:
    await services.unbind_self(db, current_user)
    return MessageOut(message="Teacher unbound")
