from __future__ import annotations

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SpeakingTest(TimestampMixin, Base):
    __tablename__ = "speaking_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(32), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    instructions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    scoring_focus: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    parts: Mapped[list[SpeakingPart]] = relationship(back_populates="test", cascade="all, delete-orphan")


class SpeakingPart(TimestampMixin, Base):
    __tablename__ = "speaking_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("speaking_tests.id", ondelete="CASCADE"), index=True)
    part_id: Mapped[str] = mapped_column(String(16), nullable=False)
    part_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    examiner_guidance: Mapped[str] = mapped_column(Text, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    test: Mapped[SpeakingTest] = relationship(back_populates="parts")
    questions: Mapped[list[SpeakingQuestion]] = relationship(
        back_populates="part",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("test_id", "part_id", name="uq_speaking_part_test_part_id"),
        UniqueConstraint("test_id", "part_order", name="uq_speaking_part_test_part_order"),
    )


class SpeakingQuestion(TimestampMixin, Base):
    __tablename__ = "speaking_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("speaking_parts.id", ondelete="CASCADE"), index=True)
    question_code: Mapped[str] = mapped_column(String(32), nullable=False)
    question_order: Mapped[int] = mapped_column(Integer, nullable=False)
    short_label: Mapped[str] = mapped_column(String(120), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    rephrase_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_ups: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    cue_card: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)

    part: Mapped[SpeakingPart] = relationship(back_populates="questions")

    __table_args__ = (
        UniqueConstraint("part_id", "question_code", name="uq_speaking_question_part_question_code"),
        UniqueConstraint("part_id", "question_order", name="uq_speaking_question_part_order"),
    )
