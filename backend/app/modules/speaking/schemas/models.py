from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.modules.assignments.schemas import GeneratedTestOriginOut


class SpeakingPartId(str, Enum):
    part_1 = "part1"
    part_2 = "part2"
    part_3 = "part3"


class SpeakingSessionStatus(str, Enum):
    idle = "idle"
    connecting = "connecting"
    connected = "connected"
    examiner_speaking = "examiner_speaking"
    user_listening = "user_listening"
    waiting_for_user = "waiting_for_user"
    user_speaking = "user_speaking"
    silence_watch = "silence_watch"
    examiner_interrupted = "examiner_interrupted"
    processing_turn_transition = "processing_turn_transition"
    moving_on = "moving_on"
    preparing_part2 = "preparing_part2"
    preparation_mode = "preparation_mode"
    long_turn_listening = "long_turn_listening"
    discussion_mode = "discussion_mode"
    closing = "closing"
    reconnecting = "reconnecting"
    finished = "finished"
    terminated = "terminated"


class SpeakingSpeaker(str, Enum):
    examiner = "examiner"
    user = "user"
    none = "none"


class SpeakingConnectionState(str, Enum):
    offline = "offline"
    connecting = "connecting"
    connected = "connected"
    reconnecting = "reconnecting"
    disconnected = "disconnected"


class SpeakingAttemptStatus(str, Enum):
    ready = "ready"
    in_progress = "in_progress"
    completed = "completed"
    terminated = "terminated"
    suspicious = "suspicious"


class SpeakingIntegrityEventType(str, Enum):
    tab_switch = "tab_switch"
    window_blur = "window_blur"
    route_leave = "route_leave"
    refresh_attempt = "refresh_attempt"
    disconnect = "disconnect"
    microphone_permission_lost = "microphone_permission_lost"


class SpeakingCueCard(BaseModel):
    topic: str
    prompt: str
    bullet_points: list[str]
    note_prompt: str
    preparation_seconds: int
    target_answer_seconds: int


class SpeakingQuestionDetail(BaseModel):
    id: str
    part_id: SpeakingPartId
    index: int
    prompt: str
    short_label: str
    expected_answer_seconds: int
    follow_ups: list[str] = Field(default_factory=list)
    rephrase_prompt: str | None = None
    cue_card: SpeakingCueCard | None = None


class SpeakingPartDetail(BaseModel):
    id: SpeakingPartId
    title: str
    examiner_guidance: str
    duration_minutes: int
    questions: list[SpeakingQuestionDetail]


