from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.model_enums import ParseStatusEnum, parse_status_enum


class ListeningTest(TimestampMixin, Base):
    __tablename__ = "listening_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    time_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    voice_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    parts: Mapped[list[ListeningPart]] = relationship(back_populates="test", cascade="all, delete-orphan")


class ListeningPart(TimestampMixin, Base):
    __tablename__ = "listening_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("listening_tests.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    test: Mapped[ListeningTest] = relationship(back_populates="parts")
    question_blocks: Mapped[list[ListeningQuestionBlock]] = relationship(
        back_populates="part", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("test_id", "order", name="uq_listening_part_order"),
    )


class ListeningQuestionBlock(TimestampMixin, Base):
    __tablename__ = "listening_question_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("listening_parts.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    block_type: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    table_completion: Mapped[str | None] = mapped_column(Text, nullable=True)
    table_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    parse_status: Mapped[ParseStatusEnum] = mapped_column(
        parse_status_enum, default=ParseStatusEnum.done, nullable=False
    )
    parse_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    part: Mapped[ListeningPart] = relationship(back_populates="question_blocks")
    questions: Mapped[list[ListeningQuestion]] = relationship(
        back_populates="question_block", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("part_id", "order", name="uq_listening_block_order"),
    )


class ListeningQuestion(TimestampMixin, Base):
    __tablename__ = "listening_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_block_id: Mapped[int] = mapped_column(
        ForeignKey("listening_question_blocks.id", ondelete="CASCADE"), index=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question_block: Mapped[ListeningQuestionBlock] = relationship(back_populates="questions")
    answers: Mapped[list[ListeningQuestionAnswer]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )
    options: Mapped[list[ListeningQuestionOption]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("question_block_id", "order", name="uq_listening_question_order"),
    )


class ListeningQuestionAnswer(TimestampMixin, Base):
    __tablename__ = "listening_question_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("listening_questions.id", ondelete="CASCADE"), index=True
    )
    correct_answers: Mapped[str] = mapped_column(String(255), nullable=False)

    question: Mapped[ListeningQuestion] = relationship(back_populates="answers")


class ListeningQuestionOption(TimestampMixin, Base):
    __tablename__ = "listening_question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("listening_questions.id", ondelete="CASCADE"), index=True
    )
    option_text: Mapped[str] = mapped_column(String(500), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    question: Mapped[ListeningQuestion] = relationship(back_populates="options")


Index("ix_listening_part_test_order", ListeningPart.test_id, ListeningPart.order)
Index("ix_listening_block_part_order", ListeningQuestionBlock.part_id, ListeningQuestionBlock.order)
Index("ix_listening_question_block_order", ListeningQuestion.question_block_id, ListeningQuestion.order)
