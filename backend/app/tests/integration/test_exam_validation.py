from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.models import (
    ListeningExamQuestionAnswer,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionAnswer,
    ListeningQuestionBlock,
    ListeningQuestionOption,
    ListeningTest,
    ReadingExamQuestionAnswer,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    RoleEnum,
    User,
    WritingExamPart,
    WritingPart,
    WritingTest,
)


async def _create_user(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="Exam",
        last_name="Validation",
        role=RoleEnum.student,
        is_active=True,
        verified_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _auth_headers(client, email: str) -> dict[str, str]:
    sign_in = await client.post("/api/v1/auth/sign-in", json={"email": email, "password": "Password123"})
    assert sign_in.status_code == 200
    access = sign_in.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {access}"}


@pytest.mark.asyncio
async def test_reading_submit_validation_is_strict_and_draft_is_partial(client, db_session):
    user = await _create_user(db_session, "reading-validation@example.com")

    test = ReadingTest(title="R-Validation", description="Desc", time_limit=3600, total_questions=2, is_active=True)
    db_session.add(test)
    await db_session.flush()

    passage = ReadingPassage(test_id=test.id, title="P1", content="Text", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    choice_block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Choice",
        description="Choose True, False or Not Given",
        block_type="true_false_ng",
        order=1,
    )
    text_block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Table",
        description="Choose NO MORE THAN TWO WORDS",
        block_type="table_completion",
        order=2,
        table_completion="A | B",
    )
    db_session.add_all([choice_block, text_block])
    await db_session.flush()

    q1 = ReadingQuestion(question_block_id=choice_block.id, question_text="Statement", order=1)
    q2 = ReadingQuestion(question_block_id=text_block.id, question_text="Blank", order=1)
    db_session.add_all([q1, q2])
    await db_session.flush()

    db_session.add_all(
        [
            ReadingQuestionOption(question_id=q1.id, option_text="True", is_correct=True, order=1),
            ReadingQuestionOption(question_id=q1.id, option_text="False", is_correct=False, order=2),
            ReadingQuestionOption(question_id=q1.id, option_text="Not Given", is_correct=False, order=3),
            ReadingQuestionAnswer(question_id=q2.id, correct_answers="river"),
        ]
    )
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    create_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    partial_submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": q1.id, "value": "Maybe"}],
    )
    assert partial_submit.status_code == 400
    assert partial_submit.json()["code"] == "invalid_exam_submission"

    stored_answers = await db_session.execute(
        select(func.count(ReadingExamQuestionAnswer.id)).where(ReadingExamQuestionAnswer.exam_id == exam_id)
    )
    assert int(stored_answers.scalar_one()) == 0

    draft_save = await client.put(
        f"/api/v1/exams/reading/{exam_id}/draft",
        headers=headers,
        json=[{"id": q1.id, "value": "True"}],
    )
    assert draft_save.status_code == 200
    assert draft_save.json()["saved_items"] == 1

    idempotent_submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[
            {"id": q1.id, "value": "True"},
            {"id": q2.id, "value": "river"},
        ],
    )
    assert idempotent_submit.status_code == 200
    assert idempotent_submit.json()["correct_answers"] == 2


