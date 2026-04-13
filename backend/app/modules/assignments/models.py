from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.model_enums import (
    AssignmentAttemptStatusEnum,
    AssignmentStatusEnum,
    ProgressTestTypeEnum,
    SkillGapStatusEnum,
    assignment_attempt_status_enum,
    assignment_status_enum,
    progress_test_type_enum,
    skill_gap_status_enum,
)


class AssignmentErrorItem(TimestampMixin, Base):
    __tablename__ = "assignment_error_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module: Mapped[ProgressTestTypeEnum] = mapped_column(progress_test_type_enum, nullable=False)
    exam_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    exam_id: Mapped[int] = mapped_column(Integer, nullable=False)
    source_key: Mapped[str] = mapped_column(String(128), nullable=False)
    skill_key: Mapped[str] = mapped_column(String(128), nullable=False)
    skill_label: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "exam_kind",
            "exam_id",
            "source_key",
            name="uq_assignment_error_item_source",
        ),
    )


class AssignmentSkillGap(TimestampMixin, Base):
    __tablename__ = "assignment_skill_gaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module: Mapped[ProgressTestTypeEnum] = mapped_column(progress_test_type_enum, nullable=False)
    skill_key: Mapped[str] = mapped_column(String(128), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[SkillGapStatusEnum] = mapped_column(
        skill_gap_status_enum,
        default=SkillGapStatusEnum.open,
        nullable=False,
    )
    severity_score: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0.00"), nullable=False)
    occurrences: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_error_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("assignment_error_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    user = relationship("User")
    last_error_item = relationship("AssignmentErrorItem", foreign_keys=[last_error_item_id])
    assignments: Mapped[list[TrainingAssignment]] = relationship(back_populates="skill_gap")

    __table_args__ = (
        UniqueConstraint("user_id", "module", "skill_key", name="uq_assignment_skill_gap_key"),
    )


class TrainingAssignment(TimestampMixin, Base):
    __tablename__ = "training_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module: Mapped[ProgressTestTypeEnum] = mapped_column(progress_test_type_enum, nullable=False)
    skill_gap_id: Mapped[int | None] = mapped_column(
        ForeignKey("assignment_skill_gaps.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_error_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("assignment_error_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_exam_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    source_exam_id: Mapped[int] = mapped_column(Integer, nullable=False)
    dedupe_key: Mapped[str] = mapped_column(String(191), nullable=False)
    task_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[AssignmentStatusEnum] = mapped_column(
        assignment_status_enum,
        default=AssignmentStatusEnum.recommended,
        nullable=False,
    )
    generation_status: Mapped[str] = mapped_column(String(32), default="idle", nullable=False)
    generation_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    generation_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    generation_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    generation_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    generated_test_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    skill_gap: Mapped[AssignmentSkillGap | None] = relationship(back_populates="assignments")
    source_error_item = relationship("AssignmentErrorItem", foreign_keys=[source_error_item_id])
    attempts: Mapped[list[TrainingAssignmentAttempt]] = relationship(
        back_populates="assignment",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_training_assignment_dedupe"),
    )


class TrainingAssignmentAttempt(TimestampMixin, Base):
    __tablename__ = "training_assignment_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("training_assignments.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[AssignmentAttemptStatusEnum] = mapped_column(
        assignment_attempt_status_enum,
        default=AssignmentAttemptStatusEnum.submitted,
        nullable=False,
    )
    response_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assignment: Mapped[TrainingAssignment] = relationship(back_populates="attempts")
    user = relationship("User")


Index("ix_assignment_error_exam", AssignmentErrorItem.exam_kind, AssignmentErrorItem.exam_id)
Index("ix_assignment_error_skill", AssignmentErrorItem.user_id, AssignmentErrorItem.skill_key)
Index("ix_assignment_gap_user_seen", AssignmentSkillGap.user_id, AssignmentSkillGap.last_seen_at)
Index("ix_training_assignment_user_status", TrainingAssignment.user_id, TrainingAssignment.status)
Index("ix_training_assignment_exam", TrainingAssignment.source_exam_kind, TrainingAssignment.source_exam_id)
Index("ix_training_assignment_generated_test", TrainingAssignment.module, TrainingAssignment.generated_test_id)
