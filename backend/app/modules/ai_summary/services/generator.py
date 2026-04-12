from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from decimal import Decimal
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.db.models import AiSummaryModuleEnum, ListeningExam, ReadingExam, WritingExam
from app.modules.ai_summary import repository
from app.modules.ai_summary.services.analysis import build_summary_payload
from app.modules.exams.score import listening_band_score, reading_band_score, round_band_to_half

TokenCallback = Callable[[str], Awaitable[None]]


def _elapsed_seconds(started_at: datetime | None, finished_at: datetime | None) -> int | None:
    if started_at is None or finished_at is None:
        return None

    if started_at.tzinfo is None and finished_at.tzinfo is not None:
        finished_at = finished_at.replace(tzinfo=None)
    elif started_at.tzinfo is not None and finished_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=None)

    return max(int((finished_at - started_at).total_seconds()), 0)


def _to_float(value: Decimal | float | int | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _reading_attempt(exam: ReadingExam) -> dict[str, Any]:
    correct = sum(1 for answer in exam.question_answers if answer.is_correct)
    total = len(exam.question_answers)

    mistakes: list[dict[str, Any]] = []
    for answer in exam.question_answers:
        if answer.is_correct:
            continue
        question = answer.question
        block = question.question_block if question else None
        mistakes.append(
            {
                "question_id": answer.question_id,
                "question_text": question.question_text if question else None,
                "block_type": block.block_type if block else None,
                "user_answer": answer.user_answer,
                "correct_answer": answer.correct_answer,
            }
        )

    return {
        "exam_id": exam.id,
        "test_title": exam.reading_test.title if exam.reading_test else "Reading",
        "finished_at": exam.finished_at,
        "time_spent_seconds": _elapsed_seconds(exam.started_at, exam.finished_at),
        "time_limit_seconds": int(exam.reading_test.time_limit) if exam.reading_test else None,
        "correct_answers": correct,
        "total_questions": total,
        "score": _to_float(reading_band_score(correct)),
        "mistakes": mistakes,
    }


def _listening_attempt(exam: ListeningExam) -> dict[str, Any]:
    correct = sum(1 for answer in exam.question_answers if answer.is_correct)
    total = len(exam.question_answers)

    mistakes: list[dict[str, Any]] = []
    for answer in exam.question_answers:
        if answer.is_correct:
            continue
        question = answer.question
        block = question.question_block if question else None
        mistakes.append(
            {
                "question_id": answer.question_id,
                "question_text": question.question_text if question else None,
                "block_type": block.block_type if block else None,
                "user_answer": answer.user_answer,
                "correct_answer": answer.correct_answer,
            }
        )

    return {
        "exam_id": exam.id,
        "test_title": exam.listening_test.title if exam.listening_test else "Listening",
        "finished_at": exam.finished_at,
        "time_spent_seconds": _elapsed_seconds(exam.started_at, exam.finished_at),
        "time_limit_seconds": int(exam.listening_test.time_limit) if exam.listening_test else None,
        "correct_answers": correct,
        "total_questions": total,
        "score": _to_float(listening_band_score(correct)),
        "mistakes": mistakes,
    }


def _writing_attempt(exam: WritingExam) -> dict[str, Any]:
    parts: list[dict[str, Any]] = []
    weighted_total = Decimal("0.0")
    total_weight = Decimal("0.0")
    mistakes: list[dict[str, Any]] = []

    for part in exam.writing_parts:
        part_score = _to_float(part.score)
        if part_score is not None:
            part_order = int(getattr(getattr(part, "part", None), "order", 0) or 0)
            part_weight = Decimal("2.0") if part_order == 2 else Decimal("1.0")
            weighted_total += Decimal(str(part.score)) * part_weight
            total_weight += part_weight

        parts.append(
            {
                "part_id": part.part_id,
                "essay": part.essay,
                "score": part_score,
                "corrections": part.corrections,
            }
        )

        if part.corrections and "improve" in part.corrections.lower():
            mistakes.append(
                {
                    "question_id": part.part_id,
                    "question_text": part.part.task if part.part else "Writing task",
                    "block_type": "writing_feedback",
                    "user_answer": None,
                    "correct_answer": None,
                }
            )

    score = round_band_to_half(weighted_total / total_weight) if total_weight > Decimal("0.0") else None

    return {
        "exam_id": exam.id,
        "test_title": exam.writing_test.title if exam.writing_test else "Writing",
        "finished_at": exam.finished_at,
        "time_spent_seconds": _elapsed_seconds(exam.started_at, exam.finished_at),
        "time_limit_seconds": int(exam.writing_test.time_limit) if exam.writing_test else None,
        "correct_answers": None,
        "total_questions": len(parts),
        "score": score,
        "parts": parts,
        "mistakes": mistakes,
    }


async def collect_module_attempts(
    db,
    *,
    user_id: int,
    module: AiSummaryModuleEnum,
    attempts_limit: int,
    exam_id: int | None = None,
) -> list[dict[str, Any]]:
    if module == AiSummaryModuleEnum.reading:
        if exam_id is not None:
            row = await repository.get_finished_reading_exam(db, user_id=user_id, exam_id=exam_id)
            if row is not None:
                return [_reading_attempt(row)]
        rows = await repository.list_recent_reading_exams(db, user_id=user_id, limit=attempts_limit)
        return [_reading_attempt(row) for row in rows]

    if module == AiSummaryModuleEnum.listening:
        if exam_id is not None:
            row = await repository.get_finished_listening_exam(db, user_id=user_id, exam_id=exam_id)
            if row is not None:
                return [_listening_attempt(row)]
        rows = await repository.list_recent_listening_exams(db, user_id=user_id, limit=attempts_limit)
        return [_listening_attempt(row) for row in rows]

    if exam_id is not None:
        row = await repository.get_finished_writing_exam(db, user_id=user_id, exam_id=exam_id)
        if row is not None:
            return [_writing_attempt(row)]

    rows = await repository.list_recent_writing_exams(db, user_id=user_id, limit=attempts_limit)
    return [_writing_attempt(row) for row in rows]


async def _fallback_stream(payload: dict[str, Any], on_token: TokenCallback) -> dict[str, Any]:
    text = str(payload.get("summary_text") or "")
    chunks = [text[i : i + 32] for i in range(0, len(text), 32)] or ["Summary generated."]
    stream_accum = ""
    for chunk in chunks:
        stream_accum += chunk
        await on_token(chunk)
    payload["summary_text"] = stream_accum
    return payload


async def _ai_stream(
    *,
    module: AiSummaryModuleEnum,
    lang: str,
    base_payload: dict[str, Any],
    on_token: TokenCallback,
) -> dict[str, Any]:
    if not settings.openai_api_key:
        return await _fallback_stream(base_payload, on_token)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    stream = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "developer",
                "content": (
                    "You are an IELTS preparation coach. Return only valid JSON with keys: "
                    "timing_analysis, accuracy_analysis, mistake_hotspots, grammar_focus, topic_focus, "
                    "improvement, action_plan, summary_text. "
                    "Keep feedback factual, specific, and learner-friendly."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Module: {module.value}\n"
                    f"Language: {lang}\n"
                    f"Input data JSON:\n{json.dumps(base_payload, ensure_ascii=True)}\n\n"
                    "Improve this into high-quality structured coaching summary."
                ),
            },
        ],
        temperature=0.2,
        stream=True,
        response_format={"type": "json_object"},
    )

    buffer = ""
    async for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if not delta:
            continue
        buffer += delta
        await on_token(delta)

    parsed = json.loads(buffer)
    if not isinstance(parsed, dict):
        raise RuntimeError("AI summary payload is not JSON object")
    return parsed


