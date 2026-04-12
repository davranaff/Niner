from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.core.security import hash_password
from app.db.models import (
    FinishReasonEnum,
    ListeningExam,
    ListeningTest,
    ReadingExam,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    RoleEnum,
    User,
    WritingExam,
    WritingExamPart,
    WritingPart,
    WritingTest,
)
from app.db.session import SessionLocal
from app.workers import tasks


async def _create_user(db_session, *, email: str, role: RoleEnum = RoleEnum.student, password: str = "Password123") -> User:
    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name="Usecase",
        last_name="Tester",
        role=role,
        is_active=True,
        verified_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _auth_headers(client, email: str, password: str = "Password123") -> dict[str, str]:
    sign_in = await client.post("/api/v1/auth/sign-in", json={"email": email, "password": password})
    assert sign_in.status_code == 200
    token = sign_in.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_minimal_reading_test_with_question(db_session, *, title: str, time_limit: int = 300) -> tuple[ReadingTest, ReadingQuestion]:
    reading_test = ReadingTest(title=title, description="Desc", time_limit=time_limit, total_questions=1, is_active=True)
    db_session.add(reading_test)
    await db_session.flush()

    passage = ReadingPassage(test_id=reading_test.id, title="Passage 1", content="Text", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Block 1",
        description="Choose NO MORE THAN TWO WORDS",
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
async def test_auth_rate_limits_sign_in_reset_link_and_reset_password(client, db_session, monkeypatch):
    await _create_user(db_session, email="rate-limit@example.com")

    async def fake_send_email(*args, **kwargs) -> None:  # noqa: ANN002,ANN003
        return None

    rate_limiter._bucket.clear()
    monkeypatch.setattr(settings, "rate_limit_sign_in", 2)
    monkeypatch.setattr(settings, "rate_limit_reset", 2)
    monkeypatch.setattr(settings, "rate_limit_window_seconds", 60)
    monkeypatch.setattr("app.modules.auth.services.core.send_email", fake_send_email)

    try:
        for _ in range(2):
            response = await client.post(
                "/api/v1/auth/sign-in",
                json={"email": "rate-limit@example.com", "password": "wrong-password"},
            )
            assert response.status_code == 400

        blocked_sign_in = await client.post(
            "/api/v1/auth/sign-in",
            json={"email": "rate-limit@example.com", "password": "wrong-password"},
        )
        assert blocked_sign_in.status_code == 429
        assert blocked_sign_in.json()["code"] == "rate_limited"

        for _ in range(2):
            response = await client.post("/api/v1/auth/reset-link", json={"email": "rate-limit@example.com"})
            assert response.status_code == 200

        blocked_reset_link = await client.post("/api/v1/auth/reset-link", json={"email": "rate-limit@example.com"})
        assert blocked_reset_link.status_code == 429
        assert blocked_reset_link.json()["code"] == "rate_limited"

        for _ in range(2):
            response = await client.post(
                "/api/v1/auth/reset-password",
                json={"token": "invalid", "password": "NewPassword123"},
            )
            assert response.status_code == 404

        blocked_reset_password = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": "invalid", "password": "NewPassword123"},
        )
        assert blocked_reset_password.status_code == 429
        assert blocked_reset_password.json()["code"] == "rate_limited"
    finally:
        rate_limiter._bucket.clear()


@pytest.mark.asyncio
async def test_catalog_limit_offset_contract_for_all_modules(client, db_session):
    user = await _create_user(db_session, email="catalog-auth@example.com")
    headers = await _auth_headers(client, user.email)

    db_session.add_all(
        [
            ReadingTest(title="R-1", description="D", time_limit=3600, total_questions=0, is_active=True),
            ReadingTest(title="R-2", description="D", time_limit=3600, total_questions=0, is_active=True),
            ReadingTest(title="R-3", description="D", time_limit=3600, total_questions=0, is_active=True),
        ]
    )
    from app.db.models import ListeningTest

    db_session.add_all(
        [
            ListeningTest(title="L-1", description="D", time_limit=1800, total_questions=0, is_active=True, voice_url=None),
            ListeningTest(title="L-2", description="D", time_limit=1800, total_questions=0, is_active=True, voice_url=None),
            ListeningTest(title="L-3", description="D", time_limit=1800, total_questions=0, is_active=True, voice_url=None),
        ]
    )
    db_session.add_all(
        [
            WritingTest(title="W-1", description="D", time_limit=3600, is_active=True),
            WritingTest(title="W-2", description="D", time_limit=3600, is_active=True),
            WritingTest(title="W-3", description="D", time_limit=3600, is_active=True),
        ]
    )
    await db_session.commit()

    async def assert_limit_offset_contract(path: str) -> None:
        first = await client.get(f"{path}?limit=2&offset=0", headers=headers)
        assert first.status_code == 200
        first_payload = first.json()
        assert first_payload["limit"] == 2
        assert first_payload["offset"] == 0
        assert len(first_payload["items"]) == 2
        first_ids = {item["id"] for item in first_payload["items"]}

        second = await client.get(f"{path}?limit=2&offset=2", headers=headers)
        assert second.status_code == 200
        second_payload = second.json()
        assert second_payload["limit"] == 2
        assert second_payload["offset"] == 2
        assert len(second_payload["items"]) >= 1

        second_ids = {item["id"] for item in second_payload["items"]}
        assert first_ids.isdisjoint(second_ids)

    await assert_limit_offset_contract("/api/v1/reading/tests")
    await assert_limit_offset_contract("/api/v1/listening/tests")
    await assert_limit_offset_contract("/api/v1/writing/tests")


