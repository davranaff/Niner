from __future__ import annotations

from sqlalchemy import select

from app.db.models import (
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
        "POST",
        "/api/v1/exams/reading/{exam_id}/submit",
        f"/api/v1/exams/reading/{ctx.ids['reading_exam_id']}/submit",
        headers=student_headers,
        json=[{"id": read_exam_question.id, "value": "answer"}],
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
        json=[{"id": listen_exam_question.id, "value": "listen"}],
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
