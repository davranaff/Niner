from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.model_enums import ProgressTestTypeEnum, RoleEnum, progress_test_type_enum, role_enum


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(role_enum, default=RoleEnum.user, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[UserProfile | None] = relationship(back_populates="user", uselist=False)
    analytics: Mapped[UserAnalytics | None] = relationship(back_populates="user", uselist=False)
    progress_entries: Mapped[list[UserProgress]] = relationship(back_populates="user")
    ai_summaries: Mapped[list[AiModuleSummary]] = relationship(
        back_populates="user",
        foreign_keys="AiModuleSummary.user_id",
    )
    teacher_students: Mapped[list[TeacherStudentLink]] = relationship(
        back_populates="teacher",
        foreign_keys="TeacherStudentLink.teacher_id",
    )
    teacher_link: Mapped[TeacherStudentLink | None] = relationship(
        back_populates="student",
        uselist=False,
        foreign_keys="TeacherStudentLink.student_id",
    )


class UserProfile(TimestampMixin, Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    native_language: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    target_band_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), default=Decimal("6.0"), nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")


class UserProgress(TimestampMixin, Base):
    __tablename__ = "user_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    test_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    band_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False)
    correct_answers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_questions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    test_type: Mapped[ProgressTestTypeEnum] = mapped_column(progress_test_type_enum, nullable=False)

    user: Mapped[User] = relationship(back_populates="progress_entries")


class UserAnalytics(TimestampMixin, Base):
    __tablename__ = "user_analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    total_tests_taken: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_band_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), default=Decimal("0.0"), nullable=False)
    best_band_score: Mapped[Decimal] = mapped_column(Numeric(3, 1), default=Decimal("0.0"), nullable=False)
    total_study_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_test_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="analytics")


Index("ix_progress_user_test_date", UserProgress.user_id, UserProgress.test_date)
