from __future__ import annotations

import re
from typing import Any

from app.db.models import ListeningQuestion, ReadingQuestion
from app.modules.listening.services.core import _build_answer_spec as build_listening_answer_spec
from app.modules.reading.services.core import _build_answer_spec as build_reading_answer_spec

_WORDS_RE = re.compile(r"\S+")

def _count_words(value: str) -> int:
    return len(_WORDS_RE.findall(value))


def _normalize_question_values(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion | ListeningQuestion],
) -> dict[int, str]:
    normalized_values: dict[int, str] = {}

    for item in answers:
        raw_question_id = item.get("id")
        try:
            question_id = int(raw_question_id)
        except (TypeError, ValueError):
            continue

        if question_id not in question_index:
            continue

        raw_value = item.get("value", "")
        value = "" if raw_value is None else str(raw_value).strip()
        normalized_values[question_id] = value

    return normalized_values


def _normalize_choice_or_text_submission(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion | ListeningQuestion],
    spec_builder: Any,
) -> list[dict[str, Any]]:
    submitted_values = _normalize_question_values(answers, question_index=question_index)
    normalized_answers: list[dict[str, Any]] = []

    for question_id, question in question_index.items():
        value = submitted_values.get(question_id, "")
        normalized_value = value
        answer_spec = spec_builder(question.question_block)

        if answer_spec["answer_type"] == "single_choice":
            allowed_values = {
                str(option.option_text).strip().lower()
                for option in question.options
                if str(option.option_text).strip()
            }
            if value.lower() not in allowed_values:
                normalized_value = ""
        else:
            max_words = answer_spec.get("max_words")
            if max_words is not None and _count_words(value) > int(max_words):
                normalized_value = ""

        normalized_answers.append(
            {
                "id": question_id,
                "value": normalized_value,
            }
        )

    return normalized_answers


def validate_reading_submit_payload(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion],
) -> list[dict[str, Any]]:
    return _normalize_choice_or_text_submission(
        answers,
        question_index=question_index,
        spec_builder=build_reading_answer_spec,
    )


def validate_listening_submit_payload(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ListeningQuestion],
) -> list[dict[str, Any]]:
    return _normalize_choice_or_text_submission(
        answers,
        question_index=question_index,
        spec_builder=build_listening_answer_spec,
    )


def validate_writing_submit_payload(
    parts_payload: list[dict[str, Any]],
    *,
    part_ids: set[int],
) -> list[dict[str, Any]]:
    submitted_essays: dict[int, str] = {}

    for item in parts_payload:
        raw_part_id = item.get("part_id")
        try:
            part_id = int(raw_part_id)
        except (TypeError, ValueError):
            continue

        if part_id not in part_ids:
            continue

        raw_essay = item.get("essay", "")
        essay = "" if raw_essay is None else str(raw_essay).strip()
        submitted_essays[part_id] = essay

    return [
        {
            "part_id": part_id,
            "essay": submitted_essays.get(part_id, ""),
        }
        for part_id in sorted(part_ids)
    ]
