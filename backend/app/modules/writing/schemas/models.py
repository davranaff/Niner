from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.assignments.schemas import GeneratedTestOriginOut


class WritingTestListItem(BaseModel):
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


class WritingPromptAssets(BaseModel):
    text: str
    image_urls: list[str] = Field(default_factory=list)
    file_urls: list[str] = Field(default_factory=list)


class WritingAnswerSpec(BaseModel):
    answer_type: str
    input_variant: str


class WritingPartDetail(BaseModel):
    id: int
    order: int
    test_id: int
    task: str
    image_url: str | None = None
    file_urls: list[str] = Field(default_factory=list)
    prompt: WritingPromptAssets
    answer_spec: WritingAnswerSpec


class WritingTestDetail(BaseModel):
    id: int
    title: str
    description: str
    time_limit: int
    created_at: datetime
    parts: list[WritingPartDetail]
    writing_parts: list[WritingPartDetail]
    origin: GeneratedTestOriginOut | None = None
