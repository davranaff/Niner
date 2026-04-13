from datetime import UTC, datetime

import pytest

from app.core.security import hash_password
from app.db.models import (
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    RoleEnum,
    User,
    WritingPart,
    WritingTest,
)


async def _create_user(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="Assignment",
        last_name="Tester",
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
    token = sign_in.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_reading_submit_generates_post_exam_assignments_and_tracks_attempts(client, db_session):
    user = await _create_user(db_session, "assign-reading@example.com")

    reading_test = ReadingTest(
        title="Assignment Reading",
        description="Desc",
        time_limit=3600,
        total_questions=2,
        is_active=True,
    )
    db_session.add(reading_test)
    await db_session.flush()

    passage = ReadingPassage(test_id=reading_test.id, title="P1", content="Text", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Table",
        description="Use one word only",
        block_type="table_completion",
        order=1,
        table_completion="A | B",
    )
    db_session.add(block)
    await db_session.flush()

    q1 = ReadingQuestion(question_block_id=block.id, question_text="Q1", order=1)
    q2 = ReadingQuestion(question_block_id=block.id, question_text="Q2", order=2)
    db_session.add_all([q1, q2])
    await db_session.flush()

    db_session.add_all(
        [
            ReadingQuestionAnswer(question_id=q1.id, correct_answers="city"),
            ReadingQuestionAnswer(question_id=q2.id, correct_answers="river"),
        ]
    )
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    create_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": reading_test.id})
    assert create_exam.status_code == 200
    exam_id = int(create_exam.json()["id"])

    submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[
            {"id": q1.id, "value": "city"},
            {"id": q2.id, "value": "lake"},
        ],
    )
    assert submit.status_code == 200
    assert submit.json()["correct_answers"] == 1

    assignments = await client.get(
        "/api/v1/assignments",
        headers=headers,
        params={"module": "reading", "limit": 20, "offset": 0},
    )
    assert assignments.status_code == 200
    assignments_payload = assignments.json()
    assert assignments_payload["count"] >= 1

    assignment = assignments_payload["items"][0]
    assert assignment["module"] == "reading"
    assert int(assignment["source_exam_id"]) == exam_id

    details = await client.get(f"/api/v1/assignments/{assignment['id']}", headers=headers)
    assert details.status_code == 200
    details_payload = details.json()
    assert details_payload["error_items"]

    submit_attempt = await client.post(
        f"/api/v1/assignments/{assignment['id']}/attempts",
        headers=headers,
        json={"response_text": "river"},
    )
    assert submit_attempt.status_code == 200
    attempt_payload = submit_attempt.json()
    assert attempt_payload["assignment"]["status"] == "completed"
    assert float(attempt_payload["attempt"]["score"]) >= 0.7


@pytest.mark.asyncio
async def test_writing_submit_generates_word_count_assignments(client, db_session):
    user = await _create_user(db_session, "assign-writing@example.com")

    writing_test = WritingTest(title="Assignment Writing", description="Desc", time_limit=3600, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    part1 = WritingPart(test_id=writing_test.id, order=1, task="Task 1", image_url=None, file_urls=[])
    part2 = WritingPart(test_id=writing_test.id, order=2, task="Task 2", image_url=None, file_urls=[])
    db_session.add_all([part1, part2])
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    create_exam = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": writing_test.id})
    assert create_exam.status_code == 200
    exam_id = int(create_exam.json()["id"])

    submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=headers,
        json=[
            {"part_id": part1.id, "essay": "Short response only"},
            {"part_id": part2.id, "essay": "Another short response"},
        ],
    )
    assert submit.status_code == 200

    assignments = await client.get(
        "/api/v1/assignments",
        headers=headers,
        params={"module": "writing", "limit": 20, "offset": 0},
    )
    assert assignments.status_code == 200
    assignments_payload = assignments.json()
    assert assignments_payload["count"] >= 1

    assignment = assignments_payload["items"][0]
    assert assignment["module"] == "writing"

    long_answer = " ".join(["improved"] * 85)
    submit_attempt = await client.post(
        f"/api/v1/assignments/{assignment['id']}/attempts",
        headers=headers,
        json={"response_text": long_answer},
    )
    assert submit_attempt.status_code == 200
    attempt_payload = submit_attempt.json()
    assert attempt_payload["assignment"]["status"] == "completed"


@pytest.mark.asyncio
async def test_assignment_generate_test_endpoint_queues_worker_job(client, db_session, monkeypatch):
    user = await _create_user(db_session, "assign-generate@example.com")

    reading_test = ReadingTest(
        title="Generated Reading",
        description="Desc",
        time_limit=3600,
        total_questions=1,
        is_active=True,
    )
    db_session.add(reading_test)
    await db_session.flush()

    passage = ReadingPassage(test_id=reading_test.id, title="P1", content="Text", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Table",
        description="Use one word only",
        block_type="table_completion",
        order=1,
        table_completion="A | B",
    )
    db_session.add(block)
    await db_session.flush()

    question = ReadingQuestion(question_block_id=block.id, question_text="Q1", order=1)
    db_session.add(question)
    await db_session.flush()
    db_session.add(ReadingQuestionAnswer(question_id=question.id, correct_answers="city"))
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    create_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": reading_test.id})
    assert create_exam.status_code == 200
    exam_id = int(create_exam.json()["id"])

    submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "lake"}],
    )
    assert submit.status_code == 200

    assignments = await client.get(
        "/api/v1/assignments",
        headers=headers,
        params={"module": "reading", "limit": 20, "offset": 0},
    )
    assert assignments.status_code == 200
    assignment_id = int(assignments.json()["items"][0]["id"])

    queued: dict[str, int] = {}

    async def fake_enqueue(assignment_id: int) -> None:
        queued["assignment_id"] = assignment_id

    monkeypatch.setattr(
        "app.modules.assignments.services.core.enqueue_assignment_test_generation",
        fake_enqueue,
    )

    generate = await client.post(f"/api/v1/assignments/{assignment_id}/generate-test", headers=headers)
    assert generate.status_code == 200
    payload = generate.json()
    assert payload["assignment"]["generated_test"]["status"] == "queued"
    assert int(payload["assignment"]["generated_test"]["progress_percent"]) == 5
    assert queued["assignment_id"] == assignment_id
