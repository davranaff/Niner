from __future__ import annotations

import re
from typing import Any

from app.core.errors import ApiError
from app.db.models import ListeningQuestion, ReadingQuestion
from app.modules.listening.services.core import _build_answer_spec as build_listening_answer_spec
from app.modules.reading.services.core import _build_answer_spec as build_reading_answer_spec

_WORDS_RE = re.compile(r"\S+")

def _count_words(value: str) -> int:
    return len(_WORDS_RE.findall(value))


def _raise_invalid_submission(message: str) -> None:
    raise ApiError(
        code="invalid_exam_submission",
        message=message,
        status_code=400,
    )


def _coerce_question_values(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion | ListeningQuestion],
) -> dict[int, str]:
    submitted_values: dict[int, str] = {}
    seen_ids: set[int] = set()

    for index, item in enumerate(answers):
        raw_question_id = item.get("id")
        try:
            question_id = int(raw_question_id)
        except (TypeError, ValueError):
            _raise_invalid_submission(f"Answer at position {index} has invalid question id.")

        if question_id not in question_index:
            _raise_invalid_submission(f"Unknown question id: {question_id}.")
        if question_id in seen_ids:
            _raise_invalid_submission(f"Duplicate question id: {question_id}.")

        raw_value = item.get("value", "")
        value = "" if raw_value is None else str(raw_value).strip()
        submitted_values[question_id] = value
        seen_ids.add(question_id)

    expected_ids = set(question_index.keys())
    missing_ids = sorted(expected_ids - seen_ids)
    if missing_ids:
        _raise_invalid_submission(
            "Missing answers for question ids: "
            + ", ".join(str(question_id) for question_id in missing_ids[:10])
            + ("..." if len(missing_ids) > 10 else "")
        )

    return submitted_values


def _coerce_partial_question_values(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion | ListeningQuestion],
) -> dict[int, str]:
    submitted_values: dict[int, str] = {}
    seen_ids: set[int] = set()

    for index, item in enumerate(answers):
        raw_question_id = item.get("id")
        try:
            question_id = int(raw_question_id)
        except (TypeError, ValueError):
            _raise_invalid_submission(f"Answer at position {index} has invalid question id.")

        if question_id not in question_index:
            _raise_invalid_submission(f"Unknown question id: {question_id}.")
        if question_id in seen_ids:
            _raise_invalid_submission(f"Duplicate question id: {question_id}.")

        raw_value = item.get("value", "")
        submitted_values[question_id] = "" if raw_value is None else str(raw_value).strip()
        seen_ids.add(question_id)

    return submitted_values


def _validate_choice_or_text_submission(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion | ListeningQuestion],
    spec_builder: Any,
) -> list[dict[str, Any]]:
    submitted_values = _coerce_question_values(answers, question_index=question_index)
    normalized_answers: list[dict[str, Any]] = []

    for question_id, question in question_index.items():
        value = submitted_values.get(question_id, "")
        answer_spec = spec_builder(question.question_block)

        if value and answer_spec["answer_type"] == "single_choice":
            allowed_values = {
                str(option.option_text).strip().lower()
                for option in question.options
                if str(option.option_text).strip()
            }
            if value.lower() not in allowed_values:
                _raise_invalid_submission(
                    f"Invalid option value for question id {question_id}: {value!r}."
                )
        elif value:
            max_words = answer_spec.get("max_words")
            if max_words is not None and _count_words(value) > int(max_words):
                _raise_invalid_submission(
                    f"Answer for question id {question_id} exceeds max words ({int(max_words)})."
                )

        normalized_answers.append(
            {
                "id": question_id,
                "value": value,
            }
        )

    return normalized_answers


