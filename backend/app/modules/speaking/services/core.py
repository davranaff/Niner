from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import CursorPage, serialize_page
from app.db.models import ProgressTestTypeEnum, SpeakingQuestion, SpeakingTest, User
from app.modules.assignments.services.generated_tests import (
    get_generated_test_origin,
    get_generated_test_origin_map,
)
from app.modules.speaking import repository
from app.modules.speaking.schemas import SpeakingTestListItem


def _serialize_question(question: SpeakingQuestion) -> dict[str, Any]:
    return {
        "id": question.question_code,
        "part_id": question.part.part_id,
        "index": question.question_order,
        "prompt": question.prompt,
        "short_label": question.short_label,
        "expected_answer_seconds": question.expected_answer_seconds,
        "follow_ups": list(question.follow_ups or []),
        "rephrase_prompt": question.rephrase_prompt,
        "cue_card": question.cue_card,
    }


def _serialize_part(part: Any) -> dict[str, Any]:
    questions = [
        _serialize_question(question)
        for question in sorted(part.questions, key=lambda item: item.question_order)
    ]

    return {
        "id": part.part_id,
        "title": part.title,
        "examiner_guidance": part.examiner_guidance,
        "duration_minutes": part.duration_minutes,
        "questions": questions,
    }


def serialize_speaking_test_detail(test: SpeakingTest) -> dict[str, Any]:
    parts = [_serialize_part(part) for part in sorted(test.parts, key=lambda item: item.part_order)]

    return {
        "id": test.id,
        "slug": test.slug,
        "title": test.title,
        "description": test.description,
        "level": test.level,
        "duration_minutes": test.duration_minutes,
        "instructions": list(test.instructions or []),
        "scoring_focus": list(test.scoring_focus or []),
        "created_at": test.created_at,
        "parts": parts,
    }


def flatten_test_questions(test: SpeakingTest) -> list[SpeakingQuestion]:
    questions: list[SpeakingQuestion] = []
    for part in sorted(test.parts, key=lambda item: item.part_order):
        questions.extend(sorted(part.questions, key=lambda item: item.question_order))
    return questions


def question_lookup(test: SpeakingTest) -> dict[str, SpeakingQuestion]:
    return {question.question_code: question for question in flatten_test_questions(test)}


def get_question_by_index(test: SpeakingTest, index: int) -> SpeakingQuestion:
    questions = flatten_test_questions(test)
    if not questions:
        raise ApiError(code="speaking_test_invalid", message="Speaking test has no questions", status_code=500)

    safe_index = min(max(index, 0), len(questions) - 1)
    return questions[safe_index]


def get_next_question_by_index(test: SpeakingTest, index: int) -> SpeakingQuestion | None:
    questions = flatten_test_questions(test)
    next_index = index + 1
    if next_index >= len(questions):
        return None
    return questions[next_index]


async def list_speaking_tests(db: AsyncSession, user: User, offset: int, limit: int) -> CursorPage:
    rows = await repository.list_active_tests(db, offset=offset, limit=limit)
    origin_by_test_id = await get_generated_test_origin_map(
        db,
        user_id=user.id,
        module=ProgressTestTypeEnum.speaking,
        test_ids=[row.id for row in rows],
    )
    stats_by_test_id = await repository.get_attempt_stats_by_test_ids(
        db,
        user_id=user.id,
        test_ids=[row.id for row in rows],
    )
    return serialize_page(
        rows,
        serializer=lambda row: SpeakingTestListItem(
            id=row.id,
            slug=row.slug,
            title=row.title,
            description=row.description,
            level=row.level,
            duration_minutes=row.duration_minutes,
            is_active=row.is_active,
            created_at=row.created_at,
            attempts_count=stats_by_test_id.get(row.id, {}).get("attempts_count", 0),
            successful_attempts_count=stats_by_test_id.get(row.id, {}).get(
                "successful_attempts_count",
                0,
            ),
            failed_attempts_count=stats_by_test_id.get(row.id, {}).get(
                "failed_attempts_count",
                0,
            ),
            origin=origin_by_test_id.get(row.id),
        ).model_dump(),
        limit=limit,
        offset=offset,
    )


async def get_speaking_test_detail(db: AsyncSession, user: User, test_id: int) -> dict[str, Any]:
    test = await repository.get_test_detail(db, test_id)
    if test is None:
        raise ApiError(code="speaking_test_not_found", message="Speaking test not found", status_code=404)
    payload = serialize_speaking_test_detail(test)
    payload["origin"] = await get_generated_test_origin(
        db,
        user_id=user.id,
        module=ProgressTestTypeEnum.speaking,
        test_id=test_id,
    )
    return payload
