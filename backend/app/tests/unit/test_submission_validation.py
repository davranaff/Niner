from dataclasses import dataclass, field

from app.modules.exams.services.validation import (
    validate_listening_submit_payload,
    validate_reading_submit_payload,
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


def test_submit_validation_missing_answers_are_normalized_as_empty() -> None:
    q1 = FakeQuestion(id=1, question_block=FakeBlock(block_type="short_answers"))
    q2 = FakeQuestion(id=2, question_block=FakeBlock(block_type="short_answers"))

    normalized = validate_reading_submit_payload(
        [{"id": 1, "value": "answer"}],
        question_index={1: q1, 2: q2},
    )

    assert normalized == [
        {"id": 1, "value": "answer"},
        {"id": 2, "value": ""},
    ]


def test_submit_validation_unknown_and_duplicate_question_ids_are_ignored() -> None:
    q1 = FakeQuestion(id=1, question_block=FakeBlock(block_type="short_answers"))

    normalized = validate_reading_submit_payload(
        [
            {"id": 1, "value": "a"},
            {"id": 1, "value": "b"},
            {"id": 999, "value": "x"},
            {"value": "no-id"},
        ],
        question_index={1: q1},
    )

    assert normalized == [{"id": 1, "value": "b"}]


def test_submit_validation_invalid_single_choice_value_becomes_empty() -> None:
    question = FakeQuestion(
        id=1,
        question_block=FakeBlock(block_type="true_false_ng"),
        options=[FakeOption("True"), FakeOption("False"), FakeOption("Not Given")],
    )

    normalized = validate_reading_submit_payload(
        [{"id": 1, "value": "Maybe"}],
        question_index={1: question},
    )

    assert normalized == [{"id": 1, "value": ""}]


def test_submit_validation_max_words_exceeded_becomes_empty() -> None:
    question = FakeQuestion(
        id=10,
        question_block=FakeBlock(
            block_type="table_completion",
            description="Choose NO MORE THAN TWO WORDS",
            table_completion="Field A | Field B",
        ),
    )

    normalized = validate_listening_submit_payload(
        [{"id": 10, "value": "three words total"}],
        question_index={10: question},
    )

    assert normalized == [{"id": 10, "value": ""}]


def test_writing_submit_validation_empty_and_missing_parts_are_normalized() -> None:
    normalized = validate_writing_submit_payload(
        [{"part_id": 1, "essay": "   "}],
        part_ids={1, 2},
    )

    assert normalized == [
        {"part_id": 1, "essay": ""},
        {"part_id": 2, "essay": ""},
    ]
