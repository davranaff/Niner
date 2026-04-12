from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ExamKind = Literal["reading", "listening", "writing", "speaking"]
ExamAttemptStatus = Literal["in_progress", "completed", "terminated"]
ExamResultStatus = Literal["success", "failed", "in_progress"]
SubmitFinishReasonOverride = Literal["left", "time_is_up"]
OverallModuleKind = Literal["listening", "reading", "writing"]
OverallExamStatus = Literal["in_progress", "completed", "terminated"]
OverallExamPhase = Literal["module", "break", "completed", "terminated"]
OverallExamResultStatus = Literal["in_progress", "success", "failed"]
OverallModuleAttemptStatus = Literal["not_started", "in_progress", "completed", "terminated"]


class ExamCreateIn(BaseModel):
    test_id: int = Field(gt=0)


class ExamAnswerIn(BaseModel):
    id: int | None = Field(default=None, gt=0)
    value: str | None = None


class WritingPartSubmitIn(BaseModel):
    part_id: int | None = Field(default=None, gt=0)
    essay: str | None = None


class ExamSubmitOut(BaseModel):
    result: ExamResultStatus
    score: float | None
    correct_answers: int | None
    time_spent: int | None


class ExamResultOut(BaseModel):
    result: ExamResultStatus
    score: float | None
    correct_answers: int | None
    time_spent: int | None


class ExamPublic(BaseModel):
    id: int
    user_id: int
    started_at: datetime | None
    finished_at: datetime | None
    finish_reason: str | None
    test_id: int
    kind: ExamKind


class ExamsMeOut(BaseModel):
    reading: dict[str, Any]
    listening: dict[str, Any]
    writing: dict[str, Any]
    speaking: dict[str, Any]


class StudentAttemptListItemOut(BaseModel):
    id: int
    kind: ExamKind
    test_id: int
    test_title: str
    time_limit: int
    status: ExamAttemptStatus
    finish_reason: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime
    estimated_band: float | None


class StudentAttemptListOut(BaseModel):
    items: list[StudentAttemptListItemOut]
    count: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)


class OverallExamModuleAttemptOut(BaseModel):
    module: OverallModuleKind
    test_id: int
    test_title: str
    exam_id: int | None
    status: OverallModuleAttemptStatus
    finish_reason: str | None
    result: ExamResultStatus | None
    score: float | None
    correct_answers: int | None
    time_spent: int | None
    started_at: datetime | None
    finished_at: datetime | None


class OverallExamStateOut(BaseModel):
    id: int
    user_id: int
    status: OverallExamStatus
    phase: OverallExamPhase
    current_module: OverallModuleKind | None
    result: OverallExamResultStatus
    break_started_at: datetime | None
    break_duration_seconds: int
    break_remaining_seconds: int | None
    started_at: datetime | None
    finished_at: datetime | None
    finish_reason: str | None
    listening_test_id: int
    reading_test_id: int
    writing_test_id: int
    listening_exam_id: int | None
    reading_exam_id: int | None
    writing_exam_id: int | None
    modules: list[OverallExamModuleAttemptOut]
    created_at: datetime
    updated_at: datetime


class OverallExamResultOut(BaseModel):
    id: int
    user_id: int
    status: OverallExamStatus
    phase: OverallExamPhase
    result: OverallExamResultStatus
    overall_band: float | None
    overall_band_pending: bool
    started_at: datetime | None
    finished_at: datetime | None
    finish_reason: str | None
    modules: list[OverallExamModuleAttemptOut]


class OverallExamListItemOut(BaseModel):
    id: int
    status: OverallExamStatus
    phase: OverallExamPhase
    result: OverallExamResultStatus
    current_module: OverallModuleKind | None
    overall_band: float | None
    overall_band_pending: bool
    started_at: datetime | None
    finished_at: datetime | None
    finish_reason: str | None
    listening_test_id: int
    reading_test_id: int
    writing_test_id: int
    listening_exam_id: int | None
    reading_exam_id: int | None
    writing_exam_id: int | None
    created_at: datetime
    updated_at: datetime


class OverallExamListOut(BaseModel):
    items: list[OverallExamListItemOut]
    count: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
