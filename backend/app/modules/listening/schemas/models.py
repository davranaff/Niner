from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.modules.assignments.schemas import GeneratedTestOriginOut


class ListeningTestListItem(BaseModel):
    id: int
    title: str
    voice_url: str | None
    description: str
    time_limit: int
    is_active: bool
    created_at: datetime
    attempts_count: int = Field(ge=0, default=0)
    successful_attempts_count: int = Field(ge=0, default=0)
    failed_attempts_count: int = Field(ge=0, default=0)
    origin: GeneratedTestOriginOut | None = None


class ListeningOptionDetail(BaseModel):
    id: int
    option_text: str
    order: int


class ListeningQuestionDetail(BaseModel):
    id: int
    question_text: str
    order: int
    number: int
    answer_type: str
    input_variant: str
    options: list[ListeningOptionDetail] = Field(default_factory=list)


class ListeningBlockAnswerSpec(BaseModel):
    answer_type: str
    input_variant: str
    options_mode: str | None = None
    max_words: int | None = None


class ListeningBlockDetail(BaseModel):
    id: int
    title: str
    description: str
    block_type: str
    order: int
    answer_spec: ListeningBlockAnswerSpec
    questions: list[ListeningQuestionDetail]
    table_json: dict[str, Any] | None = None


class ListeningPartDetail(BaseModel):
    id: int
    title: str
    order: int
    part_number: int
    question_blocks: list[ListeningBlockDetail]
    questions_count: int


class ListeningTestDetail(BaseModel):
    id: int
    title: str
    voice_url: str | None
    audio_url: str | None
    description: str
    time_limit: int
    created_at: datetime
    parts: list[ListeningPartDetail]
    origin: GeneratedTestOriginOut | None = None
