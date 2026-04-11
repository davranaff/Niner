from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class TeacherStudentLink(TimestampMixin, Base):
    __tablename__ = "teacher_student_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    teacher: Mapped[User] = relationship(
        back_populates="teacher_students",
        foreign_keys=[teacher_id],
    )
    student: Mapped[User] = relationship(
        back_populates="teacher_link",
        foreign_keys=[student_id],
    )


class TeacherStudentInvite(TimestampMixin, Base):
    __tablename__ = "teacher_student_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_by_student_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    teacher: Mapped[User] = relationship(foreign_keys=[teacher_id])
    used_by_student: Mapped[User | None] = relationship(foreign_keys=[used_by_student_id])


Index("ix_teacher_student_link_teacher_student", TeacherStudentLink.teacher_id, TeacherStudentLink.student_id)
Index("ix_teacher_student_invite_token_hash", TeacherStudentInvite.token_hash)