class SpeakingTestListItem(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    level: Literal["Academic", "General"]
    duration_minutes: int
    is_active: bool
    created_at: datetime
    attempts_count: int = Field(ge=0, default=0)
    successful_attempts_count: int = Field(ge=0, default=0)
    failed_attempts_count: int = Field(ge=0, default=0)
    origin: GeneratedTestOriginOut | None = None


class SpeakingTestDetail(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    level: Literal["Academic", "General"]
    duration_minutes: int
    instructions: list[str]
    scoring_focus: list[str]
    created_at: datetime
    parts: list[SpeakingPartDetail]
    origin: GeneratedTestOriginOut | None = None


class SpeakingTranscriptSegment(BaseModel):
    id: str
    speaker: Literal["examiner", "user"]
    text: str
    is_final: bool
    started_at: str
    ended_at: str | None = None
    part_id: SpeakingPartId
    question_id: str
    interrupted: bool | None = None
    confidence: float | None = None
    source: Literal["speech-recognition", "speech-synthesis", "system"]


class SpeakingTurn(BaseModel):
    id: str
    speaker: Literal["examiner", "user"]
    part_id: SpeakingPartId
    question_id: str
    started_at: str
    ended_at: str | None = None
    interrupted: bool
    transcript_segment_ids: list[str] = Field(default_factory=list)
    status: Literal["active", "completed", "interrupted"]


class SpeakingCriteriaScore(BaseModel):
    key: Literal["fluency", "lexical", "grammar", "pronunciation"]
    label: str
    band: float
    rationale: str
    evidence: list[str] = Field(default_factory=list)


class SpeakingPartSummary(BaseModel):
    part_id: SpeakingPartId
    title: str
    summary: str
    estimated_band: float


class SpeakingResultMetadata(BaseModel):
    duration_seconds: int
    transcript_word_count: int
    interruption_count: int
    silence_recoveries: int


class SpeakingResult(BaseModel):
    session_id: str
    overall_band: float
    criteria: list[SpeakingCriteriaScore]
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    examiner_summary: str
    recommendations: list[str] = Field(default_factory=list)
    part_summaries: list[SpeakingPartSummary]
    transcript_preview: list[str] = Field(default_factory=list)
    session_metadata: SpeakingResultMetadata
    integrity_notes: list[str] = Field(default_factory=list)


class SpeakingIntegrityEvent(BaseModel):
    id: str
    type: SpeakingIntegrityEventType
    severity: Literal["warning", "critical"]
    message: str
    created_at: str
    session_status: SpeakingSessionStatus


class SpeakingSessionState(BaseModel):
    id: str
    test_id: int
    attempt_id: str
    title: str
    status: SpeakingSessionStatus
    connection_state: SpeakingConnectionState
    current_speaker: SpeakingSpeaker
    current_part_id: SpeakingPartId
    current_question_index: int
    asked_question_ids: list[str] = Field(default_factory=list)
    note_draft: str
    started_at: str
    updated_at: str
    completed_at: str | None = None
    elapsed_seconds: int
    prep_remaining_seconds: int
    transcript_segments: list[SpeakingTranscriptSegment] = Field(default_factory=list)
    turns: list[SpeakingTurn] = Field(default_factory=list)
    integrity_events: list[SpeakingIntegrityEvent] = Field(default_factory=list)
    result: SpeakingResult | None = None


class SpeakingSessionPersistIn(BaseModel):
    session: SpeakingSessionState


class SpeakingFinalizeIn(BaseModel):
    session: SpeakingSessionState


class SpeakingAttemptOut(BaseModel):
    id: str
    exam_id: int
    session_id: str
    test_id: int
    title: str
    started_at: str
    completed_at: str | None = None
    duration_seconds: int
    overall_band: float | None = None
    criteria: list[SpeakingCriteriaScore] = Field(default_factory=list)
    status: SpeakingAttemptStatus
    integrity_events: list[SpeakingIntegrityEvent] = Field(default_factory=list)
    result: SpeakingResult | None = None
    transcript_segments: list[SpeakingTranscriptSegment] = Field(default_factory=list)
    question_ids: list[str] = Field(default_factory=list)


class SpeakingTtsRequest(BaseModel):
    text: str
    voice: str | None = None


class ExaminerAnswerEvaluation(BaseModel):
    action: str
    reason: str
    cleaned_transcript: str
    has_real_answer: bool
    is_echo_leak: bool
    is_relevant: bool
    is_short: bool
    is_incomplete: bool
    is_rescue_needed: bool
    is_redirect_needed: bool
    is_too_long: bool
    overlap_ratio: float
    word_count: int


class ExaminerTurnMetrics(BaseModel):
    transcript: str
    word_count: int
    duration_ms: int
    was_silent: bool
    was_cut_off: bool
    follow_ups_used: int
    silence_prompts_used: int


class SpeakingExaminerDecisionIn(BaseModel):
    session: SpeakingSessionState
    evaluation: ExaminerAnswerEvaluation
    metrics: ExaminerTurnMetrics


class SpeakingExaminerDecisionOut(BaseModel):
    kind: Literal[
        "examiner_prompt",
        "prepare_part2",
        "follow_up",
        "reprompt",
        "rescue_prompt",
        "gentle_redirect",
        "move_on",
        "finish",
    ]
    question_id: str
    text: str
    rationale: str
    source: Literal["llm", "fallback"]


class LiveClientEvent(BaseModel):
    type: str
    exam_id: int
    client_id: str
    seq: int = Field(ge=0)
    nonce: str = Field(min_length=8, max_length=128)
    sent_at: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class LiveServerEvent(BaseModel):
    type: str
    exam_id: int
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
