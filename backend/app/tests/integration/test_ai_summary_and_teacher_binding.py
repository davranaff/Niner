from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import (
    AiModuleSummary,
    AiSummaryModuleEnum,
    AiSummarySourceEnum,
    AiSummaryStatusEnum,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionAnswer,
    ListeningQuestionBlock,
    ListeningTest,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingTest,
    RoleEnum,
    TeacherStudentInvite,
    User,
    WritingPart,
    WritingTest,
)


async def _create_user(db_session, email: str, role: RoleEnum) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="Test",
        last_name="User",
        role=role,
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


async def _create_minimal_reading_test(db_session) -> tuple[ReadingTest, ReadingQuestion]:
    test = ReadingTest(title="R", description="D", time_limit=3600, total_questions=1, is_active=True)
    db_session.add(test)
    await db_session.flush()

    passage = ReadingPassage(test_id=test.id, title="P", content="C", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="B",
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
    await db_session.commit()
    return test, question


async def _create_minimal_listening_test(db_session) -> tuple[ListeningTest, ListeningQuestion]:
    test = ListeningTest(
        title="L",
        description="D",
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
        title="B",
        description="D",
        block_type="short_answer",
        order=1,
    )
    db_session.add(block)
    await db_session.flush()

    question = ListeningQuestion(question_block_id=block.id, question_text="Q1", order=1)
    db_session.add(question)
    await db_session.flush()

    db_session.add(ListeningQuestionAnswer(question_id=question.id, correct_answers="listen"))
    await db_session.commit()
    return test, question


async def _create_minimal_writing_test(db_session) -> tuple[WritingTest, WritingPart]:
    test = WritingTest(title="W", description="D", time_limit=3600, is_active=True)
    db_session.add(test)
    await db_session.flush()

    part = WritingPart(test_id=test.id, order=1, task="Write about this topic")
    db_session.add(part)
    await db_session.commit()
    return test, part


@pytest.mark.asyncio
async def test_ai_manual_trigger_daily_limit_three(client, db_session):
    student = await _create_user(db_session, "ai-debounce-student@example.com", RoleEnum.student)
    headers = await _auth_headers(client, student.email)

    for _ in range(3):
        allowed = await client.post("/api/v1/ai/summaries", headers=headers, json={"module": "reading"})
        assert allowed.status_code == 202

    blocked = await client.post("/api/v1/ai/summaries", headers=headers, json={"module": "reading"})
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "summary_debounce_conflict"
    assert blocked.json()["details"]["used"] == 3
    assert blocked.json()["details"]["limit"] == 3


@pytest.mark.asyncio
async def test_teacher_binding_lifecycle_and_access(client, db_session):
    teacher = await _create_user(db_session, "teacher-ai@example.com", RoleEnum.teacher)
    student = await _create_user(db_session, "student-ai@example.com", RoleEnum.student)
    outsider = await _create_user(db_session, "outsider-ai@example.com", RoleEnum.student)
    admin = await _create_user(db_session, "admin-ai@example.com", RoleEnum.admin)

    teacher_headers = await _auth_headers(client, teacher.email)
    student_headers = await _auth_headers(client, student.email)
    outsider_headers = await _auth_headers(client, outsider.email)
    admin_headers = await _auth_headers(client, admin.email)

    invite = await client.post("/api/v1/teacher/students/invites", headers=teacher_headers)
    assert invite.status_code == 200
    invite_payload = invite.json()
    token = invite_payload["invite_token"]
    parsed = urlparse(invite_payload["invite_link"])
    query = parse_qs(parsed.query)
    assert query.get("token", [None])[0] == token
    assert query.get("teacher_id", [None])[0] == str(teacher.id)
    assert query.get("teacher_email", [None])[0] == teacher.email

    accept = await client.post(
        "/api/v1/students/me/teacher/accept-invite",
        headers=student_headers,
        json={"token": token},
    )
    assert accept.status_code == 200
    assert accept.json()["student_id"] == student.id

    listed = await client.get("/api/v1/teacher/students", headers=teacher_headers)
    assert listed.status_code == 200
    assert any(item["student_id"] == student.id for item in listed.json()["items"])

    trigger = await client.post(
        "/api/v1/ai/summaries",
        headers=teacher_headers,
        json={"module": "writing", "student_id": student.id},
    )
    assert trigger.status_code == 202
    summary_id = trigger.json()["id"]

    teacher_get = await client.get(f"/api/v1/ai/summaries/{summary_id}", headers=teacher_headers)
    assert teacher_get.status_code == 200

    admin_get = await client.get(f"/api/v1/ai/summaries/{summary_id}", headers=admin_headers)
    assert admin_get.status_code == 200

    outsider_get = await client.get(f"/api/v1/ai/summaries/{summary_id}", headers=outsider_headers)
    assert outsider_get.status_code == 403

    unbind = await client.delete(f"/api/v1/teacher/students/{student.id}", headers=teacher_headers)
    assert unbind.status_code == 200

    forbidden_after_unbind = await client.post(
        "/api/v1/ai/summaries",
        headers=teacher_headers,
        json={"module": "reading", "student_id": student.id},
    )
    assert forbidden_after_unbind.status_code == 403


@pytest.mark.asyncio
async def test_teacher_invite_expired(client, db_session):
    teacher = await _create_user(db_session, "teacher-expired@example.com", RoleEnum.teacher)
    student = await _create_user(db_session, "student-expired@example.com", RoleEnum.student)

    teacher_headers = await _auth_headers(client, teacher.email)
    student_headers = await _auth_headers(client, student.email)

    invite = await client.post("/api/v1/teacher/students/invites", headers=teacher_headers)
    assert invite.status_code == 200
    token = invite.json()["invite_token"]

    invite_row = (await db_session.execute(select(TeacherStudentInvite).where(TeacherStudentInvite.teacher_id == teacher.id))).scalar_one()
    invite_row.expires_at = datetime.now(UTC) - timedelta(hours=1)
    await db_session.commit()

    accept = await client.post(
        "/api/v1/students/me/teacher/accept-invite",
        headers=student_headers,
        json={"token": token},
    )
    assert accept.status_code == 400
    assert accept.json()["code"] == "invalid_invite"


@pytest.mark.asyncio
async def test_auto_summary_trigger_after_each_exam_submit(client, db_session):
    student = await _create_user(db_session, "auto-summary@example.com", RoleEnum.student)
    headers = await _auth_headers(client, student.email)

    reading_test, reading_question = await _create_minimal_reading_test(db_session)
    listening_test, listening_question = await _create_minimal_listening_test(db_session)
    writing_test, writing_part = await _create_minimal_writing_test(db_session)

    reading_exam = await client.post("/api/v1/exams/reading", headers=headers, json={"test_id": reading_test.id})
    assert reading_exam.status_code == 200
    reading_exam_id = reading_exam.json()["id"]

    reading_submit = await client.post(
        f"/api/v1/exams/reading/{reading_exam_id}/submit",
        headers=headers,
        json=[{"id": reading_question.id, "value": "answer"}],
    )
    assert reading_submit.status_code == 200

    listening_exam = await client.post("/api/v1/exams/listening", headers=headers, json={"test_id": listening_test.id})
    assert listening_exam.status_code == 200
    listening_exam_id = listening_exam.json()["id"]

    listening_submit = await client.post(
        f"/api/v1/exams/listening/{listening_exam_id}/submit",
        headers=headers,
        json=[{"id": listening_question.id, "value": "listen"}],
    )
    assert listening_submit.status_code == 200

    writing_exam = await client.post("/api/v1/exams/writing", headers=headers, json={"test_id": writing_test.id})
    assert writing_exam.status_code == 200
    writing_exam_id = writing_exam.json()["id"]

    writing_submit = await client.post(
        f"/api/v1/exams/writing/{writing_exam_id}/submit",
        headers=headers,
        json=[{"part_id": writing_part.id, "essay": "This is essay text."}],
    )
    assert writing_submit.status_code == 200

    summary_rows = (
        await db_session.execute(
            select(AiModuleSummary).where(
                AiModuleSummary.user_id == student.id,
                AiModuleSummary.source == AiSummarySourceEnum.auto_submit,
            )
        )
    ).scalars().all()

    modules = {row.module for row in summary_rows}
    assert AiSummaryModuleEnum.reading in modules
    assert AiSummaryModuleEnum.listening in modules
    assert AiSummaryModuleEnum.writing in modules


@pytest.mark.asyncio
async def test_ai_summary_sse_stream_done_and_error(client, db_session):
    student = await _create_user(db_session, "ai-stream@example.com", RoleEnum.student)
    headers = await _auth_headers(client, student.email)

    done_row = AiModuleSummary(
        user_id=student.id,
        module=AiSummaryModuleEnum.reading,
        source=AiSummarySourceEnum.manual,
        status=AiSummaryStatusEnum.done,
        lang="en",
        attempts_limit=10,
        stream_text="token-1 token-2",
        result_json={"summary_text": "token-1 token-2"},
        result_text="token-1 token-2",
        finished_at=datetime.now(UTC),
    )
    db_session.add(done_row)
    await db_session.commit()
    await db_session.refresh(done_row)

    done_stream = await client.get(f"/api/v1/ai/summaries/{done_row.id}/stream", headers=headers)
    assert done_stream.status_code == 200
    body = done_stream.text
    assert "event: meta" in body
    assert "event: token" in body
    assert "event: done" in body

    failed_row = AiModuleSummary(
        user_id=student.id,
        module=AiSummaryModuleEnum.listening,
        source=AiSummarySourceEnum.manual,
        status=AiSummaryStatusEnum.failed,
        lang="en",
        attempts_limit=10,
        stream_text="partial",
        error_text="generation failed",
        finished_at=datetime.now(UTC),
    )
    db_session.add(failed_row)
    await db_session.commit()
    await db_session.refresh(failed_row)

    failed_stream = await client.get(f"/api/v1/ai/summaries/{failed_row.id}/stream", headers=headers)
    assert failed_stream.status_code == 200
    failed_body = failed_stream.text
    assert "event: error" in failed_body
