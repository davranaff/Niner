from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.db.model_enums import AssignmentAttemptStatusEnum, AssignmentStatusEnum, ProgressTestTypeEnum, SkillGapStatusEnum


class AssignmentAttemptCreateIn(BaseModel):
    response_text: str = ""
    score: Decimal | None = Field(default=None, ge=0, le=1)


class AssignmentErrorItemOut(BaseModel):
    id: int
    module: ProgressTestTypeEnum
    exam_kind: str
    exam_id: int
    source_key: str
    skill_key: str
    skill_label: str
    title: str
    prompt: str | None
    expected_answer: str | None
    user_answer: str | None
    severity: int
    details: dict[str, Any]
    occurred_at: datetime


class AssignmentSkillGapOut(BaseModel):
    id: int
    module: ProgressTestTypeEnum
    skill_key: str
    label: str
    status: SkillGapStatusEnum
    severity_score: Decimal
    occurrences: int
    last_seen_at: datetime
    details: dict[str, Any]


class AssignmentAttemptOut(BaseModel):
    id: int
    status: AssignmentAttemptStatusEnum
    response_text: str
    score: Decimal | None
    feedback: str | None
    details: dict[str, Any]
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AssignmentGeneratedTestOut(BaseModel):
    status: Literal["idle", "queued", "processing", "ready", "failed"]
    progress_percent: int = Field(ge=0, le=100)
    test_id: int | None = None
    requested_at: datetime | None = None
    started_at: datetime | None = None
    generated_at: datetime | None = None
    error: str | None = None


class GeneratedTestOriginOut(BaseModel):
    kind: Literal["assignment_generated"]
    assignment_id: int
    assignment_title: str
    skill_label: str | None = None
    source_exam_kind: ProgressTestTypeEnum
    source_exam_id: int
    generated_at: datetime | None = None


class AssignmentOut(BaseModel):
    id: int
    module: ProgressTestTypeEnum
    source_exam_kind: str
    source_exam_id: int
    task_type: str
    title: str
    instructions: str
    payload: dict[str, Any]
    status: AssignmentStatusEnum
    recommended_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    due_at: datetime | None
    attempts_count: int = Field(ge=0)
    skill_gap: AssignmentSkillGapOut | None = None
    latest_attempt: AssignmentAttemptOut | None = None
    generated_test: AssignmentGeneratedTestOut


class AssignmentListOut(BaseModel):
    items: list[AssignmentOut]
    count: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)


class AssignmentDetailsOut(BaseModel):
    assignment: AssignmentOut
    skill_gap: AssignmentSkillGapOut | None = None
    error_items: list[AssignmentErrorItemOut] = Field(default_factory=list)
    attempts: list[AssignmentAttemptOut] = Field(default_factory=list)


class AssignmentAttemptCreateOut(BaseModel):
    assignment: AssignmentOut
    attempt: AssignmentAttemptOut


class AssignmentGenerateTestOut(BaseModel):
    assignment: AssignmentOut