def _validate_partial_choice_or_text_submission(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion | ListeningQuestion],
    spec_builder: Any,
) -> list[dict[str, Any]]:
    submitted_values = _coerce_partial_question_values(answers, question_index=question_index)
    normalized_answers: list[dict[str, Any]] = []

    for question_id, value in submitted_values.items():
        question = question_index[question_id]
        answer_spec = spec_builder(question.question_block)

        if value and answer_spec["answer_type"] == "single_choice":
            allowed_values = {
                str(option.option_text).strip().lower()
                for option in question.options
                if str(option.option_text).strip()
            }
            if value.lower() not in allowed_values:
                _raise_invalid_submission(
                    f"Invalid option value for question id {question_id}: {value!r}."
                )
        elif value:
            max_words = answer_spec.get("max_words")
            if max_words is not None and _count_words(value) > int(max_words):
                _raise_invalid_submission(
                    f"Answer for question id {question_id} exceeds max words ({int(max_words)})."
                )

        normalized_answers.append({"id": question_id, "value": value})

    return normalized_answers


def validate_reading_submit_payload(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion],
) -> list[dict[str, Any]]:
    return _validate_choice_or_text_submission(
        answers,
        question_index=question_index,
        spec_builder=build_reading_answer_spec,
    )


def validate_listening_submit_payload(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ListeningQuestion],
) -> list[dict[str, Any]]:
    return _validate_choice_or_text_submission(
        answers,
        question_index=question_index,
        spec_builder=build_listening_answer_spec,
    )


def validate_reading_draft_payload(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ReadingQuestion],
) -> list[dict[str, Any]]:
    return _validate_partial_choice_or_text_submission(
        answers,
        question_index=question_index,
        spec_builder=build_reading_answer_spec,
    )


def validate_listening_draft_payload(
    answers: list[dict[str, Any]],
    *,
    question_index: dict[int, ListeningQuestion],
) -> list[dict[str, Any]]:
    return _validate_partial_choice_or_text_submission(
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
    seen_part_ids: set[int] = set()

    for index, item in enumerate(parts_payload):
        raw_part_id = item.get("part_id")
        try:
            part_id = int(raw_part_id)
        except (TypeError, ValueError):
            _raise_invalid_submission(f"Writing part at position {index} has invalid part_id.")

        if part_id not in part_ids:
            _raise_invalid_submission(f"Unknown writing part id: {part_id}.")
        if part_id in seen_part_ids:
            _raise_invalid_submission(f"Duplicate writing part id: {part_id}.")

        raw_essay = item.get("essay", "")
        essay = "" if raw_essay is None else str(raw_essay).strip()
        submitted_essays[part_id] = essay
        seen_part_ids.add(part_id)

    missing_part_ids = sorted(part_ids - seen_part_ids)
    if missing_part_ids:
        _raise_invalid_submission(
            "Missing writing parts: "
            + ", ".join(str(part_id) for part_id in missing_part_ids[:10])
            + ("..." if len(missing_part_ids) > 10 else "")
        )

    return [
        {
            "part_id": part_id,
            "essay": submitted_essays.get(part_id, ""),
        }
        for part_id in sorted(part_ids)
    ]


def validate_writing_draft_payload(
    parts_payload: list[dict[str, Any]],
    *,
    part_ids: set[int],
) -> list[dict[str, Any]]:
    submitted_essays: dict[int, str] = {}
    seen_part_ids: set[int] = set()

    for index, item in enumerate(parts_payload):
        raw_part_id = item.get("part_id")
        try:
            part_id = int(raw_part_id)
        except (TypeError, ValueError):
            _raise_invalid_submission(f"Writing part at position {index} has invalid part_id.")

        if part_id not in part_ids:
            _raise_invalid_submission(f"Unknown writing part id: {part_id}.")
        if part_id in seen_part_ids:
            _raise_invalid_submission(f"Duplicate writing part id: {part_id}.")

        raw_essay = item.get("essay", "")
        submitted_essays[part_id] = "" if raw_essay is None else str(raw_essay).strip()
        seen_part_ids.add(part_id)

    return [
        {
            "part_id": part_id,
            "essay": submitted_essays[part_id],
        }
        for part_id in sorted(seen_part_ids)
    ]
