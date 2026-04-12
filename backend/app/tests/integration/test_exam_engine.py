from datetime import UTC, datetime, timedelta

import pytest

from app.core.security import hash_password
from app.db.models import (
    FinishReasonEnum,
    ReadingExam,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    RoleEnum,
    User,
)


async def _create_user(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="Test",
        last_name="User",
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


async def _create_reading_test_with_single_question(db_session, *, time_limit: int) -> tuple[ReadingTest, ReadingQuestion]:
    reading_test = ReadingTest(title="R1", description="Desc", time_limit=time_limit, total_questions=1, is_active=True)
    db_session.add(reading_test)
    await db_session.flush()

    passage = ReadingPassage(test_id=reading_test.id, title="P1", content="Text", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="B1",
        description="D",
        block_type="short_answers",
        order=1,
    )
    db_session.add(block)
    await db_session.flush()

    question = ReadingQuestion(question_block_id=block.id, question_text="Q1", order=1)
    db_session.add(question)
    await db_session.flush()

    db_session.add(ReadingQuestionAnswer(question_id=question.id, correct_answers="answer"))
    db_session.add(ReadingQuestionOption(question_id=question.id, option_text="answer", is_correct=True, order=1))
    await db_session.commit()

    return reading_test, question


@pytest.mark.asyncio
async def test_exam_start_submit_idempotent_and_ownership(client, db_session):
    user1 = await _create_user(db_session, "u1@example.com")
    user2 = await _create_user(db_session, "u2@example.com")
    reading_test, question = await _create_reading_test_with_single_question(db_session, time_limit=3600)

    headers_u1 = await _auth_headers(client, user1.email)
    headers_u2 = await _auth_headers(client, user2.email)

    create_exam = await client.post(
        "/api/v1/exams/reading",
        headers=headers_u1,
        json={"test_id": reading_test.id},
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    start_once = await client.post(f"/api/v1/exams/reading/{exam_id}/start", headers=headers_u1)
    assert start_once.status_code == 200

    start_twice = await client.post(f"/api/v1/exams/reading/{exam_id}/start", headers=headers_u1)
    assert start_twice.status_code == 200

    forbidden_start = await client.post(f"/api/v1/exams/reading/{exam_id}/start", headers=headers_u2)
    assert forbidden_start.status_code == 403

    submit_once = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers_u1,
        json=[{"id": question.id, "value": " Answer "}],
    )
    assert submit_once.status_code == 200
    assert submit_once.json()["result"] == "success"
    assert submit_once.json()["correct_answers"] == 1
    assert isinstance(submit_once.json()["time_spent"], int)

    submit_twice = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers_u1,
        json=[{"id": question.id, "value": "Wrong"}],
    )
    assert submit_twice.status_code == 200
    assert submit_twice.json()["result"] == "success"
    assert submit_twice.json()["correct_answers"] == 1


@pytest.mark.asyncio
async def test_reading_submit_within_limit_marks_completed_with_seconds(client, db_session):
    user = await _create_user(db_session, "timer-completed@example.com")
    headers = await _auth_headers(client, user.email)
    reading_test, question = await _create_reading_test_with_single_question(db_session, time_limit=120)

    create_exam = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    exam = await db_session.get(ReadingExam, exam_id)
    assert exam is not None
    exam.started_at = datetime.now(UTC) - timedelta(seconds=30)
    await db_session.commit()

    submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert submit.status_code == 200
    payload = submit.json()
    assert payload["result"] == "success"
    assert payload["correct_answers"] == 1
    assert isinstance(payload["time_spent"], int)
    assert 30 <= payload["time_spent"] < 120

    await db_session.refresh(exam)
    assert exam.finish_reason == FinishReasonEnum.completed


@pytest.mark.asyncio
async def test_reading_submit_after_deadline_marks_time_is_up_with_real_elapsed_time(client, db_session):
    user = await _create_user(db_session, "timer-timeup@example.com")
    headers = await _auth_headers(client, user.email)
    reading_test, question = await _create_reading_test_with_single_question(db_session, time_limit=5)

    create_exam = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    exam = await db_session.get(ReadingExam, exam_id)
    assert exam is not None
    exam.started_at = datetime.now(UTC) - timedelta(seconds=30)
    await db_session.commit()

    first_submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert first_submit.status_code == 200
    first_payload = first_submit.json()
    assert first_payload["result"] == "failed"
    assert first_payload["correct_answers"] == 1
    assert first_payload["time_spent"] >= 30
    assert first_payload["time_spent"] < 120

    await db_session.refresh(exam)
    assert exam.finish_reason == FinishReasonEnum.time_is_up

    idempotent_submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "wrong"}],
    )
    assert idempotent_submit.status_code == 200
    idempotent_payload = idempotent_submit.json()
    assert idempotent_payload["result"] == "failed"
    assert idempotent_payload["correct_answers"] == first_payload["correct_answers"]
    assert idempotent_payload["time_spent"] == first_payload["time_spent"]


