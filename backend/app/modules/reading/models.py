from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.model_enums import ParseStatusEnum, parse_status_enum


class ReadingTest(TimestampMixin, Base):
    __tablename__ = "reading_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    time_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    passages: Mapped[list[ReadingPassage]] = relationship(
        back_populates="test", cascade="all, delete-orphan"
    )


class ReadingPassage(TimestampMixin, Base):
    __tablename__ = "reading_passages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("reading_tests.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    passage_number: Mapped[int] = mapped_column(Integer, nullable=False)

    test: Mapped[ReadingTest] = relationship(back_populates="passages")
    question_blocks: Mapped[list[ReadingQuestionBlock]] = relationship(
        back_populates="passage", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("test_id", "passage_number", name="uq_reading_passage_order"),
    )


class ReadingQuestionBlock(TimestampMixin, Base):
    __tablename__ = "reading_question_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    passage_id: Mapped[int] = mapped_column(
        ForeignKey("reading_passages.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    block_type: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    question_heading: Mapped[str | None] = mapped_column(String(255), nullable=True)
    list_of_headings: Mapped[str | None] = mapped_column(Text, nullable=True)

    table_completion: Mapped[str | None] = mapped_column(Text, nullable=True)
    flow_chart_completion: Mapped[str | None] = mapped_column(Text, nullable=True)
    table_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    parse_status: Mapped[ParseStatusEnum] = mapped_column(
        parse_status_enum, default=ParseStatusEnum.done, nullable=False
    )
    parse_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    passage: Mapped[ReadingPassage] = relationship(back_populates="question_blocks")
    questions: Mapped[list[ReadingQuestion]] = relationship(
        back_populates="question_block", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("passage_id", "order", name="uq_reading_block_order"),
    )


class ReadingQuestion(TimestampMixin, Base):
    __tablename__ = "reading_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_block_id: Mapped[int] = mapped_column(
        ForeignKey("reading_question_blocks.id", ondelete="CASCADE"), index=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_block: Mapped[ReadingQuestionBlock] = relationship(back_populates="questions")
    answers: Mapped[list[ReadingQuestionAnswer]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )
    options: Mapped[list[ReadingQuestionOption]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("question_block_id", "order", name="uq_reading_question_order"),
    )


class ReadingQuestionAnswer(TimestampMixin, Base):
    __tablename__ = "reading_question_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("reading_questions.id", ondelete="CASCADE"), index=True
    )
    correct_answers: Mapped[str] = mapped_column(String(255), nullable=False)

    question: Mapped[ReadingQuestion] = relationship(back_populates="answers")


class ReadingQuestionOption(TimestampMixin, Base):
    __tablename__ = "reading_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("reading_questions.id", ondelete="CASCADE"), index=True
    )
    option_text: Mapped[str] = mapped_column(String(500), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question: Mapped[ReadingQuestion] = relationship(back_populates="options")


Index("ix_reading_passage_test_passage", ReadingPassage.test_id, ReadingPassage.passage_number)
Index("ix_reading_block_passage_order", ReadingQuestionBlock.passage_id, ReadingQuestionBlock.order)
Index("ix_reading_question_block_order", ReadingQuestion.question_block_id, ReadingQuestion.order)
