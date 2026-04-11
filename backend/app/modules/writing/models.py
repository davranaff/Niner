from __future__ import annotations

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class WritingTest(TimestampMixin, Base):
    __tablename__ = "writing_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    time_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    writing_parts: Mapped[list[WritingPart]] = relationship(
        back_populates="test", cascade="all, delete-orphan"
    )


class WritingPart(TimestampMixin, Base):
    __tablename__ = "writing_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("writing_tests.id", ondelete="CASCADE"), index=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    task: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_urls: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    test: Mapped[WritingTest] = relationship(back_populates="writing_parts")

    __table_args__ = (
        UniqueConstraint("test_id", "order", name="uq_writing_part_order"),
    )
