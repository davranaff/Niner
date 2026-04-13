from __future__ import annotations

import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import CursorPage, serialize_page
from app.db.models import ProgressTestTypeEnum, ReadingQuestion, ReadingQuestionBlock, ReadingTest, User
from app.modules.assignments.services.generated_tests import (
    get_generated_test_origin,
    get_generated_test_origin_map,
)
from app.modules.reading import repository
from app.modules.reading.schemas import ReadingTestListItem

READING_OPTION_BLOCK_TYPES = {
    "matching_headings",
    "matching_paragraph_info",
    "matching_features",
    "matching_sentence_endings",
    "true_false_ng",
    "multiple_choice",
    "list_of_options",
    "choose_title",
}

READING_DROPDOWN_BLOCK_TYPES = {
    "matching_headings",
    "matching_paragraph_info",
    "matching_features",
    "matching_sentence_endings",
    "list_of_options",
    "choose_title",
}

READING_RADIO_BLOCK_TYPES = {
    "true_false_ng",
    "multiple_choice",
}

READING_TABLE_BLOCK_TYPES = {"table_completion"}

READING_INLINE_TEXT_BLOCK_TYPES = {
    "short_answers",
    "sentence_completion",
    "note_completion",
    "summary_completion",
    "flow_chart_completion",
    "diagram_completion",
}

_WORD_HINTS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}

_MAX_WORDS_RE = re.compile(r"no\s+more\s+than\s+(\w+)\s+words?", re.IGNORECASE)
_WORD_ONLY_RE = re.compile(r"(\w+)\s+word(?:\s+only)?", re.IGNORECASE)


def _extract_max_words(*texts: str | None) -> int | None:
    for raw_text in texts:
        if not raw_text:
            continue
        text = raw_text.strip()
        if not text:
            continue
        for pattern in (_MAX_WORDS_RE, _WORD_ONLY_RE):
            match = pattern.search(text)
            if not match:
                continue
            token = match.group(1).lower()
            if token.isdigit():
                return int(token)
            if token in _WORD_HINTS:
                return _WORD_HINTS[token]
    return None


def _build_answer_spec(block: ReadingQuestionBlock) -> dict[str, Any]:
    block_type = block.block_type
    if block_type in READING_DROPDOWN_BLOCK_TYPES:
        return {
            "answer_type": "single_choice",
            "input_variant": "dropdown",
            "options_mode": "per_question",
            "max_words": None,
        }
    if block_type in READING_RADIO_BLOCK_TYPES:
        return {
            "answer_type": "single_choice",
            "input_variant": "radio",
            "options_mode": "per_question",
            "max_words": None,
        }
    if block_type in READING_TABLE_BLOCK_TYPES:
        return {
            "answer_type": "text_input",
            "input_variant": "table_blank",
            "options_mode": None,
            "max_words": _extract_max_words(block.description, block.table_completion),
        }
    if block_type in READING_INLINE_TEXT_BLOCK_TYPES:
        return {
            "answer_type": "text_input",
            "input_variant": "inline_blank",
            "options_mode": None,
            "max_words": _extract_max_words(block.description, block.question_heading),
        }
    return {
        "answer_type": "text_input",
        "input_variant": "text",
        "options_mode": None,
        "max_words": _extract_max_words(block.description),
    }


def _serialize_question(question: ReadingQuestion, number: int) -> dict[str, Any]:
    spec = _build_answer_spec(question.question_block)
    payload: dict[str, Any] = {
        "id": question.id,
        "question_text": question.question_text,
        "order": question.order,
        "number": number,
        "answer_type": spec["answer_type"],
        "input_variant": spec["input_variant"],
        "options": [],
    }

    if question.question_block.block_type in READING_OPTION_BLOCK_TYPES:
        payload["options"] = [
            {
                "id": option.id,
                "option_text": option.option_text,
                "is_correct": option.is_correct,
                "order": option.order,
            }
            for option in sorted(question.options, key=lambda x: x.order)
        ]
    return payload


def _serialize_block(block: ReadingQuestionBlock, numbering: dict[int, int]) -> dict[str, Any]:
    answer_spec = _build_answer_spec(block)
    payload: dict[str, Any] = {
        "id": block.id,
        "title": block.title,
        "description": block.description,
        "block_type": block.block_type,
        "order": block.order,
        "answer_spec": answer_spec,
        "questions": [
            _serialize_question(question, numbering.get(question.id, 0))
            for question in sorted(block.questions, key=lambda x: x.order)
        ],
    }

    if block.block_type == "note_completion":
        payload["question_heading"] = block.question_heading
    if block.block_type == "matching_headings":
        payload["list_of_headings"] = block.list_of_headings
    if block.block_type == "table_completion":
        payload["table_json"] = block.table_json
    if block.flow_chart_completion:
        payload["flow_chart_completion"] = block.flow_chart_completion

    return payload


def question_numbering(test: ReadingTest) -> dict[int, int]:
    ordered_questions: list[ReadingQuestion] = [
        question
        for passage in sorted(test.passages, key=lambda p: p.passage_number)
        for block in sorted(passage.question_blocks, key=lambda b: b.order)
        for question in sorted(block.questions, key=lambda q: q.order)
    ]
    return {question.id: idx + 1 for idx, question in enumerate(ordered_questions)}


def serialize_reading_test_detail(test: ReadingTest) -> dict[str, Any]:
    numbering = question_numbering(test)
    parts = [
        {
            "id": passage.id,
            "title": passage.title,
            "content": passage.content,
            "passage_number": passage.passage_number,
            "part_number": passage.passage_number,
            "question_blocks": [
                _serialize_block(block, numbering)
                for block in sorted(passage.question_blocks, key=lambda x: x.order)
            ],
            "questions_count": sum(len(block.questions) for block in passage.question_blocks),
        }
        for passage in sorted(test.passages, key=lambda x: x.passage_number)
    ]
    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "time_limit": test.time_limit,
        "created_at": test.created_at,
        "parts": parts,
        # Backward-compatible alias for older clients.
        "passages": parts,
    }


async def list_reading_tests(
    db: AsyncSession,
    user: User,
    offset: int,
    limit: int,
) -> CursorPage:
    rows = await repository.list_active_tests(db, offset=offset, limit=limit)
    origin_by_test_id = await get_generated_test_origin_map(
        db,
        user_id=user.id,
        module=ProgressTestTypeEnum.reading,
        test_ids=[row.id for row in rows],
    )
    stats_by_test_id = await repository.get_attempt_stats_by_test_ids(
        db,
        user_id=user.id,
        test_ids=[row.id for row in rows],
    )
    return serialize_page(
        rows,
        serializer=lambda row: ReadingTestListItem(
            id=row.id,
            title=row.title,
            description=row.description,
            time_limit=row.time_limit,
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


async def get_reading_test_detail(db: AsyncSession, user: User, test_id: int) -> dict[str, Any]:
    test = await repository.get_test_detail(db, test_id)
    if test is None:
        raise ApiError(code="reading_test_not_found", message="Reading test not found", status_code=404)
    payload = serialize_reading_test_detail(test)
    payload["origin"] = await get_generated_test_origin(
        db,
        user_id=user.id,
        module=ProgressTestTypeEnum.reading,
        test_id=test_id,
    )
    return payload