@pytest.mark.asyncio
async def test_catalog_list_endpoints_require_auth(client):
    reading = await client.get("/api/v1/reading/tests")
    assert reading.status_code == 401

    listening = await client.get("/api/v1/listening/tests")
    assert listening.status_code == 401

    writing = await client.get("/api/v1/writing/tests")
    assert writing.status_code == 401


@pytest.mark.asyncio
async def test_catalog_list_includes_user_attempt_stats_and_isolation(client, db_session):
    owner = await _create_user(db_session, email="catalog-stats-owner@example.com")
    stranger = await _create_user(db_session, email="catalog-stats-stranger@example.com")
    owner_headers = await _auth_headers(client, owner.email)

    reading_test = ReadingTest(title="R-Stats", description="D", time_limit=3600, total_questions=0, is_active=True)
    listening_test = ListeningTest(
        title="L-Stats",
        description="D",
        time_limit=1800,
        total_questions=0,
        is_active=True,
        voice_url=None,
    )
    writing_test = WritingTest(title="W-Stats", description="D", time_limit=3600, is_active=True)
    db_session.add_all([reading_test, listening_test, writing_test])
    await db_session.flush()

    db_session.add_all(
        [
            ReadingExam(
                user_id=owner.id,
                reading_test_id=reading_test.id,
                finished_at=datetime.now(UTC),
                finish_reason=FinishReasonEnum.completed,
            ),
            ReadingExam(
                user_id=owner.id,
                reading_test_id=reading_test.id,
                finished_at=datetime.now(UTC),
                finish_reason=FinishReasonEnum.left,
            ),
            ReadingExam(
                user_id=owner.id,
                reading_test_id=reading_test.id,
                finished_at=None,
                finish_reason=None,
            ),
            ReadingExam(
                user_id=stranger.id,
                reading_test_id=reading_test.id,
                finished_at=datetime.now(UTC),
                finish_reason=FinishReasonEnum.completed,
            ),
            ListeningExam(
                user_id=owner.id,
                listening_test_id=listening_test.id,
                finished_at=datetime.now(UTC),
                finish_reason=FinishReasonEnum.time_is_up,
            ),
            WritingExam(
                user_id=owner.id,
                writing_test_id=writing_test.id,
                finished_at=datetime.now(UTC),
                finish_reason=FinishReasonEnum.completed,
            ),
            WritingExam(
                user_id=owner.id,
                writing_test_id=writing_test.id,
                finished_at=datetime.now(UTC),
                finish_reason=FinishReasonEnum.left,
            ),
        ]
    )
    await db_session.commit()

    reading_resp = await client.get("/api/v1/reading/tests?limit=100&offset=0", headers=owner_headers)
    assert reading_resp.status_code == 200
    reading_item = next(item for item in reading_resp.json()["items"] if item["id"] == reading_test.id)
    assert reading_item["attempts_count"] == 3
    assert reading_item["successful_attempts_count"] == 1
    assert reading_item["failed_attempts_count"] == 1

    listening_resp = await client.get("/api/v1/listening/tests?limit=100&offset=0", headers=owner_headers)
    assert listening_resp.status_code == 200
    listening_item = next(item for item in listening_resp.json()["items"] if item["id"] == listening_test.id)
    assert listening_item["attempts_count"] == 1
    assert listening_item["successful_attempts_count"] == 0
    assert listening_item["failed_attempts_count"] == 1

    writing_resp = await client.get("/api/v1/writing/tests?limit=100&offset=0", headers=owner_headers)
    assert writing_resp.status_code == 200
    writing_item = next(item for item in writing_resp.json()["items"] if item["id"] == writing_test.id)
    assert writing_item["attempts_count"] == 2
    assert writing_item["successful_attempts_count"] == 1
    assert writing_item["failed_attempts_count"] == 1


