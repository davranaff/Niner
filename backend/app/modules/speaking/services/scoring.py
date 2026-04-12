from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

from app.core.config import settings
from app.modules.exams.score import round_band_to_half
from app.modules.speaking.schemas import (
    SpeakingCriteriaScore,
    SpeakingPartSummary,
    SpeakingResult,
    SpeakingResultMetadata,
    SpeakingSessionState,
    SpeakingTestDetail,
)
from app.modules.speaking.services.result_builder import build_result as build_fallback_result

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

SCORING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "overall_band": {"type": "number"},
        "criteria": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "key": {
                        "type": "string",
                        "enum": ["fluency", "lexical", "grammar", "pronunciation"],
                    },
                    "label": {"type": "string"},
                    "band": {"type": "number"},
                    "rationale": {"type": "string"},
                    "evidence": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["key", "label", "band", "rationale", "evidence"],
            },
        },
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "examiner_summary": {"type": "string"},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "part_summaries": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "part_id": {"type": "string", "enum": ["part1", "part2", "part3"]},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "estimated_band": {"type": "number"},
                },
                "required": ["part_id", "title", "summary", "estimated_band"],
            },
        },
    },
    "required": [
        "overall_band",
        "criteria",
        "strengths",
        "weaknesses",
        "examiner_summary",
        "recommendations",
        "part_summaries",
    ],
}


def _scoring_model() -> str:
    return os.getenv("OPENAI_SPEAKING_SCORING_MODEL", settings.openai_model)


def _api_key() -> str:
    return (settings.openai_api_key or "").strip()


def _build_prompt_payload(session: SpeakingSessionState, test: SpeakingTestDetail) -> dict[str, Any]:
    transcript = [
        {
            "speaker": segment.speaker,
            "part_id": segment.part_id.value,
            "question_id": segment.question_id,
            "text": segment.text,
            "is_final": segment.is_final,
            "interrupted": bool(segment.interrupted),
        }
        for segment in session.transcript_segments
    ]
    return {
        "exam": {
            "id": session.id,
            "title": test.title,
            "duration_minutes": test.duration_minutes,
            "parts": [
                {
                    "id": part.id.value,
                    "title": part.title,
                    "questions": [question.prompt for question in part.questions],
                }
                for part in test.parts
            ],
        },
        "session_metadata": {
            "elapsed_seconds": session.elapsed_seconds,
            "integrity_events": [event.message for event in session.integrity_events],
            "interruption_count": len([turn for turn in session.turns if turn.interrupted]),
        },
        "transcript": transcript,
    }


def _coerce_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _coerce_part_summaries(
    payload: dict[str, Any],
    *,
    overall_band: float,
    test: SpeakingTestDetail,
) -> list[SpeakingPartSummary]:
    raw_items = payload.get("part_summaries")
    result: list[SpeakingPartSummary] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            part_id = str(item.get("part_id") or "").strip()
            if part_id not in {"part1", "part2", "part3"}:
                continue
            title = str(item.get("title") or "").strip()
            summary = str(item.get("summary") or "").strip()
            estimated_band = round_band_to_half(item.get("estimated_band", overall_band))
            if not title or not summary:
                continue
            result.append(
                SpeakingPartSummary(
                    part_id=part_id,
                    title=title,
                    summary=summary,
                    estimated_band=estimated_band,
                )
            )

    if result:
        return result

    fallback: list[SpeakingPartSummary] = []
    for part in test.parts:
        fallback.append(
            SpeakingPartSummary(
                part_id=part.id,
                title=part.title,
                summary="Part performance was evaluated from transcript coverage and response development.",
                estimated_band=overall_band,
            )
        )
    return fallback


def _coerce_result(
    payload: dict[str, Any],
    *,
    session: SpeakingSessionState,
    test: SpeakingTestDetail,
) -> SpeakingResult:
    overall_band = round_band_to_half(payload.get("overall_band", 0))
    criteria_items: list[SpeakingCriteriaScore] = []
    raw_criteria = payload.get("criteria")

    if isinstance(raw_criteria, list):
        for item in raw_criteria:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or "").strip()
            if key not in {"fluency", "lexical", "grammar", "pronunciation"}:
                continue
            criteria_items.append(
                SpeakingCriteriaScore(
                    key=key,
                    label=str(item.get("label") or key.title()).strip(),
                    band=round_band_to_half(item.get("band", overall_band)),
                    rationale=str(item.get("rationale") or "").strip()
                    or "Criterion assessment generated from transcript evidence.",
                    evidence=_coerce_list(item.get("evidence")),
                )
            )

    if len(criteria_items) != 4:
        return build_fallback_result(session, test)

    return SpeakingResult(
        session_id=session.id,
        overall_band=overall_band,
        criteria=criteria_items,
        strengths=_coerce_list(payload.get("strengths")),
        weaknesses=_coerce_list(payload.get("weaknesses")),
        examiner_summary=str(payload.get("examiner_summary") or "").strip()
        or "Evaluation generated from transcript, timing, and IELTS speaking criteria.",
        recommendations=_coerce_list(payload.get("recommendations")),
        part_summaries=_coerce_part_summaries(payload, overall_band=overall_band, test=test),
        transcript_preview=[
            segment.text
            for segment in session.transcript_segments
            if segment.speaker == "user" and segment.text.strip()
        ][:5],
        session_metadata=SpeakingResultMetadata(
            duration_seconds=session.elapsed_seconds,
            transcript_word_count=len(
                [
                    token
                    for token in " ".join(
                        segment.text for segment in session.transcript_segments if segment.speaker == "user"
                    ).split()
                    if token.strip()
                ]
            ),
            interruption_count=len([turn for turn in session.turns if turn.interrupted]),
            silence_recoveries=max(1, max(session.elapsed_seconds, 1) // 180),
        ),
        integrity_notes=[event.message for event in session.integrity_events],
    )


def _extract_output_text(payload: dict[str, Any]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

    raise RuntimeError("Speaking scoring response did not include structured output text.")


async def _score_with_llm(session: SpeakingSessionState, test: SpeakingTestDetail) -> SpeakingResult:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured for speaking scoring.")

    context_payload = _build_prompt_payload(session, test)
    payload = {
        "model": _scoring_model(),
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "You are an IELTS Speaking examiner quality-control engine. "
                            "Score by IELTS Speaking descriptors only. "
                            "Return strict JSON with criterion-level evidence and concise, actionable feedback. "
                            "Use half-band scoring increments only (x.0 or x.5)."
                        ),
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            f"IELTS speaking session context JSON:\n{json.dumps(context_payload, ensure_ascii=False)}\n\n"
                            "Evaluate this candidate and return structured JSON only."
                        ),
                    }
                ],
            },
        ],
        "max_output_tokens": 1200,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "ielts_speaking_score",
                "strict": True,
                "schema": SCORING_SCHEMA,
            }
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OPENAI_RESPONSES_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    response.raise_for_status()
    raw_payload = response.json()
    output_text = _extract_output_text(raw_payload)
    parsed = json.loads(output_text)
    if not isinstance(parsed, dict):
        raise RuntimeError("Speaking scoring payload is not a JSON object.")
    return _coerce_result(parsed, session=session, test=test)


async def score_speaking_session(session: SpeakingSessionState, test: SpeakingTestDetail) -> SpeakingResult:
    try:
        return await _score_with_llm(session, test)
    except Exception as error:  # noqa: BLE001
        logger.warning("Falling back to deterministic speaking result builder: %s", error)
        return build_fallback_result(session, test)
