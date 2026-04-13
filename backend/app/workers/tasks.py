from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from arq import Retry
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.models import (
    AiModuleSummary,
    AiSummaryStatusEnum,
    ListeningQuestionBlock,
    ParseStatusEnum,
    ReadingQuestionBlock,
    ProgressTestTypeEnum,
    TrainingAssignment,
    UserAnalytics,
    UserProgress,
    WritingExam,
    WritingExamPart,
)
from app.db.session import SessionLocal
from app.modules.assignments import services as assignment_services
from app.modules.assignments.services.generated_tests import (
    GENERATION_STATUS_FAILED,
    GENERATION_STATUS_QUEUED,
    perform_assignment_test_generation,
)
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


async def generate_assignment_test(ctx: dict, assignment_id: int) -> None:
    job_try = int(ctx.get("job_try", 1))

    async with SessionLocal() as db:
        assignment = await db.get(TrainingAssignment, assignment_id)
        if assignment is None:
            logger.warning("Assignment generation skipped, assignment not found", extra={"assignment_id": assignment_id})
            return

        try:
            await perform_assignment_test_generation(db, assignment_id=assignment_id)
        except Exception as exc:  # noqa: BLE001
            assignment = await db.get(TrainingAssignment, assignment_id)
            if assignment is not None:
                assignment.generation_error = str(exc)
                if job_try < 3:
                    assignment.generation_status = GENERATION_STATUS_QUEUED
                    assignment.generation_progress = max(5, int(assignment.generation_progress or 0))
                    await db.commit()
                    raise Retry(defer=2**job_try) from exc

                assignment.generation_status = GENERATION_STATUS_FAILED
                await db.commit()
            logger.exception("Weak-area test generation failed", extra={"assignment_id": assignment_id})


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


def _calculate_elapsed_seconds(
    started_at: datetime | None,
    finished_at: datetime | None,
) -> int | None:
    if not started_at or not finished_at:
        return None
    if started_at.tzinfo is None and finished_at.tzinfo is not None:
        finished_at = finished_at.replace(tzinfo=None)
    elif started_at.tzinfo is not None and finished_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=None)
    elapsed_seconds = int((finished_at - started_at).total_seconds())
    return max(elapsed_seconds, 0)


def _calculate_writing_exam_band(exam: WritingExam) -> Decimal | None:
    submitted_parts = [part for part in exam.writing_parts if (part.essay or "").strip()]
    if not submitted_parts:
        return None
    if any(part.score is None for part in submitted_parts):
        return None

    weighted_total = Decimal("0.0")
    total_weight = Decimal("0.0")

    for part in submitted_parts:
        part_score = Decimal(str(part.score))
        part_order = int(getattr(getattr(part, "part", None), "order", 0) or 0)
        part_weight = Decimal("2.0") if part_order == 2 else Decimal("1.0")
        weighted_total += part_score * part_weight
        total_weight += part_weight

    if total_weight <= Decimal("0.0"):
        return None

    return _to_band_decimal(weighted_total / total_weight)


async def _sync_writing_exam_progress(
    db: AsyncSession,
    *,
    exam: WritingExam,
    band_score: Decimal,
) -> None:
    if exam.finished_at is None:
        return

    progress_exists = (
        await db.execute(
            select(UserProgress.id)
            .where(
                UserProgress.user_id == exam.user_id,
                UserProgress.test_type == ProgressTestTypeEnum.writing,
                UserProgress.test_date == exam.finished_at,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if progress_exists is not None:
        return

    submitted_parts = [part for part in exam.writing_parts if (part.essay or "").strip()]
    progress = UserProgress(
        user_id=exam.user_id,
        test_date=exam.finished_at,
        band_score=band_score,
        correct_answers=None,
        total_questions=len(submitted_parts) or None,
        time_taken_seconds=_calculate_elapsed_seconds(exam.started_at, exam.finished_at),
        test_type=ProgressTestTypeEnum.writing,
    )
    db.add(progress)

    analytics = (
        await db.execute(
            select(UserAnalytics).where(UserAnalytics.user_id == exam.user_id).limit(1)
        )
    ).scalar_one_or_none()
    if analytics is None:
        analytics = UserAnalytics(user_id=exam.user_id)
        db.add(analytics)
        await db.flush()

    previous_total_tests = int(analytics.total_tests_taken or 0)
    previous_average = Decimal(str(analytics.average_band_score or Decimal("0.0")))
    analytics.total_tests_taken = previous_total_tests + 1
    analytics.total_study_time_seconds = int(analytics.total_study_time_seconds or 0) + int(
        progress.time_taken_seconds or 0
    )
    analytics.last_test_date = progress.test_date
    analytics.best_band_score = max(
        Decimal(str(analytics.best_band_score or Decimal("0.0"))),
        band_score,
    )
    cumulative = previous_average * Decimal(previous_total_tests)
    analytics.average_band_score = (cumulative + band_score) / Decimal(analytics.total_tests_taken)

    await db.commit()


async def _sync_writing_exam_post_scoring_state(
    db: AsyncSession,
    *,
    exam_id: int,
) -> None:
    exam_stmt = (
        select(WritingExam)
        .where(WritingExam.id == exam_id)
        .options(
            selectinload(WritingExam.user),
            selectinload(WritingExam.writing_parts).selectinload(WritingExamPart.part),
        )
    )
    exam = (await db.execute(exam_stmt)).scalar_one_or_none()
    if exam is None or exam.finished_at is None:
        return

    band_score = _calculate_writing_exam_band(exam)
    if band_score is not None:
        await _sync_writing_exam_progress(
            db,
            exam=exam,
            band_score=band_score,
        )

    if exam.user is None:
        return

    try:
        await assignment_services.ensure_writing_exam_assignments(
            db,
            exam.user,
            exam_id=exam.id,
        )
    except Exception:  # noqa: BLE001
        logger.exception(
            "Writing assignment sync after worker scoring failed",
            extra={"exam_id": exam.id, "exam_part_ids": [part.id for part in exam.writing_parts]},
        )


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
            await _sync_writing_exam_post_scoring_state(
                db,
                exam_id=int(exam_part.exam_id),
            )
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
                exam_id=summary.exam_id,
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
