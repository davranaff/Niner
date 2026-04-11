from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from arq import Retry
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.models import (
    AiModuleSummary,
    AiSummaryStatusEnum,
    ListeningQuestionBlock,
    ParseStatusEnum,
    ReadingQuestionBlock,
    WritingExamPart,
)
from app.db.session import SessionLocal
from app.modules.ai_summary.services.generator import build_module_summary

logger = logging.getLogger(__name__)


async def _parse_table_to_json(content: str) -> dict:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "developer",
                "content": "Return only valid JSON object with keys header and rows.",
            },
            {"role": "user", "content": content},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    payload = response.choices[0].message.content or "{}"
    return json.loads(payload)


async def parse_table_completion(ctx: dict, kind: str, block_id: int) -> None:
    job_try = int(ctx.get("job_try", 1))

    async with SessionLocal() as db:
        model = ReadingQuestionBlock if kind == "reading" else ListeningQuestionBlock
        block = (await db.execute(select(model).where(model.id == block_id))).scalar_one_or_none()
        if block is None:
            logger.warning("Parse skipped, block not found", extra={"kind": kind, "block_id": block_id})
            return

        try:
            block.parse_status = ParseStatusEnum.pending
            await db.flush()

            result = await _parse_table_to_json(block.table_completion or "")
            block.table_json = result
            block.parse_status = ParseStatusEnum.done
            block.parse_error = None
            await db.commit()
        except Exception as exc:  # noqa: BLE001
            block.parse_error = str(exc)
            if job_try < 3:
                block.parse_status = ParseStatusEnum.pending
                await db.commit()
                raise Retry(defer=2**job_try) from exc

            block.parse_status = ParseStatusEnum.failed
            await db.commit()
            logger.exception("Table parse failed", extra={"kind": kind, "block_id": block_id})


def _to_band_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        band = Decimal(str(value))
    except Exception:  # noqa: BLE001
        return None

    if band < Decimal("0"):
        band = Decimal("0")
    if band > Decimal("9"):
        band = Decimal("9")

    doubled = (band * Decimal("2")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return (doubled / Decimal("2")).quantize(Decimal("0.0"))


def _average_criteria_band(criteria: Any) -> Decimal | None:
    if not isinstance(criteria, dict):
        return None

    bands: list[Decimal] = []
    for item in criteria.values():
        if isinstance(item, dict):
            parsed = _to_band_decimal(item.get("band"))
        else:
            parsed = _to_band_decimal(item)
        if parsed is not None:
            bands.append(parsed)

    if not bands:
        return None

    avg = sum(bands, start=Decimal("0")) / Decimal(len(bands))
    return _to_band_decimal(avg)


async def _evaluate_writing_essay(task_prompt: str, essay: str) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "developer",
                "content": (
                    "You are an IELTS Writing examiner. Evaluate the essay strictly by IELTS Writing criteria and "
                    "return only JSON with keys: overall_band, criteria, strengths, improvements, summary. "
                    "criteria must contain task_response, coherence_cohesion, lexical_resource, grammar_accuracy. "
                    "Each criterion must include band and reason. Use concise and specific feedback."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Task prompt:\n{task_prompt.strip()}\n\n"
                    f"Student essay:\n{essay.strip()}\n\n"
                    "Return IELTS-style evaluation in JSON only."
                ),
            },
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    payload_raw = response.choices[0].message.content or "{}"
    payload = json.loads(payload_raw)
    if not isinstance(payload, dict):
        raise RuntimeError("Invalid AI payload: expected JSON object")
    return payload


