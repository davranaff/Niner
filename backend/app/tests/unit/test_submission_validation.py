from dataclasses import dataclass, field

import pytest

from app.core.errors import ApiError
from app.modules.exams.services.validation import (
    validate_listening_draft_payload,
    validate_listening_submit_payload,
    validate_reading_draft_payload,
    validate_reading_submit_payload,
    validate_writing_draft_payload,
    validate_writing_submit_payload,
)


@dataclass
class FakeOption:
    option_text: str


@dataclass
class FakeBlock:
    block_type: str
    description: str = ""
    table_completion: str | None = None
    question_heading: str | None = None


@dataclass
class FakeQuestion:
    id: int
    question_block: FakeBlock
    options: list[FakeOption] = field(default_factory=list)


def test_submit_validation_missing_answers_raise_error() -> None:
    q1 = FakeQuestion(id=1, question_block=FakeBlock(block_type="short_answers"))
    q2 = FakeQuestion(id=2, question_block=FakeBlock(block_type="short_answers"))

    with pytest.raises(ApiError, match="Missing answers"):
        validate_reading_submit_payload(
            [{"id": 1, "value": "answer"}],
            question_index={1: q1, 2: q2},
        )


def test_submit_validation_unknown_and_duplicate_question_ids_raise_error() -> None:
    q1 = FakeQuestion(id=1, question_block=FakeBlock(block_type="short_answers"))

    with pytest.raises(ApiError, match="Duplicate question id"):
        validate_reading_submit_payload(
            [
                {"id": 1, "value": "a"},
                {"id": 1, "value": "b"},
            ],
            question_index={1: q1},
        )

    with pytest.raises(ApiError, match="Unknown question id"):
        validate_reading_submit_payload(
            [{"id": 999, "value": "x"}],
            question_index={1: q1},
        )


def test_submit_validation_invalid_single_choice_value_raises_error() -> None:
    question = FakeQuestion(
        id=1,
        question_block=FakeBlock(block_type="true_false_ng"),
        options=[FakeOption("True"), FakeOption("False"), FakeOption("Not Given")],
    )

    with pytest.raises(ApiError, match="Invalid option value"):
        validate_reading_submit_payload(
            [{"id": 1, "value": "Maybe"}],
            question_index={1: question},
        )


def test_submit_validation_max_words_exceeded_raises_error() -> None:
    question = FakeQuestion(
        id=10,
        question_block=FakeBlock(
            block_type="table_completion",
            description="Choose NO MORE THAN TWO WORDS",
            table_completion="Field A | Field B",
        ),
    )

    with pytest.raises(ApiError, match="exceeds max words"):
        validate_listening_submit_payload(
            [{"id": 10, "value": "three words total"}],
            question_index={10: question},
        )


def test_writing_submit_validation_missing_parts_raise_error() -> None:
    with pytest.raises(ApiError, match="Missing writing parts"):
        validate_writing_submit_payload(
            [{"part_id": 1, "essay": "   "}],
            part_ids={1, 2},
        )


def test_draft_validation_remains_partial_for_all_modules() -> None:
    reading_question = FakeQuestion(id=1, question_block=FakeBlock(block_type="short_answers"))
    listening_question = FakeQuestion(id=10, question_block=FakeBlock(block_type="short_answers"))

    reading_draft = validate_reading_draft_payload(
        [{"id": 1, "value": "draft"}],
        question_index={1: reading_question},
    )
    listening_draft = validate_listening_draft_payload(
        [{"id": 10, "value": "draft"}],
        question_index={10: listening_question},
    )
    writing_draft = validate_writing_draft_payload(
        [{"part_id": 1, "essay": "draft text"}],
        part_ids={1, 2},
    )

    assert reading_draft == [{"id": 1, "value": "draft"}]
    assert listening_draft == [{"id": 10, "value": "draft"}]
    assert writing_draft == [{"part_id": 1, "essay": "draft text"}]
