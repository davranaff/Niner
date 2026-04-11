from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.model_enums import FinishReasonEnum, finish_reason_enum


class ReadingExam(TimestampMixin, Base):
    __tablename__ = "reading_exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reading_test_id: Mapped[int] = mapped_column(
        ForeignKey("reading_tests.id", ondelete="CASCADE"), index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finish_reason: Mapped[FinishReasonEnum | None] = mapped_column(finish_reason_enum, nullable=True)

    user: Mapped[User] = relationship()
    reading_test: Mapped[ReadingTest] = relationship()
    question_answers: Mapped[list[ReadingExamQuestionAnswer]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )


class ReadingExamQuestionAnswer(TimestampMixin, Base):
    __tablename__ = "reading_exam_question_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("reading_exams.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("reading_questions.id", ondelete="CASCADE"), index=True
    )
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    exam: Mapped[ReadingExam] = relationship(back_populates="question_answers")
    question: Mapped[ReadingQuestion] = relationship()

    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_reading_exam_question_answer"),
    )


class ListeningExam(TimestampMixin, Base):
    __tablename__ = "listening_exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    listening_test_id: Mapped[int] = mapped_column(
        ForeignKey("listening_tests.id", ondelete="CASCADE"), index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finish_reason: Mapped[FinishReasonEnum | None] = mapped_column(finish_reason_enum, nullable=True)

    user: Mapped[User] = relationship()
    listening_test: Mapped[ListeningTest] = relationship()
    question_answers: Mapped[list[ListeningExamQuestionAnswer]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )


class ListeningExamQuestionAnswer(TimestampMixin, Base):
    __tablename__ = "listening_exam_question_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("listening_exams.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("listening_questions.id", ondelete="CASCADE"), index=True
    )
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    exam: Mapped[ListeningExam] = relationship(back_populates="question_answers")
    question: Mapped[ListeningQuestion] = relationship()

    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_listening_exam_question_answer"),
    )


class WritingExam(TimestampMixin, Base):
    __tablename__ = "writing_exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    writing_test_id: Mapped[int] = mapped_column(
        ForeignKey("writing_tests.id", ondelete="CASCADE"), index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finish_reason: Mapped[FinishReasonEnum | None] = mapped_column(finish_reason_enum, nullable=True)

    user: Mapped[User] = relationship()
    writing_test: Mapped[WritingTest] = relationship()
    writing_parts: Mapped[list[WritingExamPart]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )


class WritingExamPart(TimestampMixin, Base):
    __tablename__ = "writing_exam_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("writing_exams.id", ondelete="CASCADE"), index=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("writing_parts.id", ondelete="CASCADE"), index=True)
    essay: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    corrections: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)

    exam: Mapped[WritingExam] = relationship(back_populates="writing_parts")
    part: Mapped[WritingPart] = relationship()

    __table_args__ = (
        UniqueConstraint("exam_id", "part_id", name="uq_writing_exam_part"),
    )