async def build_module_summary(
    db,
    *,
    user_id: int,
    module: AiSummaryModuleEnum,
    attempts_limit: int,
    lang: str,
    on_token: TokenCallback,
    exam_id: int | None = None,
) -> dict[str, Any]:
    attempts = await collect_module_attempts(
        db,
        user_id=user_id,
        module=module,
        attempts_limit=attempts_limit,
        exam_id=exam_id,
    )
    if exam_id is not None and not attempts:
        attempts = await collect_module_attempts(
            db,
            user_id=user_id,
            module=module,
            attempts_limit=attempts_limit,
            exam_id=None,
        )

    base_payload = build_summary_payload(module, attempts)
    if exam_id is not None:
        base_payload["summary_scope"] = {
            "type": "single_exam" if attempts and attempts[0].get("exam_id") == exam_id else "fallback_recent",
            "module": module.value,
            "exam_id": exam_id,
        }

    try:
        payload = await _ai_stream(module=module, lang=lang, base_payload=base_payload, on_token=on_token)
    except Exception:
        payload = await _fallback_stream(base_payload, on_token)

    # Ensure required keys always exist.
    required_keys = {
        "timing_analysis",
        "accuracy_analysis",
        "mistake_hotspots",
        "grammar_focus",
        "topic_focus",
        "improvement",
        "action_plan",
        "summary_text",
    }
    for key in required_keys:
        payload.setdefault(key, base_payload.get(key))

    return payload