def _format_writing_feedback(evaluation: dict[str, Any]) -> str:
    lines: list[str] = []

    overall = evaluation.get("overall_band")
    if overall is not None:
        lines.append(f"Estimated IELTS Writing band: {overall}")

    summary = str(evaluation.get("summary") or "").strip()
    if summary:
        if lines:
            lines.append("")
        lines.append(f"Summary: {summary}")

    criteria = evaluation.get("criteria") if isinstance(evaluation.get("criteria"), dict) else {}
    criteria_labels = [
        ("task_response", "Task Response / Achievement"),
        ("coherence_cohesion", "Coherence and Cohesion"),
        ("lexical_resource", "Lexical Resource"),
        ("grammar_accuracy", "Grammatical Range and Accuracy"),
    ]

    criteria_lines: list[str] = []
    for key, label in criteria_labels:
        item = criteria.get(key)
        band_value: Any = None
        reason = ""

        if isinstance(item, dict):
            band_value = item.get("band")
            reason = str(item.get("reason") or item.get("comment") or "").strip()
        else:
            band_value = item

        if band_value is None and not reason:
            continue

        if band_value is not None and reason:
            criteria_lines.append(f"- {label}: {band_value}. {reason}")
        elif band_value is not None:
            criteria_lines.append(f"- {label}: {band_value}.")
        else:
            criteria_lines.append(f"- {label}: {reason}")

    if criteria_lines:
        if lines:
            lines.append("")
        lines.append("Criteria breakdown:")
        lines.extend(criteria_lines)

    strengths = evaluation.get("strengths")
    if isinstance(strengths, list):
        strengths_lines = [str(item).strip() for item in strengths if str(item).strip()]
    else:
        strengths_lines = []

    if strengths_lines:
        if lines:
            lines.append("")
        lines.append("Strengths:")
        lines.extend([f"- {item}" for item in strengths_lines])

    improvements = evaluation.get("improvements")
    if isinstance(improvements, list):
        improvements_lines = [str(item).strip() for item in improvements if str(item).strip()]
    else:
        improvements_lines = []

    if improvements_lines:
        if lines:
            lines.append("")
        lines.append("How to improve:")
        lines.extend([f"- {item}" for item in improvements_lines])

    return "\n".join(lines).strip() or "AI generated no feedback."


async def evaluate_writing_exam_part(ctx: dict, exam_part_id: int) -> None:
    job_try = int(ctx.get("job_try", 1))

    async with SessionLocal() as db:
        stmt = (
            select(WritingExamPart)
            .where(WritingExamPart.id == exam_part_id)
            .options(selectinload(WritingExamPart.part))
        )
        exam_part = (await db.execute(stmt)).scalar_one_or_none()

        if exam_part is None:
            logger.warning("Writing AI evaluation skipped, exam part not found", extra={"exam_part_id": exam_part_id})
            return

        if exam_part.is_checked:
            logger.info(
                "Writing AI evaluation skipped, part already checked by admin",
                extra={"exam_part_id": exam_part_id},
            )
            return

        essay = (exam_part.essay or "").strip()
        if not essay:
            exam_part.score = None
            exam_part.corrections = "AI evaluation skipped: empty essay."
            await db.commit()
            return

        task_prompt = exam_part.part.task if exam_part.part is not None else ""

        try:
            evaluation = await _evaluate_writing_essay(task_prompt, essay)
            band = _to_band_decimal(evaluation.get("overall_band"))
            if band is None:
                band = _average_criteria_band(evaluation.get("criteria"))

            exam_part.score = band
            exam_part.corrections = _format_writing_feedback(evaluation)
            await db.commit()
        except Exception as exc:  # noqa: BLE001
            if job_try < 3:
                raise Retry(defer=2**job_try) from exc

            exam_part.score = None
            exam_part.corrections = f"AI evaluation failed after retries: {exc}"
            await db.commit()
            logger.exception("Writing AI evaluation failed", extra={"exam_part_id": exam_part_id})


async def generate_module_summary(ctx: dict, summary_id: int) -> None:
    job_try = int(ctx.get("job_try", 1))

    async with SessionLocal() as db:
        summary = await db.get(AiModuleSummary, summary_id)
        if summary is None:
            logger.warning("AI summary generation skipped, summary not found", extra={"summary_id": summary_id})
            return

        if summary.status == AiSummaryStatusEnum.done:
            return

        summary.status = AiSummaryStatusEnum.running
        summary.error_text = None
        summary.started_at = summary.started_at or datetime.now(UTC)
        summary.finished_at = None
        summary.stream_text = ""
        await db.commit()
        await db.refresh(summary)

        token_counter = 0

        async def on_token(token: str) -> None:
            nonlocal token_counter
            token_counter += 1
            summary.stream_text = f"{summary.stream_text or ''}{token}"
            if token_counter % 8 == 0:
                await db.commit()

        try:
            payload = await build_module_summary(
                db,
                user_id=summary.user_id,
                module=summary.module,
                attempts_limit=summary.attempts_limit,
                lang=summary.lang,
                on_token=on_token,
            )

            summary.result_json = payload
            summary.result_text = str(payload.get("summary_text") or "")
            summary.status = AiSummaryStatusEnum.done
            summary.finished_at = datetime.now(UTC)
            summary.error_text = None
            await db.commit()
        except Exception as exc:  # noqa: BLE001
            summary.error_text = str(exc)
            if job_try < 3:
                summary.status = AiSummaryStatusEnum.pending
                await db.commit()
                raise Retry(defer=2**job_try) from exc

            summary.status = AiSummaryStatusEnum.failed
            summary.finished_at = datetime.now(UTC)
            await db.commit()
            logger.exception("AI summary generation failed", extra={"summary_id": summary_id})