@pytest.mark.asyncio
async def test_exam_invalid_test_refs_and_missing_exam_paths(client, db_session):
    user = await _create_user(db_session, email="exam-errors@example.com")
    headers = await _auth_headers(client, user.email)

    create_reading = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": 999999})
    assert create_reading.status_code == 404
    assert create_reading.json()["code"] == "reading_test_not_found"

    create_listening = await client.post("/api/v1/exams/listening", headers=headers, json={"test_id": 999999})
    assert create_listening.status_code == 404
    assert create_listening.json()["code"] == "listening_test_not_found"

    create_writing = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": 999999})
    assert create_writing.status_code == 404
    assert create_writing.json()["code"] == "writing_test_not_found"

    missing_start = await client.post("/api/v1/exams/reading/999999/start", headers=headers)
    assert missing_start.status_code == 404
    assert missing_start.json()["code"] == "exam_not_found"

    missing_submit_reading = await client.post(
        "/api/v1/exams/reading/999999/submit",
        headers=headers,
        json=[{"id": 1, "value": "a"}],
    )
    assert missing_submit_reading.status_code == 404
    assert missing_submit_reading.json()["code"] == "exam_not_found"

    missing_submit_listening = await client.post(
        "/api/v1/exams/listening/999999/submit",
        headers=headers,
        json=[{"id": 1, "value": "a"}],
    )
    assert missing_submit_listening.status_code == 404
    assert missing_submit_listening.json()["code"] == "exam_not_found"

    missing_submit_writing = await client.post(
        "/api/v1/exams/writing/999999/submit",
        headers=headers,
        json=[{"part_id": 1, "essay": "essay"}],
    )
    assert missing_submit_writing.status_code == 404
    assert missing_submit_writing.json()["code"] == "exam_not_found"


@pytest.mark.asyncio
async def test_exams_me_supports_independent_offsets_for_each_kind(client, db_session):
    user = await _create_user(db_session, email="exam-me-offsets@example.com")
    headers = await _auth_headers(client, user.email)

    from app.db.models import ListeningTest

    reading_tests = [
        ReadingTest(title="RX-1", description="D", time_limit=3600, total_questions=0, is_active=True),
        ReadingTest(title="RX-2", description="D", time_limit=3600, total_questions=0, is_active=True),
    ]
    listening_tests = [
        ListeningTest(title="LX-1", description="D", time_limit=1800, total_questions=0, is_active=True, voice_url=None),
        ListeningTest(title="LX-2", description="D", time_limit=1800, total_questions=0, is_active=True, voice_url=None),
    ]
    writing_tests = [
        WritingTest(title="WX-1", description="D", time_limit=3600, is_active=True),
        WritingTest(title="WX-2", description="D", time_limit=3600, is_active=True),
    ]
    db_session.add_all(reading_tests + listening_tests + writing_tests)
    await db_session.commit()

    for test in reading_tests:
        response = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": test.id})
        assert response.status_code == 200
    for test in listening_tests:
        response = await client.post("/api/v1/exams/listening", headers=headers, json={"test_id": test.id})
        assert response.status_code == 200
    for test in writing_tests:
        response = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": test.id})
        assert response.status_code == 200

    first = await client.get("/api/v1/exams/me?limit=1&reading_offset=0&listening_offset=0&writing_offset=0", headers=headers)
    assert first.status_code == 200
    first_payload = first.json()

    assert len(first_payload["reading"]["items"]) == 1
    assert len(first_payload["listening"]["items"]) == 1
    assert len(first_payload["writing"]["items"]) == 1
    assert first_payload["reading"]["offset"] == 0
    assert first_payload["listening"]["offset"] == 0
    assert first_payload["writing"]["offset"] == 0

    first_ids = {
        "reading": first_payload["reading"]["items"][0]["id"],
        "listening": first_payload["listening"]["items"][0]["id"],
        "writing": first_payload["writing"]["items"][0]["id"],
    }

    second = await client.get(
        "/api/v1/exams/me?limit=1&reading_offset=1&listening_offset=1&writing_offset=1",
        headers=headers,
    )
    assert second.status_code == 200
    second_payload = second.json()

    assert len(second_payload["reading"]["items"]) == 1
    assert len(second_payload["listening"]["items"]) == 1
    assert len(second_payload["writing"]["items"]) == 1
    assert second_payload["reading"]["offset"] == 1
    assert second_payload["listening"]["offset"] == 1
    assert second_payload["writing"]["offset"] == 1

    assert second_payload["reading"]["items"][0]["id"] != first_ids["reading"]
    assert second_payload["listening"]["items"][0]["id"] != first_ids["listening"]
    assert second_payload["writing"]["items"][0]["id"] != first_ids["writing"]


