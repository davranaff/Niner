from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.models import (
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionAnswer,
    ListeningQuestionBlock,
    ListeningQuestionOption,
    ListeningTest,
    OverallExam,
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
        first_name="Overall",
        last_name="Flow",
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


async def _create_reading_test(db_session) -> tuple[ReadingTest, ReadingQuestion]:
    test = ReadingTest(
        title="Overall Reading",
        description="Desc",
        time_limit=3600,
        total_questions=1,
        is_active=True,
    )
    db_session.add(test)
    await db_session.flush()

    passage = ReadingPassage(test_id=test.id, title="P1", content="Text", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Block",
        description="Desc",
        block_type="single_choice",
        order=1,
    )
    db_session.add(block)
    await db_session.flush()

    question = ReadingQuestion(
        question_block_id=block.id,
        question_text="Question",
        order=1,
    )
    db_session.add(question)
    await db_session.flush()
    db_session.add(
        ReadingQuestionOption(
            question_id=question.id,
            option_text="A",
            is_correct=True,
            order=1,
        )
    )
    db_session.add(ReadingQuestionAnswer(question_id=question.id, correct_answers="A"))
    await db_session.commit()
    return test, question


async def _create_listening_test(db_session) -> tuple[ListeningTest, ListeningQuestion]:
    test = ListeningTest(
        title="Overall Listening",
        description="Desc",
        time_limit=1800,
        total_questions=1,
        is_active=True,
        voice_url="https://example.com/audio.mp3",
    )
    db_session.add(test)
    await db_session.flush()

    part = ListeningPart(test_id=test.id, title="Part 1", order=1)
    db_session.add(part)
    await db_session.flush()

    block = ListeningQuestionBlock(
        part_id=part.id,
        title="Block",
        description="Desc",
        block_type="single_choice",
        order=1,
    )
    db_session.add(block)
    await db_session.flush()

    question = ListeningQuestion(
        question_block_id=block.id,
        question_text="Question",
        order=1,
    )
    db_session.add(question)
    await db_session.flush()
    db_session.add(
        ListeningQuestionOption(
            question_id=question.id,
            option_text="A",
            is_correct=True,
            order=1,
        )
    )
    db_session.add(ListeningQuestionAnswer(question_id=question.id, correct_answers="A"))
    await db_session.commit()
    return test, question


async def _create_writing_test(db_session) -> tuple[WritingTest, WritingPart]:
    test = WritingTest(
        title="Overall Writing",
        description="Desc",
        time_limit=3600,
        is_active=True,
    )
    db_session.add(test)
    await db_session.flush()

    part = WritingPart(
        test_id=test.id,
        order=1,
        task="Task 1",
        image_url=None,
        file_urls=[],
    )
    db_session.add(part)
    await db_session.commit()
    return test, part


@pytest.mark.asyncio
async def test_overall_start_resumes_existing_in_progress_attempt(client, db_session):
    user = await _create_user(db_session, "overall-resume@example.com")
    await _create_listening_test(db_session)
    await _create_reading_test(db_session)
    await _create_writing_test(db_session)
    headers = await _auth_headers(client, user.email)

    first = await client.post("/api/v1/exams/overall/start", headers=headers)
    assert first.status_code == 200
    first_payload = first.json()

    second = await client.post("/api/v1/exams/overall/start", headers=headers)
    assert second.status_code == 200
    second_payload = second.json()

    assert second_payload["id"] == first_payload["id"]
    assert second_payload["listening_exam_id"] == first_payload["listening_exam_id"]
    assert second_payload["status"] == "in_progress"
    assert second_payload["phase"] == "module"
    assert second_payload["current_module"] == "listening"

    count = (
        await db_session.execute(select(func.count(OverallExam.id)).where(OverallExam.user_id == user.id))
    ).scalar_one()
    assert int(count) == 1


@pytest.mark.asyncio
async def test_overall_start_requires_active_tests_for_all_modules(client, db_session):
    user = await _create_user(db_session, "overall-no-tests@example.com")
    headers = await _auth_headers(client, user.email)

    response = await client.post("/api/v1/exams/overall/start", headers=headers)
    assert response.status_code == 404
    assert response.json()["code"] == "listening_test_not_found"


@pytest.mark.asyncio
async def test_overall_flow_with_breaks_continue_and_pending_band(client, db_session):
    user = await _create_user(db_session, "overall-flow@example.com")
    _listening_test, listening_question = await _create_listening_test(db_session)
    _reading_test, reading_question = await _create_reading_test(db_session)
    _writing_test, writing_part = await _create_writing_test(db_session)
    headers = await _auth_headers(client, user.email)

    start_response = await client.post("/api/v1/exams/overall/start", headers=headers)
    assert start_response.status_code == 200
    start_payload = start_response.json()
    overall_id = start_payload["id"]
    listening_exam_id = start_payload["listening_exam_id"]
    assert listening_exam_id is not None

    listening_submit = await client.post(
        f"/api/v1/exams/listening/{listening_exam_id}/submit",
        headers=headers,
        json=[{"id": listening_question.id, "value": "A"}],
    )
    assert listening_submit.status_code == 200

    after_listening = await client.get(f"/api/v1/exams/overall/{overall_id}", headers=headers)
    assert after_listening.status_code == 200
    after_listening_payload = after_listening.json()
    assert after_listening_payload["phase"] == "break"
    assert after_listening_payload["current_module"] == "listening"

    continue_reading = await client.post(f"/api/v1/exams/overall/{overall_id}/continue", headers=headers)
    assert continue_reading.status_code == 200
    continue_reading_payload = continue_reading.json()
    assert continue_reading_payload["phase"] == "module"
    assert continue_reading_payload["current_module"] == "reading"
    reading_exam_id = continue_reading_payload["reading_exam_id"]
    assert reading_exam_id is not None

    reading_submit = await client.post(
        f"/api/v1/exams/reading/{reading_exam_id}/submit",
        headers=headers,
        json=[{"id": reading_question.id, "value": "A"}],
    )
    assert reading_submit.status_code == 200

    after_reading = await client.get(f"/api/v1/exams/overall/{overall_id}", headers=headers)
    assert after_reading.status_code == 200
    after_reading_payload = after_reading.json()
    assert after_reading_payload["phase"] == "break"
    assert after_reading_payload["current_module"] == "reading"

    continue_writing = await client.post(f"/api/v1/exams/overall/{overall_id}/continue", headers=headers)
    assert continue_writing.status_code == 200
    continue_writing_payload = continue_writing.json()
    writing_exam_id = continue_writing_payload["writing_exam_id"]
    assert writing_exam_id is not None

    writing_submit = await client.post(
        f"/api/v1/exams/writing/{writing_exam_id}/submit",
        headers=headers,
        json=[{"part_id": writing_part.id, "essay": "Sample writing answer"}],
    )
    assert writing_submit.status_code == 200

    state_after_writing = await client.get(f"/api/v1/exams/overall/{overall_id}", headers=headers)
    assert state_after_writing.status_code == 200
    state_after_writing_payload = state_after_writing.json()
    assert state_after_writing_payload["status"] == "completed"
    assert state_after_writing_payload["phase"] == "completed"

    result_response = await client.get(f"/api/v1/exams/overall/{overall_id}/result", headers=headers)
    assert result_response.status_code == 200
    result_payload = result_response.json()
    assert result_payload["status"] == "completed"
    assert result_payload["result"] == "success"
    assert result_payload["overall_band"] is None
    assert result_payload["overall_band_pending"] is True


@pytest.mark.asyncio
async def test_overall_terminates_when_user_left_in_active_module(client, db_session):
    user = await _create_user(db_session, "overall-left@example.com")
    _listening_test, listening_question = await _create_listening_test(db_session)
    await _create_reading_test(db_session)
    await _create_writing_test(db_session)
    headers = await _auth_headers(client, user.email)

    start_response = await client.post("/api/v1/exams/overall/start", headers=headers)
    overall_id = start_response.json()["id"]
    listening_exam_id = start_response.json()["listening_exam_id"]

    submit_left = await client.post(
        f"/api/v1/exams/listening/{listening_exam_id}/submit?finish_reason=left",
        headers=headers,
        json=[{"id": listening_question.id, "value": "A"}],
    )
    assert submit_left.status_code == 200

    state = await client.get(f"/api/v1/exams/overall/{overall_id}", headers=headers)
    assert state.status_code == 200
    payload = state.json()
    assert payload["status"] == "terminated"
    assert payload["phase"] == "terminated"
    assert payload["finish_reason"] == "left"

    result_response = await client.get(f"/api/v1/exams/overall/{overall_id}/result", headers=headers)
    assert result_response.status_code == 200
    assert result_response.json()["result"] == "failed"


@pytest.mark.asyncio
async def test_overall_endpoints_enforce_ownership_and_not_found(client, db_session):
    owner = await _create_user(db_session, "overall-owner@example.com")
    stranger = await _create_user(db_session, "overall-stranger@example.com")
    await _create_listening_test(db_session)
    await _create_reading_test(db_session)
    await _create_writing_test(db_session)
    owner_headers = await _auth_headers(client, owner.email)
    stranger_headers = await _auth_headers(client, stranger.email)

    start_response = await client.post("/api/v1/exams/overall/start", headers=owner_headers)
    overall_id = start_response.json()["id"]

    forbidden_get = await client.get(f"/api/v1/exams/overall/{overall_id}", headers=stranger_headers)
    assert forbidden_get.status_code == 403

    forbidden_continue = await client.post(
        f"/api/v1/exams/overall/{overall_id}/continue",
        headers=stranger_headers,
    )
    assert forbidden_continue.status_code == 403

    forbidden_result = await client.get(
        f"/api/v1/exams/overall/{overall_id}/result",
        headers=stranger_headers,
    )
    assert forbidden_result.status_code == 403

    not_found_state = await client.get("/api/v1/exams/overall/999999", headers=owner_headers)
    assert not_found_state.status_code == 404

    not_found_result = await client.get("/api/v1/exams/overall/999999/result", headers=owner_headers)
    assert not_found_result.status_code == 404
