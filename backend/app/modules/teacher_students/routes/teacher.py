from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_roles
from app.db.models import RoleEnum, User
from app.db.session import get_db
from app.modules.auth.schemas import MessageOut
from app.modules.teacher_students import services
from app.modules.teacher_students.schemas import (
    TeacherAnalyticsOut,
    TeacherDashboardOut,
    TeacherInviteOut,
    TeacherStudentInsightOut,
    TeacherStudentListOut,
    TeacherStudentsInsightsOut,
)

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


@router.get("/teacher/dashboard", response_model=TeacherDashboardOut)
async def get_teacher_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> TeacherDashboardOut:
    payload = await services.get_teacher_dashboard(db, current_user)
    return TeacherDashboardOut.model_validate(payload)


@router.get("/teacher/analytics", response_model=TeacherAnalyticsOut)
async def get_teacher_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> TeacherAnalyticsOut:
    payload = await services.get_teacher_analytics(db, current_user)
    return TeacherAnalyticsOut.model_validate(payload)


@router.get("/teacher/students/insights", response_model=TeacherStudentsInsightsOut)
async def list_teacher_student_insights(
    search: str | None = Query(default=None, min_length=1),
    weak_module: str | None = Query(default=None),
    integrity: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> TeacherStudentsInsightsOut:
    payload = await services.list_student_insights(
        db,
        current_user,
        limit=limit,
        offset=offset,
        search=search,
        weak_module=weak_module,
        integrity=integrity,
    )
    return TeacherStudentsInsightsOut.model_validate(payload)


@router.get("/teacher/students/{student_id}/insights", response_model=TeacherStudentInsightOut)
async def get_teacher_student_insight(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> TeacherStudentInsightOut:
    payload = await services.get_teacher_student_insight(
        db,
        current_user,
        student_id=student_id,
    )
    return TeacherStudentInsightOut.model_validate(payload)


@router.delete("/teacher/students/{student_id}", response_model=MessageOut)
async def unbind_student_by_teacher(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.teacher)),
) -> MessageOut:
    await services.unbind_by_teacher(db, current_user, student_id=student_id)
    return MessageOut(message="Student unbound")