@pytest.mark.asyncio
async def test_writing_submit_survives_ai_queue_failure(client, db_session, monkeypatch):
    user = await _create_user(db_session, email="writing-queue-failure@example.com")
    headers = await _auth_headers(client, user.email)

    writing_test = WritingTest(title="WQ-1", description="Desc", time_limit=3600, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    writing_part = WritingPart(test_id=writing_test.id, order=1, task="Discuss this topic in detail.")
    db_session.add(writing_part)
    await db_session.commit()

    async def fail_enqueue(_: int) -> None:
        raise RuntimeError("queue unavailable")

    monkeypatch.setattr("app.modules.exams.services.core.enqueue_writing_evaluation", fail_enqueue)

    create_exam = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": writing_test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    submit = await client.post(
        f"/api/v1/exams/writing/{exam_id}/submit",
        headers=headers,
        json=[{"part_id": writing_part.id, "essay": "My essay content"}],
    )
    assert submit.status_code == 200
    payload = submit.json()
    assert payload["result"] == "success"

    stored_part = (
        await db_session.execute(select(WritingExamPart).where(WritingExamPart.exam_id == exam_id))
    ).scalar_one()
    assert stored_part.score is None
    assert "AI evaluation is pending" in str(stored_part.corrections)


@pytest.mark.asyncio
async def test_writing_worker_does_not_override_admin_review(db_session, monkeypatch):
    user = await _create_user(db_session, email="writing-admin-reviewed@example.com")

    writing_test = WritingTest(title="WW-1", description="Desc", time_limit=3600, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    writing_part = WritingPart(test_id=writing_test.id, order=1, task="Analyze both views.")
    db_session.add(writing_part)
    await db_session.flush()

    writing_exam = WritingExam(user_id=user.id, writing_test_id=writing_test.id)
    db_session.add(writing_exam)
    await db_session.flush()

    exam_part = WritingExamPart(
        exam_id=writing_exam.id,
        part_id=writing_part.id,
        essay="Admin checked essay",
        is_checked=True,
        score=Decimal("8.0"),
        corrections="Manual admin review",
    )
    db_session.add(exam_part)
    await db_session.commit()

    async def should_not_run(_: str, __: str) -> dict:
        raise AssertionError("AI evaluation must be skipped for admin-reviewed part")

    monkeypatch.setattr(tasks, "_evaluate_writing_essay", should_not_run)

    await tasks.evaluate_writing_exam_part({"job_try": 1}, exam_part.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(WritingExamPart, exam_part.id)
        assert refreshed is not None
        assert refreshed.is_checked is True
        assert refreshed.score == Decimal("8.0")
        assert refreshed.corrections == "Manual admin review"


@pytest.mark.asyncio
async def test_parallel_submit_idempotency_smoke(client, db_session):
    user = await _create_user(db_session, email="parallel-submit@example.com")
    headers = await _auth_headers(client, user.email)

    reading_test, question = await _create_minimal_reading_test_with_question(
        db_session,
        title="Parallel Submit Reading",
        time_limit=300,
    )

    create_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": reading_test.id})
    assert create_exam.status_code == 200
    exam_id = create_exam.json()["id"]

    first_submit = await client.post(
        f"/api/v1/exams/reading/{exam_id}/submit",
        headers=headers,
        json=[{"id": question.id, "value": "answer"}],
    )
    assert first_submit.status_code == 200
    first_payload = first_submit.json()

    async def repeat_submit() -> tuple[int, dict]:
        response = await client.post(
            f"/api/v1/exams/reading/{exam_id}/submit",
            headers=headers,
            json=[{"id": question.id, "value": "wrong"}],
        )
        return response.status_code, response.json()

    results = await asyncio.gather(*[repeat_submit() for _ in range(5)])

    for status_code, payload in results:
        assert status_code == 200
        assert payload["correct_answers"] == first_payload["correct_answers"]
        assert payload["time_spent"] == first_payload["time_spent"]
