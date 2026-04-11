from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.model_enums import (
    AiSummaryModuleEnum,
    AiSummarySourceEnum,
    AiSummaryStatusEnum,
    ai_summary_module_enum,
    ai_summary_source_enum,
    ai_summary_status_enum,
)


class AiModuleSummary(TimestampMixin, Base):
    __tablename__ = "ai_module_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module: Mapped[AiSummaryModuleEnum] = mapped_column(ai_summary_module_enum, nullable=False)
    source: Mapped[AiSummarySourceEnum] = mapped_column(
        ai_summary_source_enum,
        default=AiSummarySourceEnum.manual,
        nullable=False,
    )
    status: Mapped[AiSummaryStatusEnum] = mapped_column(
        ai_summary_status_enum,
        default=AiSummaryStatusEnum.pending,
        nullable=False,
    )
    lang: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    attempts_limit: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    exam_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trigger_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stream_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    result_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="ai_summaries", foreign_keys=[user_id])
    trigger_user: Mapped[User | None] = relationship(foreign_keys=[trigger_user_id])


Index("ix_ai_summary_user_module_created", AiModuleSummary.user_id, AiModuleSummary.module, AiModuleSummary.created_at)
Index("ix_ai_summary_status", AiModuleSummary.status)
