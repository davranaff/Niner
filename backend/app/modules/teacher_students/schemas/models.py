from datetime import datetime
from typing import Literal

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


class TeacherModuleBandsOut(BaseModel):
    reading: float
    listening: float
    writing: float


class TeacherStudentAnalyticsOut(BaseModel):
    student_id: int
    student_name: str
    student_email: str
    target_band: float
    latest_band: float
    module_bands: TeacherModuleBandsOut
    attempts_count: int = Field(ge=0)
    weak_module: Literal["reading", "listening", "writing"]
    last_activity: datetime | None
    integrity_flag: bool
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    recent_attempt_ids: list[str]


class TeacherStudentsInsightsOut(BaseModel):
    results: list[TeacherStudentAnalyticsOut]
    count: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)


class TeacherAttemptSummaryOut(BaseModel):
    attempt_id: str
    student_id: int
    student_name: str
    student_email: str
    module: Literal["reading", "listening", "writing", "speaking"]
    test_id: int
    test_title: str
    status: Literal["in_progress", "completed", "terminated"]
    finish_reason: str | None
    updated_at: datetime | None
    estimated_band: float | None
    time_limit_seconds: int = Field(ge=0)


class TeacherIntegrityAlertOut(BaseModel):
    id: str
    attempt_id: str
    student_id: int
    student_name: str
    module: Literal["reading", "listening", "writing", "speaking"]
    severity: str
    created_at: str
    description: str


class TeacherCompletionStatsOut(BaseModel):
    completed: int = Field(ge=0)
    terminated: int = Field(ge=0)
    in_progress: int = Field(ge=0)


class TeacherPublicOut(BaseModel):
    id: int
    name: str
    email: str


class TeacherDashboardOut(BaseModel):
    teacher: TeacherPublicOut
    total_students: int = Field(ge=0)
    active_students: int = Field(ge=0)
    average_overall_band: float
    average_module_bands: TeacherModuleBandsOut
    recent_attempts: list[TeacherAttemptSummaryOut]
    students_at_risk: list[TeacherStudentAnalyticsOut]
    top_improvers: list[TeacherStudentAnalyticsOut]
    integrity_alerts: list[TeacherIntegrityAlertOut]
    completion_stats: TeacherCompletionStatsOut


class TeacherAnalyticsCountOut(BaseModel):
    label: str
    count: int = Field(ge=0)


class TeacherAnalyticsOut(BaseModel):
    average_overall_band: float
    average_module_bands: TeacherModuleBandsOut
    weak_areas: list[TeacherAnalyticsCountOut]
    question_type_issues: list[TeacherAnalyticsCountOut]
    completion_vs_termination: dict[str, int]
    at_risk_students: list[TeacherStudentAnalyticsOut]


class TeacherStudentSummaryOut(BaseModel):
    id: int
    name: str
    email: str
    target_band: float


class TeacherWritingSubmissionOut(BaseModel):
    id: str
    attempt_id: str
    draft_saved_at: datetime | None
    responses: dict[str, str]


class TeacherStudentIntegrityEventOut(BaseModel):
    id: str
    attempt_id: str
    type: str
    severity: str
    created_at: str
    description: str


class TeacherStudentInsightOut(BaseModel):
    student: TeacherStudentSummaryOut
    analytics: TeacherStudentAnalyticsOut
    latest_attempts: list[TeacherAttemptSummaryOut]
    writing_submissions: list[TeacherWritingSubmissionOut]
    integrity_events: list[TeacherStudentIntegrityEventOut]