@pytest.mark.asyncio
async def test_reading_submit_without_start_sets_started_at(client, db_session):
    user = await _create_user(db_session, "timer-no-start@example.com")
    headers = await _auth_headers(client, user.email)
    reading_test, question = await _create_reading_test_with_single_question(db_session, time_limit=300)

    create_exam = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert submit.status_code == 200
    payload = submit.json()
    assert payload["result"] == "success"
    assert payload["correct_answers"] == 1
    assert isinstance(payload["time_spent"], int)
    assert payload["time_spent"] >= 0
    assert payload["time_spent"] <= 300

    exam = await db_session.get(ReadingExam, exam_id)
    assert exam is not None
    await db_session.refresh(exam)
    assert exam.started_at is not None
    assert exam.finished_at is not None
    assert exam.finish_reason == FinishReasonEnum.completed


@pytest.mark.asyncio
async def test_reading_exam_result_endpoint_finished_and_in_progress(client, db_session):
    user = await _create_user(db_session, "result-states@example.com")
    headers = await _auth_headers(client, user.email)
    reading_test, question = await _create_reading_test_with_single_question(db_session, time_limit=5)

    success_exam_resp = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert success_exam_resp.status_code == 200
    success_exam_id = success_exam_resp.json()["id"]
    success_submit = await client.post(
        f"/api/v1/exams/reading/{success_exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert success_submit.status_code == 200

    failed_exam_resp = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert failed_exam_resp.status_code == 200
    failed_exam_id = failed_exam_resp.json()["id"]
    failed_exam = await db_session.get(ReadingExam, failed_exam_id)
    assert failed_exam is not None
    failed_exam.started_at = datetime.now(UTC) - timedelta(seconds=30)
    await db_session.commit()
    failed_submit = await client.post(
        f"/api/v1/exams/reading/{failed_exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert failed_submit.status_code == 200

    in_progress_exam_resp = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert in_progress_exam_resp.status_code == 200
    in_progress_exam_id = in_progress_exam_resp.json()["id"]
    in_progress_start = await client.post(
        f"/api/v1/exams/reading/{in_progress_exam_id}/start",
        headers=headers,
    )
    assert in_progress_start.status_code == 200

    success_result = await client.get(
        f"/api/v1/exams/reading/{success_exam_id}/result",
        headers=headers,
    )
    assert success_result.status_code == 200
    success_payload = success_result.json()
    assert success_payload["result"] == "success"
    assert success_payload["correct_answers"] == 1
    assert isinstance(success_payload["time_spent"], int)

    failed_result = await client.get(
        f"/api/v1/exams/reading/{failed_exam_id}/result",
        headers=headers,
    )
    assert failed_result.status_code == 200
    failed_payload = failed_result.json()
    assert failed_payload["result"] == "failed"
    assert failed_payload["correct_answers"] == 1
    assert failed_payload["time_spent"] >= 30

    in_progress_result = await client.get(
        f"/api/v1/exams/reading/{in_progress_exam_id}/result",
        headers=headers,
    )
    assert in_progress_result.status_code == 200
    in_progress_payload = in_progress_result.json()
    assert in_progress_payload["result"] == "in_progress"
    assert in_progress_payload["score"] is None
    assert in_progress_payload["correct_answers"] == 0
    assert isinstance(in_progress_payload["time_spent"], int)


@pytest.mark.asyncio
async def test_reading_exam_result_endpoint_ownership_and_not_found(client, db_session):
    owner = await _create_user(db_session, "result-owner@example.com")
    stranger = await _create_user(db_session, "result-stranger@example.com")
    headers_owner = await _auth_headers(client, owner.email)
    headers_stranger = await _auth_headers(client, stranger.email)
    reading_test, _question = await _create_reading_test_with_single_question(db_session, time_limit=300)

    create_exam = await client.post(
        "/api/v1/exams/reading",
        headers=headers_owner,
        json={"test_id": reading_test.id},
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    forbidden_result = await client.get(
        f"/api/v1/exams/reading/{exam_id}/result",
        headers=headers_stranger,
    )
    assert forbidden_result.status_code == 403

    missing_result = await client.get(
        "/api/v1/exams/reading/999999/result",
        headers=headers_owner,
    )
    assert missing_result.status_code == 404
    assert missing_result.json()["code"] == "exam_not_found"


@pytest.mark.asyncio
async def test_submit_supports_forced_left_finish_reason(client, db_session):
    user = await _create_user(db_session, "forced-left@example.com")
    headers = await _auth_headers(client, user.email)
    reading_test, question = await _create_reading_test_with_single_question(db_session, time_limit=300)

    create_exam = await client.post(
        "/api/v1/exams/reading",
        headers=headers,
        json={"test_id": reading_test.id},
    )
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit?finish_reason=left",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert submit.status_code == 200
    payload = submit.json()
    assert payload["result"] == "failed"

    exam = await db_session.get(ReadingExam, exam_id)
    assert exam is not None
    await db_session.refresh(exam)
    assert exam.finish_reason == FinishReasonEnum.left
