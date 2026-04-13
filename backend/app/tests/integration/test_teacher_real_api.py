from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.core.security import hash_password
from app.db.models import (
    FinishReasonEnum,
    ListeningExam,
    ListeningExamQuestionAnswer,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionBlock,
    ListeningTest,
    ReadingExam,
    ReadingExamQuestionAnswer,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionBlock,
    ReadingTest,
    RoleEnum,
    SpeakingExam,
    SpeakingTest,
    TeacherStudentLink,
    User,
    UserProfile,
    WritingExam,
    WritingExamPart,
    WritingPart,
    WritingTest,
)


async def _create_user(db_session, *, email: str, role: RoleEnum) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="Real",
        last_name=role.value.title(),
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


@pytest.mark.asyncio
async def test_teacher_dashboards_and_analytics_use_real_backend_data(client, db_session):
    teacher = await _create_user(db_session, email="teacher.real-api@example.com", role=RoleEnum.teacher)
    student = await _create_user(db_session, email="student.real-api@example.com", role=RoleEnum.student)

    db_session.add(
        UserProfile(
            user_id=student.id,
            target_band_score=Decimal("7.0"),
        )
    )
    db_session.add(TeacherStudentLink(teacher_id=teacher.id, student_id=student.id))

    reading_test = ReadingTest(
        title="Teacher Reading",
        description="Desc",
        time_limit=3600,
        total_questions=40,
        is_active=True,
    )
    listening_test = ListeningTest(
        title="Teacher Listening",
        description="Desc",
        time_limit=1800,
        total_questions=40,
        is_active=True,
        voice_url="https://example.com/audio.mp3",
    )
    writing_test = WritingTest(
        title="Teacher Writing",
        description="Desc",
        time_limit=3600,
        is_active=True,
    )
    speaking_test = SpeakingTest(
        slug="teacher-speaking",
        title="Teacher Speaking",
        description="Desc",
        level="Academic",
        duration_minutes=15,
        instructions=[],
        scoring_focus=[],
        is_active=True,
    )
    db_session.add_all([reading_test, listening_test, writing_test, speaking_test])
    await db_session.flush()

    reading_passage = ReadingPassage(
        test_id=reading_test.id,
        title="Teacher Reading Passage",
        content="Passage content",
        passage_number=1,
    )
    db_session.add(reading_passage)
    await db_session.flush()

    reading_block = ReadingQuestionBlock(
        passage_id=reading_passage.id,
        title="Teacher Reading Block",
        description="Desc",
        block_type="short_answers",
        order=1,
    )
    db_session.add(reading_block)
    await db_session.flush()

    reading_question = ReadingQuestion(
        question_block_id=reading_block.id,
        question_text="Teacher reading question",
        order=1,
    )
    db_session.add(reading_question)
    await db_session.flush()

    listening_part = ListeningPart(
        test_id=listening_test.id,
        title="Teacher Listening Part",
        order=1,
    )
    db_session.add(listening_part)
    await db_session.flush()

    listening_block = ListeningQuestionBlock(
        part_id=listening_part.id,
        title="Teacher Listening Block",
        description="Desc",
        block_type="short_answer",
        order=1,
    )
    db_session.add(listening_block)
    await db_session.flush()

    listening_question = ListeningQuestion(
        question_block_id=listening_block.id,
        question_text="Teacher listening question",
        order=1,
    )
    db_session.add(listening_question)
    await db_session.flush()

    writing_part = WritingPart(
        test_id=writing_test.id,
        order=2,
        task="Task 2",
        image_url=None,
        file_urls=[],
    )
    db_session.add(writing_part)
    await db_session.flush()

    now = datetime.now(UTC)
    reading_exam = ReadingExam(
        user_id=student.id,
        reading_test_id=reading_test.id,
        started_at=now,
        finished_at=now,
        finish_reason=FinishReasonEnum.completed,
    )
    listening_exam = ListeningExam(
        user_id=student.id,
        listening_test_id=listening_test.id,
        started_at=now,
        finished_at=now,
        finish_reason=FinishReasonEnum.left,
    )
    writing_exam = WritingExam(
        user_id=student.id,
        writing_test_id=writing_test.id,
        started_at=now,
        finished_at=now,
        finish_reason=FinishReasonEnum.completed,
    )
    speaking_exam = SpeakingExam(
        user_id=student.id,
        speaking_test_id=speaking_test.id,
        started_at=now,
        finished_at=now,
        finish_reason=FinishReasonEnum.completed,
        result_json={"overall_band": 6.5},
        integrity_events=[
            {
                "id": "evt-1",
                "type": "window_blur",
                "severity": "critical",
                "message": "Window focus lost",
                "created_at": now.isoformat(),
            }
        ],
    )
    db_session.add_all([reading_exam, listening_exam, writing_exam, speaking_exam])
    await db_session.flush()

    db_session.add_all(
        [
            ReadingExamQuestionAnswer(
                exam_id=reading_exam.id,
                question_id=reading_question.id,
                user_answer="wrong reading answer",
                correct_answer="correct reading answer",
                is_correct=False,
            ),
            ListeningExamQuestionAnswer(
                exam_id=listening_exam.id,
                question_id=listening_question.id,
                user_answer="wrong listening answer",
                correct_answer="correct listening answer",
                is_correct=False,
            ),
        ]
    )

    db_session.add(
        WritingExamPart(
            exam_id=writing_exam.id,
            part_id=writing_part.id,
            essay="Task 2 essay",
            score=Decimal("6.5"),
            is_checked=True,
        )
    )
    await db_session.commit()

    headers = await _auth_headers(client, teacher.email)

    dashboard = await client.get("/api/v1/teacher/dashboard", headers=headers)
    assert dashboard.status_code == 200
    dashboard_payload = dashboard.json()
    assert dashboard_payload["total_students"] == 1
    assert dashboard_payload["average_overall_band"] > 0
    assert len(dashboard_payload["recent_attempts"]) >= 1
    assert "completion_stats" in dashboard_payload

    students = await client.get("/api/v1/teacher/students/insights", headers=headers)
    assert students.status_code == 200
    students_payload = students.json()
    assert students_payload["count"] == 1
    assert students_payload["results"][0]["student_id"] == student.id
    assert students_payload["results"][0]["attempts_count"] >= 1

    details = await client.get(f"/api/v1/teacher/students/{student.id}/insights", headers=headers)
    assert details.status_code == 200
    details_payload = details.json()
    assert details_payload["student"]["id"] == student.id
    assert len(details_payload["latest_attempts"]) >= 1
    assert len(details_payload["writing_submissions"]) >= 1
    assert len(details_payload["integrity_events"]) >= 1

    analytics = await client.get("/api/v1/teacher/analytics", headers=headers)
    assert analytics.status_code == 200
    analytics_payload = analytics.json()
    assert analytics_payload["average_overall_band"] > 0
    assert "weak_areas" in analytics_payload
    assert "completion_vs_termination" in analytics_payload
