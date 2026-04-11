from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.db.models import AiSummaryModuleEnum, AiSummarySourceEnum, AiSummaryStatusEnum


class AiSummaryTriggerIn(BaseModel):
    module: AiSummaryModuleEnum
    student_id: int | None = Field(default=None, gt=0)
    attempts_limit: int = Field(default=10, ge=1, le=30)
    lang: str = Field(default="en", min_length=2, max_length=8)


class AiSummaryOut(BaseModel):
    id: int
    user_id: int
    module: AiSummaryModuleEnum
    source: AiSummarySourceEnum
    status: AiSummaryStatusEnum
    lang: str
    attempts_limit: int
    exam_id: int | None
    trigger_user_id: int | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    result_json: dict[str, Any] | None
    result_text: str | None
    error_text: str | None


class AiSummaryListOut(BaseModel):
    items: list[AiSummaryOut]
    limit: int
    offset: int