@pytest.mark.asyncio
async def test_listening_submit_validation_is_strict_and_draft_is_partial(client, db_session):
    user = await _create_user(db_session, "listening-validation@example.com")

    test = ListeningTest(
        title="L-Validation",
        description="Desc",
        time_limit=1800,
        total_questions=2,
        is_active=True,
        voice_url="https://example.com/audio.mp3",
    )
    db_session.add(test)
    await db_session.flush()

    part = ListeningPart(test_id=test.id, title="Part 1", order=1)
    db_session.add(part)
    await db_session.flush()

    choice_block = ListeningQuestionBlock(
        part_id=part.id,
        title="Choice",
        description="Choose one option",
        block_type="multiple_choice",
        order=1,
    )
    table_block = ListeningQuestionBlock(
        part_id=part.id,
        title="Table",
        description="Write ONE WORD ONLY",
        block_type="table_completion",
        order=2,
        table_completion="A | B",
    )
    db_session.add_all([choice_block, table_block])
    await db_session.flush()

    q1 = ListeningQuestion(question_block_id=choice_block.id, question_text="Q1", order=1)
    q2 = ListeningQuestion(question_block_id=table_block.id, question_text="Q2", order=1)
    db_session.add_all([q1, q2])
    await db_session.flush()

    db_session.add_all(
        [
            ListeningQuestionOption(question_id=q1.id, option_text="A", is_correct=True, order=1),
            ListeningQuestionOption(question_id=q1.id, option_text="B", is_correct=False, order=2),
            ListeningQuestionAnswer(question_id=q2.id, correct_answers="schedule"),
        ]
    )
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    create_exam = await client.post("/api/v1/exams/listening", headers=headers, json={"test_id": test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    partial_submit = await client.post(
        f"/api/v1/exams/listening/{exam_id}/submit",
        headers=headers,
        json=[
            {"id": q1.id, "value": "C"},
            {"id": q2.id, "value": "two words"},
        ],
    )
    assert partial_submit.status_code == 400
    assert partial_submit.json()["code"] == "invalid_exam_submission"

    stored_answers = await db_session.execute(
        select(func.count(ListeningExamQuestionAnswer.id)).where(ListeningExamQuestionAnswer.exam_id == exam_id)
    )
    assert int(stored_answers.scalar_one()) == 0

    draft_save = await client.put(
        f"/api/v1/exams/listening/{exam_id}/draft",
        headers=headers,
        json=[{"id": q1.id, "value": "A"}],
    )
    assert draft_save.status_code == 200
    assert draft_save.json()["saved_items"] == 1

    idempotent_submit = await client.post(
        f"/api/v1/exams/listening/{exam_id}/submit",
        headers=headers,
        json=[
            {"id": q1.id, "value": "A"},
            {"id": q2.id, "value": "schedule"},
        ],
    )
    assert idempotent_submit.status_code == 200
    assert idempotent_submit.json()["correct_answers"] == 2


@pytest.mark.asyncio
async def test_writing_submit_validation_is_strict_and_draft_is_partial(client, db_session):
    user = await _create_user(db_session, "writing-validation@example.com")

    test = WritingTest(title="W-Validation", description="Desc", time_limit=3600, is_active=True)
    db_session.add(test)
    await db_session.flush()

    p1 = WritingPart(test_id=test.id, order=1, task="Task 1", image_url=None, file_urls=[])
    p2 = WritingPart(test_id=test.id, order=2, task="Task 2", image_url=None, file_urls=[])
    db_session.add_all([p1, p2])
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    create_exam = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    partial_submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=headers,
        json=[{"part_id": p1.id, "essay": "   "}],
    )
    assert partial_submit.status_code == 400
    assert partial_submit.json()["code"] == "invalid_exam_submission"

    stored_parts = await db_session.execute(
        select(func.count(WritingExamPart.id)).where(WritingExamPart.exam_id == exam_id)
    )
    assert int(stored_parts.scalar_one()) == 0

    draft_save = await client.put(
        f"/api/v1/exams/writing/{exam_id}/draft",
        headers=headers,
        json=[{"part_id": p1.id, "essay": "Draft task one"}],
    )
    assert draft_save.status_code == 200
    assert draft_save.json()["saved_items"] == 1

    idempotent_submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=headers,
        json=[
            {"part_id": p1.id, "essay": "Essay for task one"},
            {"part_id": p2.id, "essay": "Essay for task two"},
        ],
    )
    assert idempotent_submit.status_code == 200
    assert idempotent_submit.json()["result"] == "success"
    assert idempotent_submit.json()["correct_answers"] is None

    stored_rows = (
        await db_session.execute(select(WritingExamPart).where(WritingExamPart.exam_id == exam_id))
    ).scalars()
    stored_by_part_id = {row.part_id: row for row in stored_rows}
    assert len(stored_by_part_id) == 2
    assert stored_by_part_id[p1.id].essay == "Essay for task one"
    assert stored_by_part_id[p2.id].essay == "Essay for task two"
    assert "AI evaluation" in str(stored_by_part_id[p1.id].corrections)

    repeated_submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=headers,
        json=[{"part_id": p1.id, "essay": ""}],
    )
    assert repeated_submit.status_code == 200
    assert repeated_submit.json()["result"] == "success"
