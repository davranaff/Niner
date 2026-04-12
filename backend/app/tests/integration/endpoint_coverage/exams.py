from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models import (
    ListeningExam,
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
    SpeakingPart,
    SpeakingQuestion,
    SpeakingTest,
    WritingExamPart,
    WritingPart,
    WritingTest,
)

from .context import CoverageContext


async def cover_exam_flows(ctx: CoverageContext) -> None:
    student_headers = ctx.auth_headers("student")

    read_exam_test = ReadingTest(
        title="Exam Reading",
        description="Desc",
        time_limit=3600,
        total_questions=1,
        is_active=True,
    )
    ctx.db_session.add(read_exam_test)
    await ctx.db_session.flush()

    read_exam_passage = ReadingPassage(
        test_id=read_exam_test.id,
        title="P",
        content="C",
        passage_number=1,
    )
    ctx.db_session.add(read_exam_passage)
    await ctx.db_session.flush()

    read_exam_block = ReadingQuestionBlock(
        passage_id=read_exam_passage.id,
        title="B",
        description="D",
        block_type="short_answers",
        order=1,
    )
    ctx.db_session.add(read_exam_block)
    await ctx.db_session.flush()

    read_exam_question = ReadingQuestion(
        question_block_id=read_exam_block.id,
        question_text="Q",
        order=1,
    )
    ctx.db_session.add(read_exam_question)
    await ctx.db_session.flush()
    ctx.db_session.add(ReadingQuestionAnswer(question_id=read_exam_question.id, correct_answers="answer"))

    listen_exam_test = ListeningTest(
        title="Exam Listening",
        description="Desc",
        time_limit=1800,
        total_questions=1,
        is_active=True,
        voice_url="https://example.com/e.mp3",
    )
    ctx.db_session.add(listen_exam_test)
    await ctx.db_session.flush()

    listen_exam_part = ListeningPart(test_id=listen_exam_test.id, title="Part", order=1)
    ctx.db_session.add(listen_exam_part)
    await ctx.db_session.flush()

    listen_exam_block = ListeningQuestionBlock(
        part_id=listen_exam_part.id,
        title="Block",
        description="Desc",
        block_type="short_answer",
        order=1,
    )
    ctx.db_session.add(listen_exam_block)
    await ctx.db_session.flush()

    listen_exam_question = ListeningQuestion(
        question_block_id=listen_exam_block.id,
        question_text="Q",
        order=1,
    )
    ctx.db_session.add(listen_exam_question)
    await ctx.db_session.flush()
    ctx.db_session.add(ListeningQuestionAnswer(question_id=listen_exam_question.id, correct_answers="listen"))

    write_exam_test = WritingTest(title="Exam Writing", description="Desc", time_limit=3600, is_active=True)
    ctx.db_session.add(write_exam_test)
    await ctx.db_session.flush()

    write_exam_part = WritingPart(test_id=write_exam_test.id, order=1, task="Write essay")
    ctx.db_session.add(write_exam_part)
    await ctx.db_session.flush()

    speaking_test = SpeakingTest(
        slug="coverage-speaking-test",
        title="Exam Speaking",
        description="Desc",
        level="Academic",
        duration_minutes=14,
        instructions=["Respond naturally and stay on topic."],
        scoring_focus=["fluency", "lexical", "grammar", "pronunciation"],
        is_active=True,
    )
    ctx.db_session.add(speaking_test)
    await ctx.db_session.flush()

    speaking_part = SpeakingPart(
        test_id=speaking_test.id,
        part_id="part1",
        part_order=1,
        title="Part 1",
        examiner_guidance="Ask brief personal questions.",
        duration_minutes=4,
    )
    ctx.db_session.add(speaking_part)
    await ctx.db_session.flush()

    speaking_question = SpeakingQuestion(
        part_id=speaking_part.id,
        question_code="part1-q1",
        question_order=1,
        short_label="Hobbies",
        prompt="What do you usually do in your free time?",
        expected_answer_seconds=30,
        rephrase_prompt="Could you tell me about your hobbies?",
        follow_ups=["Why do you enjoy that?"],
        cue_card=None,
    )
    ctx.db_session.add(speaking_question)
    await ctx.db_session.commit()

    reading_exam_resp = await ctx.hit(
        "POST",
        "/api/v1/exams/reading",
        "/api/v1/exams/reading",
        headers=student_headers,
        json={"test_id": read_exam_test.id},
    )
    ctx.ids["reading_exam_id"] = reading_exam_resp.json()["id"]

    await ctx.hit(
        "POST",
        "/api/v1/exams/reading/{exam_id}/start",
        f"/api/v1/exams/reading/{ctx.ids['reading_exam_id']}/start",
        headers=student_headers,
    )
    await ctx.hit(
        "PUT",
        "/api/v1/exams/reading/{exam_id}/draft",
        f"/api/v1/exams/reading/{ctx.ids['reading_exam_id']}/draft",
        headers=student_headers,
        json=[{"id": read_exam_question.id, "value": "answer"}],
    )
    await ctx.hit(
        "POST",
        "/api/v1/exams/reading/{exam_id}/submit",
        f"/api/v1/exams/reading/{ctx.ids['reading_exam_id']}/submit",
        headers=student_headers,
        json=[{"id": read_exam_question.id, "value": "wrong-answer"}],
    )

    listening_exam_resp = await ctx.hit(
        "POST",
        "/api/v1/exams/listening",
        "/api/v1/exams/listening",
        headers=student_headers,
        json={"test_id": listen_exam_test.id},
    )
    ctx.ids["listening_exam_id"] = listening_exam_resp.json()["id"]

    await ctx.hit(
        "POST",
        "/api/v1/exams/listening/{exam_id}/start",
        f"/api/v1/exams/listening/{ctx.ids['listening_exam_id']}/start",
        headers=student_headers,
    )
    await ctx.hit(
        "PUT",
        "/api/v1/exams/listening/{exam_id}/draft",
        f"/api/v1/exams/listening/{ctx.ids['listening_exam_id']}/draft",
        headers=student_headers,
        json=[{"id": listen_exam_question.id, "value": "listen"}],
    )
    await ctx.hit(
        "POST",
        "/api/v1/exams/listening/{exam_id}/submit",
        f"/api/v1/exams/listening/{ctx.ids['listening_exam_id']}/submit",
        headers=student_headers,
        json=[{"id": listen_exam_question.id, "value": "listen"}],
    )

    writing_exam_resp = await ctx.hit(
        "POST",
        "/api/v1/exams/writing",
        "/api/v1/exams/writing",
        headers=student_headers,
        json={"test_id": write_exam_test.id},
    )
    ctx.ids["writing_exam_id"] = writing_exam_resp.json()["id"]

    await ctx.hit(
        "POST",
        "/api/v1/exams/writing/{exam_id}/start",
        f"/api/v1/exams/writing/{ctx.ids['writing_exam_id']}/start",
        headers=student_headers,
    )
    await ctx.hit(
        "PUT",
        "/api/v1/exams/writing/{exam_id}/draft",
        f"/api/v1/exams/writing/{ctx.ids['writing_exam_id']}/draft",
        headers=student_headers,
        json=[{"part_id": write_exam_part.id, "essay": "Draft essay text."}],
    )
    await ctx.hit(
        "POST",
        "/api/v1/exams/writing/{exam_id}/submit",
        f"/api/v1/exams/writing/{ctx.ids['writing_exam_id']}/submit",
        headers=student_headers,
        json=[{"part_id": write_exam_part.id, "essay": "Essay text"}],
    )

    writing_exam_part_id = (
        await ctx.db_session.execute(
            select(WritingExamPart.id).where(WritingExamPart.exam_id == ctx.ids["writing_exam_id"])
        )
    ).scalar_one()
    ctx.ids["writing_exam_part_id"] = int(writing_exam_part_id)

    await ctx.hit(
        "GET",
        "/api/v1/speaking/tests",
        "/api/v1/speaking/tests?limit=20&offset=0",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/speaking/tests/{test_id}",
        f"/api/v1/speaking/tests/{speaking_test.id}",
        headers=student_headers,
    )
    await ctx.hit(
        "POST",
        "/api/v1/speaking/tts",
        "/api/v1/speaking/tts",
        headers=student_headers,
        json={"text": "   "},
        status_code=400,
    )

    speaking_exam_resp = await ctx.hit(
        "POST",
        "/api/v1/exams/speaking",
        "/api/v1/exams/speaking",
        headers=student_headers,
        json={"test_id": speaking_test.id},
    )
    speaking_exam_id = int(speaking_exam_resp.json()["id"])
    ctx.ids["speaking_exam_id"] = speaking_exam_id

    await ctx.hit(
        "POST",
        "/api/v1/exams/speaking/{exam_id}/start",
        f"/api/v1/exams/speaking/{speaking_exam_id}/start",
        headers=student_headers,
    )
    speaking_session_resp = await ctx.hit(
        "GET",
        "/api/v1/exams/speaking/{exam_id}/session",
        f"/api/v1/exams/speaking/{speaking_exam_id}/session",
        headers=student_headers,
    )
    speaking_session = speaking_session_resp.json()
    speaking_session["asked_question_ids"] = [speaking_question.question_code]
    speaking_session["elapsed_seconds"] = 120
    speaking_session["transcript_segments"] = [
        {
            "id": "seg-1",
            "speaker": "examiner",
            "text": "What do you usually do in your free time?",
            "is_final": True,
            "started_at": "2026-01-01T00:00:00Z",
            "ended_at": "2026-01-01T00:00:02Z",
            "part_id": "part1",
            "question_id": speaking_question.question_code,
            "interrupted": False,
            "confidence": 1.0,
            "source": "system",
        },
        {
            "id": "seg-2",
            "speaker": "user",
            "text": "I usually read books and go for evening walks.",
            "is_final": True,
            "started_at": "2026-01-01T00:00:03Z",
            "ended_at": "2026-01-01T00:00:12Z",
            "part_id": "part1",
            "question_id": speaking_question.question_code,
            "interrupted": False,
            "confidence": 0.93,
            "source": "speech-recognition",
        },
    ]
    speaking_session["turns"] = [
        {
            "id": "turn-1",
            "speaker": "user",
            "part_id": "part1",
            "question_id": speaking_question.question_code,
            "started_at": "2026-01-01T00:00:03Z",
            "ended_at": "2026-01-01T00:00:12Z",
            "interrupted": False,
            "transcript_segment_ids": ["seg-2"],
            "status": "completed",
        }
    ]
    speaking_session["current_part_id"] = "part1"
    speaking_session["current_question_index"] = 0

    speaking_session_persisted_resp = await ctx.hit(
        "PUT",
        "/api/v1/exams/speaking/{exam_id}/session",
        f"/api/v1/exams/speaking/{speaking_exam_id}/session",
        headers=student_headers,
        json={"session": speaking_session},
    )
    speaking_session = speaking_session_persisted_resp.json()

    await ctx.hit(
        "POST",
        "/api/v1/exams/speaking/{exam_id}/examiner-decision",
        f"/api/v1/exams/speaking/{speaking_exam_id}/examiner-decision",
        headers=student_headers,
        json={
            "session": speaking_session,
            "evaluation": {
                "action": "follow_up",
                "reason": "answer is relevant but brief",
                "cleaned_transcript": "I usually read books and go for evening walks.",
                "has_real_answer": True,
                "is_echo_leak": False,
                "is_relevant": True,
                "is_short": True,
                "is_incomplete": True,
                "is_rescue_needed": False,
                "is_redirect_needed": False,
                "is_too_long": False,
                "overlap_ratio": 0.0,
                "word_count": 9,
            },
            "metrics": {
                "transcript": "I usually read books and go for evening walks.",
                "word_count": 9,
                "duration_ms": 9000,
                "was_silent": False,
                "was_cut_off": False,
                "follow_ups_used": 0,
                "silence_prompts_used": 0,
            },
        },
    )

    await ctx.hit(
        "POST",
        "/api/v1/exams/speaking/{exam_id}/finalize",
        f"/api/v1/exams/speaking/{speaking_exam_id}/finalize",
        headers=student_headers,
        json={"session": speaking_session},
    )

    assignments_resp = await ctx.hit(
        "GET",
        "/api/v1/assignments",
        "/api/v1/assignments?limit=20&offset=0",
        headers=student_headers,
    )
    assignments_payload = assignments_resp.json()
    assignment_id = int(assignments_payload["items"][0]["id"])
    ctx.ids["assignment_id"] = assignment_id

    await ctx.hit(
        "GET",
        "/api/v1/assignments/{assignment_id}",
        f"/api/v1/assignments/{assignment_id}",
        headers=student_headers,
    )
    await ctx.hit(
        "POST",
        "/api/v1/assignments/{assignment_id}/attempts",
        f"/api/v1/assignments/{assignment_id}/attempts",
        headers=student_headers,
        json={"response_text": "I reviewed the error and completed a focused retry."},
    )

    await ctx.hit(
        "GET",
        "/api/v1/exams/{kind}/{exam_id}/result",
        f"/api/v1/exams/reading/{ctx.ids['reading_exam_id']}/result",
        headers=student_headers,
    )

    await ctx.hit(
        "GET",
        "/api/v1/exams/my-tests",
        "/api/v1/exams/my-tests?limit=20&offset=0",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/exams/my-tests",
        f"/api/v1/exams/my-tests?module=listening&test_id={listen_exam_test.id}&limit=20&offset=0",
        headers=student_headers,
    )

    overall_start_resp = await ctx.hit(
        "POST",
        "/api/v1/exams/overall/start",
        "/api/v1/exams/overall/start",
        headers=student_headers,
    )
    overall_payload = overall_start_resp.json()
    overall_id = int(overall_payload["id"])
    overall_listening_exam_id = int(overall_payload["listening_exam_id"])
    ctx.ids["overall_exam_id"] = overall_id

    overall_listening_exam = (
        await ctx.db_session.execute(
            select(ListeningExam)
            .where(ListeningExam.id == overall_listening_exam_id)
            .options(
                selectinload(ListeningExam.listening_test)
                .selectinload(ListeningTest.parts)
                .selectinload(ListeningPart.question_blocks)
                .selectinload(ListeningQuestionBlock.questions)
                .selectinload(ListeningQuestion.answers),
                selectinload(ListeningExam.listening_test)
                .selectinload(ListeningTest.parts)
                .selectinload(ListeningPart.question_blocks)
                .selectinload(ListeningQuestionBlock.questions)
                .selectinload(ListeningQuestion.options),
            )
        )
    ).scalar_one()
    listening_parts = sorted(list(overall_listening_exam.listening_test.parts), key=lambda part: part.order)
    overall_submit_answers: list[dict[str, object]] = []
    for part in listening_parts:
        listening_blocks = sorted(list(part.question_blocks), key=lambda block: block.order)
        for block in listening_blocks:
            listening_questions = sorted(list(block.questions), key=lambda question: question.order)
            for question in listening_questions:
                answer_value = ""
                if question.answers:
                    answer_value = str(question.answers[0].correct_answers).strip()
                elif question.options:
                    answer_value = str(question.options[0].option_text).strip()
                overall_submit_answers.append({"id": int(question.id), "value": answer_value})

    await ctx.hit(
        "GET",
        "/api/v1/exams/overall/{overall_id}",
        f"/api/v1/exams/overall/{overall_id}",
        headers=student_headers,
    )

    await ctx.hit(
        "POST",
        "/api/v1/exams/listening/{exam_id}/submit",
        f"/api/v1/exams/listening/{overall_listening_exam_id}/submit",
        headers=student_headers,
        json=overall_submit_answers,
    )

    await ctx.hit(
        "POST",
        "/api/v1/exams/overall/{overall_id}/continue",
        f"/api/v1/exams/overall/{overall_id}/continue",
        headers=student_headers,
    )

    await ctx.hit(
        "GET",
        "/api/v1/exams/overall/{overall_id}/result",
        f"/api/v1/exams/overall/{overall_id}/result",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/exams/overall/my-tests",
        "/api/v1/exams/overall/my-tests?limit=20&offset=0",
        headers=student_headers,
    )

    await ctx.hit("GET", "/api/v1/exams/me", "/api/v1/exams/me", headers=student_headers)


async def cover_admin_exam_endpoints(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit("GET", "/api/v1/admin/exams/{kind}", "/api/v1/admin/exams/reading", headers=admin_headers)
    await ctx.hit("GET", "/api/v1/admin/exams/{kind}", "/api/v1/admin/exams/listening", headers=admin_headers)
    await ctx.hit("GET", "/api/v1/admin/exams/{kind}", "/api/v1/admin/exams/writing", headers=admin_headers)

    await ctx.hit(
        "GET",
        "/api/v1/admin/exams/{kind}/{exam_id}",
        f"/api/v1/admin/exams/reading/{ctx.ids['reading_exam_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/admin/exams/{kind}/{exam_id}",
        f"/api/v1/admin/exams/listening/{ctx.ids['listening_exam_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/admin/exams/{kind}/{exam_id}",
        f"/api/v1/admin/exams/writing/{ctx.ids['writing_exam_id']}",
        headers=admin_headers,
    )

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/exams/writing/parts/{exam_part_id}/review",
        f"/api/v1/admin/exams/writing/parts/{ctx.ids['writing_exam_part_id']}/review",
        headers=admin_headers,
        json={"is_checked": True, "corrections": "Good", "score": "7.0"},
    )
