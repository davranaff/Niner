from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import (
    FinishReasonEnum,
    ListeningExam,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionBlock,
    ListeningQuestionOption,
    ListeningTest,
    ReadingTest,
    RoleEnum,
    User,
    WritingExam,
    WritingExamPart,
    WritingPart,
    WritingTest,
)


async def _create_user(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="UseCase",
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


async def _create_listening_test_with_single_question(db_session, *, time_limit: int) -> tuple[ListeningTest, ListeningQuestion]:
    listening_test = ListeningTest(
        title="Listening Use Case",
        description="Desc",
        time_limit=time_limit,
        total_questions=1,
        is_active=True,
        voice_url="https://example.com/audio.mp3",
    )
    db_session.add(listening_test)
    await db_session.flush()

    part = ListeningPart(test_id=listening_test.id, title="Part 1", order=1)
    db_session.add(part)
    await db_session.flush()

    block = ListeningQuestionBlock(
        part_id=part.id,
        title="MCQ",
        description="Choose one option",
        block_type="multiple_choice",
        order=1,
    )
    db_session.add(block)
    await db_session.flush()

    question = ListeningQuestion(question_block_id=block.id, question_text="Q1", order=1)
    db_session.add(question)
    await db_session.flush()

    db_session.add_all(
        [
            ListeningQuestionOption(question_id=question.id, option_text="A", is_correct=True, order=1),
            ListeningQuestionOption(question_id=question.id, option_text="B", is_correct=False, order=2),
        ]
    )
    await db_session.commit()

    return listening_test, question


async def _create_writing_test_with_parts(db_session, *, time_limit: int, parts_count: int = 2) -> tuple[WritingTest, list[WritingPart]]:
    writing_test = WritingTest(title="Writing Use Case", description="Desc", time_limit=time_limit, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    parts: list[WritingPart] = []
    for index in range(parts_count):
        part = WritingPart(
            test_id=writing_test.id,
            order=index + 1,
            task=f"Task {index + 1}",
            image_url=None,
            file_urls=[],
        )
        db_session.add(part)
        parts.append(part)

    await db_session.commit()
    return writing_test, parts


@pytest.mark.asyncio
async def test_listening_exam_ownership_start_and_submit_idempotency(client, db_session):
    owner = await _create_user(db_session, "list-owner@example.com")
    stranger = await _create_user(db_session, "list-stranger@example.com")
    listening_test, question = await _create_listening_test_with_single_question(db_session, time_limit=1800)

    owner_headers = await _auth_headers(client, owner.email)
    stranger_headers = await _auth_headers(client, stranger.email)

    create_exam = await client.post("/api/v1/exams/listening", headers=owner_headers, json={"test_id": listening_test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    first_start = await client.post(f"/api/v1/exams/listening/{exam_id}/start", headers=owner_headers)
    assert first_start.status_code == 200

    second_start = await client.post(f"/api/v1/exams/listening/{exam_id}/start", headers=owner_headers)
    assert second_start.status_code == 200

    stranger_start = await client.post(f"/api/v1/exams/listening/{exam_id}/start", headers=stranger_headers)
    assert stranger_start.status_code == 403

    first_submit = await client.post(
        f"/api/v1/exams/listening/{exam_id}/submit",
        headers=owner_headers,
        json=[{"id": question.id, "value": " A "}],
    )
    assert first_submit.status_code == 200
    first_payload = first_submit.json()
    assert first_payload["result"] == "success"
    assert first_payload["correct_answers"] == 1

    stranger_submit = await client.post(
        f"/api/v1/exams/listening/{exam_id}/submit",
        headers=stranger_headers,
        json=[{"id": question.id, "value": "A"}],
    )
    assert stranger_submit.status_code == 403

    second_submit = await client.post(
        f"/api/v1/exams/listening/{exam_id}/submit",
        headers=owner_headers,
        json=[{"id": question.id, "value": "B"}],
    )
    assert second_submit.status_code == 200
    second_payload = second_submit.json()
    assert second_payload["result"] == "success"
    assert second_payload["correct_answers"] == first_payload["correct_answers"]
    assert second_payload["time_spent"] == first_payload["time_spent"]


@pytest.mark.asyncio
async def test_listening_timeout_marks_time_is_up_without_time_cap(client, db_session):
    user = await _create_user(db_session, "list-timeout@example.com")
    headers = await _auth_headers(client, user.email)
    listening_test, question = await _create_listening_test_with_single_question(db_session, time_limit=5)

    create_exam = await client.post("/api/v1/exams/listening", headers=headers, json={"test_id": listening_test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    exam = await db_session.get(ListeningExam, exam_id)
    assert exam is not None
    exam.started_at = datetime.now(UTC) - timedelta(seconds=20)
    await db_session.commit()

    submit = await client.post(
        f"/api/v1/exams/listening/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "A"}],
    )
    assert submit.status_code == 200
    payload = submit.json()
    assert payload["correct_answers"] == 1
    assert payload["time_spent"] >= 20
    assert payload["time_spent"] > listening_test.time_limit

    await db_session.refresh(exam)
    assert exam.finish_reason == FinishReasonEnum.time_is_up


@pytest.mark.asyncio
async def test_writing_exam_submit_trims_essay_counts_words_and_is_idempotent(client, db_session):
    owner = await _create_user(db_session, "write-owner@example.com")
    stranger = await _create_user(db_session, "write-stranger@example.com")
    writing_test, parts = await _create_writing_test_with_parts(db_session, time_limit=3600, parts_count=2)

    owner_headers = await _auth_headers(client, owner.email)
    stranger_headers = await _auth_headers(client, stranger.email)

    create_exam = await client.post("/api/v1/exams/writing", headers=owner_headers, json={"test_id": writing_test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    start_once = await client.post(f"/api/v1/exams/writing/{exam_id}/start", headers=owner_headers)
    assert start_once.status_code == 200

    start_twice = await client.post(f"/api/v1/exams/writing/{exam_id}/start", headers=owner_headers)
    assert start_twice.status_code == 200

    forbidden_submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=stranger_headers,
        json=[
            {"part_id": parts[0].id, "essay": "x"},
            {"part_id": parts[1].id, "essay": "y"},
        ],
    )
    assert forbidden_submit.status_code == 403

    first_submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=owner_headers,
        json=[
            {"part_id": parts[0].id, "essay": "  First essay text here  "},
            {"part_id": parts[1].id, "essay": " Second part response "},
        ],
    )
    assert first_submit.status_code == 200
    first_payload = first_submit.json()
    assert first_payload["result"] == "success"
    assert first_payload["score"] is None
    assert first_payload["correct_answers"] is None

    exam_parts = (
        await db_session.execute(select(WritingExamPart).where(WritingExamPart.exam_id == exam_id))
    ).scalars()
    answers_by_part = {item.part_id: item for item in exam_parts}
    assert answers_by_part[parts[0].id].essay == "First essay text here"
    assert len(answers_by_part[parts[0].id].essay.split()) == 4
    assert answers_by_part[parts[1].id].essay == "Second part response"
    assert len(answers_by_part[parts[1].id].essay.split()) == 3
    assert "AI evaluation is pending" in str(answers_by_part[parts[0].id].corrections)

    second_submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=owner_headers,
        json=[
            {"part_id": parts[0].id, "essay": "Completely different text"},
            {"part_id": parts[1].id, "essay": "Another different text"},
        ],
    )
    assert second_submit.status_code == 200
    second_payload = second_submit.json()
    assert second_payload["result"] == "success"
    assert second_payload["time_spent"] == first_payload["time_spent"]


@pytest.mark.asyncio
async def test_writing_timeout_marks_time_is_up_without_time_cap(client, db_session):
    user = await _create_user(db_session, "write-timeout@example.com")
    headers = await _auth_headers(client, user.email)
    writing_test, parts = await _create_writing_test_with_parts(db_session, time_limit=5, parts_count=1)

    create_exam = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": writing_test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    exam = await db_session.get(WritingExam, exam_id)
    assert exam is not None
    exam.started_at = datetime.now(UTC) - timedelta(seconds=15)
    await db_session.commit()

    submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=headers,
        json=[{"part_id": parts[0].id, "essay": "Timed writing essay"}],
    )
    assert submit.status_code == 200
    payload = submit.json()
    assert payload["time_spent"] >= 15
    assert payload["time_spent"] > writing_test.time_limit

    await db_session.refresh(exam)
    assert exam.finish_reason == FinishReasonEnum.time_is_up


@pytest.mark.asyncio
async def test_user_can_create_multiple_attempts_for_same_test_and_see_them_in_me(client, db_session):
    user = await _create_user(db_session, "multi-attempt@example.com")
    headers = await _auth_headers(client, user.email)

    reading_test = ReadingTest(title="Repeated Attempts", description="Desc", time_limit=3600, total_questions=0, is_active=True)
    db_session.add(reading_test)
    await db_session.commit()

    first_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": reading_test.id})
    assert first_exam.status_code == 200

    second_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": reading_test.id})
    assert second_exam.status_code == 200

    me_response = await client.get("/api/v1/exams/me?limit=10", headers=headers)
    assert me_response.status_code == 200
    reading_items = me_response.json()["reading"]["items"]

    reading_ids = {item["id"] for item in reading_items}
    assert first_exam.json()["id"] in reading_ids
    assert second_exam.json()["id"] in reading_ids


@pytest.mark.asyncio
async def test_my_tests_supports_listening_test_id_filter_and_user_isolation(client, db_session):
    owner = await _create_user(db_session, "my-tests-listening-owner@example.com")
    stranger = await _create_user(db_session, "my-tests-listening-stranger@example.com")
    owner_headers = await _auth_headers(client, owner.email)
    stranger_headers = await _auth_headers(client, stranger.email)

    listening_test_a, _ = await _create_listening_test_with_single_question(db_session, time_limit=1800)
    listening_test_b, _ = await _create_listening_test_with_single_question(db_session, time_limit=1800)

    owner_exam_a1 = await client.post(
        "/api/v1/exams/listening",
        headers=owner_headers,
        json={"test_id": listening_test_a.id},
    )
    assert owner_exam_a1.status_code == 200

    owner_exam_a2 = await client.post(
        "/api/v1/exams/listening",
        headers=owner_headers,
        json={"test_id": listening_test_a.id},
    )
    assert owner_exam_a2.status_code == 200

    owner_exam_b = await client.post(
        "/api/v1/exams/listening",
        headers=owner_headers,
        json={"test_id": listening_test_b.id},
    )
    assert owner_exam_b.status_code == 200

    stranger_exam_a = await client.post(
        "/api/v1/exams/listening",
        headers=stranger_headers,
        json={"test_id": listening_test_a.id},
    )
    assert stranger_exam_a.status_code == 200

    filtered = await client.get(
        f"/api/v1/exams/my-tests?module=listening&test_id={listening_test_a.id}&ordering=-created_at&offset=0&limit=20",
        headers=owner_headers,
    )
    assert filtered.status_code == 200

    payload = filtered.json()
    assert payload["count"] == 2
    assert len(payload["items"]) == 2

    filtered_ids = {item["id"] for item in payload["items"]}
    assert owner_exam_a1.json()["id"] in filtered_ids
    assert owner_exam_a2.json()["id"] in filtered_ids
    assert owner_exam_b.json()["id"] not in filtered_ids
    assert stranger_exam_a.json()["id"] not in filtered_ids

    assert all(item["test_id"] == listening_test_a.id for item in payload["items"])
    assert all(item["kind"] == "listening" for item in payload["items"])
