from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.modules.assignments.schemas import GeneratedTestOriginOut


class ReadingTestListItem(BaseModel):
    id: int
    title: str
    description: str
    time_limit: int
    is_active: bool
    created_at: datetime
    attempts_count: int = Field(ge=0, default=0)
    successful_attempts_count: int = Field(ge=0, default=0)
    failed_attempts_count: int = Field(ge=0, default=0)
    origin: GeneratedTestOriginOut | None = None


class ReadingOptionDetail(BaseModel):
    id: int
    option_text: str
    is_correct: bool
    order: int


class ReadingQuestionDetail(BaseModel):
    id: int
    question_text: str
    order: int
    number: int
    answer_type: str
    input_variant: str
    options: list[ReadingOptionDetail] = Field(default_factory=list)


class ReadingBlockAnswerSpec(BaseModel):
    answer_type: str
    input_variant: str
    options_mode: str | None = None
    max_words: int | None = None


class ReadingBlockDetail(BaseModel):
    id: int
    title: str
    description: str
    block_type: str
    order: int
    answer_spec: ReadingBlockAnswerSpec
    questions: list[ReadingQuestionDetail]
    question_heading: str | None = None
    list_of_headings: str | None = None
    table_json: dict[str, Any] | None = None
    flow_chart_completion: str | None = None


class ReadingPartDetail(BaseModel):
    id: int
    title: str
    content: str
    passage_number: int
    part_number: int
    question_blocks: list[ReadingBlockDetail]
    questions_count: int


class ReadingTestDetail(BaseModel):
    id: int
    title: str
    description: str
    time_limit: int
    created_at: datetime
    parts: list[ReadingPartDetail]
    passages: list[ReadingPartDetail]
    origin: GeneratedTestOriginOut | None = None
