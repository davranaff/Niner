from __future__ import annotations

import enum

from sqlalchemy import Enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    accountant = "accountant"
    student = "student"
    user = "user"


class ProgressTestTypeEnum(str, enum.Enum):
    reading = "reading"
    listening = "listening"
    writing = "writing"
    speaking = "speaking"


class ParseStatusEnum(str, enum.Enum):
    pending = "pending"
    done = "done"
    failed = "failed"


class FinishReasonEnum(str, enum.Enum):
    completed = "completed"
    left = "left"
    time_is_up = "time_is_up"


class AiSummaryModuleEnum(str, enum.Enum):
    reading = "reading"
    listening = "listening"
    writing = "writing"


class AiSummarySourceEnum(str, enum.Enum):
    manual = "manual"
    auto_submit = "auto_submit"


class AiSummaryStatusEnum(str, enum.Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class SkillGapStatusEnum(str, enum.Enum):
    open = "open"
    improving = "improving"
    resolved = "resolved"


class AssignmentStatusEnum(str, enum.Enum):
    recommended = "recommended"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class AssignmentAttemptStatusEnum(str, enum.Enum):
    submitted = "submitted"
    evaluated = "evaluated"


role_enum = Enum(RoleEnum, name="role_enum", native_enum=False)
progress_test_type_enum = Enum(ProgressTestTypeEnum, name="progress_test_type_enum", native_enum=False)
parse_status_enum = Enum(ParseStatusEnum, name="parse_status_enum", native_enum=False)
finish_reason_enum = Enum(FinishReasonEnum, name="finish_reason_enum", native_enum=False)
ai_summary_module_enum = Enum(AiSummaryModuleEnum, name="ai_summary_module_enum", native_enum=False)
ai_summary_source_enum = Enum(AiSummarySourceEnum, name="ai_summary_source_enum", native_enum=False)
ai_summary_status_enum = Enum(AiSummaryStatusEnum, name="ai_summary_status_enum", native_enum=False)
skill_gap_status_enum = Enum(SkillGapStatusEnum, name="skill_gap_status_enum", native_enum=False)
assignment_status_enum = Enum(AssignmentStatusEnum, name="assignment_status_enum", native_enum=False)
assignment_attempt_status_enum = Enum(
    AssignmentAttemptStatusEnum,
    name="assignment_attempt_status_enum",
    native_enum=False,
)
