from datetime import datetime

from pydantic import BaseModel, Field


class TeacherInviteOut(BaseModel):
    invite_token: str
    invite_link: str
    expires_at: datetime


class AcceptTeacherInviteIn(BaseModel):
    token: str = Field(min_length=8, max_length=512)


class TeacherStudentLinkOut(BaseModel):
    teacher_id: int
    student_id: int
    student_email: str
    student_first_name: str
    student_last_name: str


class TeacherStudentListOut(BaseModel):
    items: list[TeacherStudentLinkOut]
    limit: int
    offset: int
