from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from arq import Retry
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.db.models import (
    AssignmentStatusEnum,
    AiModuleSummary,
    AiSummaryModuleEnum,
    AiSummarySourceEnum,
    AiSummaryStatusEnum,
    FinishReasonEnum,
    ParseStatusEnum,
    ProgressTestTypeEnum,
    ReadingExam,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingTest,
    RoleEnum,
    TrainingAssignment,
    User,
    UserAnalytics,
    UserProgress,
    WritingExam,
    WritingExamPart,
    WritingPart,
    WritingTest,
)
from app.db.session import SessionLocal
from app.workers import tasks


async def _create_user(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123"),
        first_name="Worker",
        last_name="Tester",
        role=RoleEnum.student,
        is_active=True,
        verified_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_table_parse_pending_to_done(db_session, monkeypatch):
    test = ReadingTest(title="RT", description="D", time_limit=3600, total_questions=0, is_active=True)
    db_session.add(test)
    await db_session.flush()

    passage = ReadingPassage(test_id=test.id, title="P", content="C", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="B",
        description="D",
        block_type="table_completion",
        order=1,
        table_completion="<table></table>",
        parse_status=ParseStatusEnum.pending,
    )
    db_session.add(block)
    await db_session.commit()

    async def fake_parse(content: str) -> dict:
        return {"header": ["A"], "rows": [["B"]]}

    monkeypatch.setattr(tasks, "_parse_table_to_json", fake_parse)
    await tasks.parse_table_completion({"job_try": 1}, "reading", block.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(ReadingQuestionBlock, block.id)
        assert refreshed is not None
        assert refreshed.parse_status == ParseStatusEnum.done
        assert refreshed.table_json == {"header": ["A"], "rows": [["B"]]}


@pytest.mark.asyncio
async def test_table_parse_failed_with_retries(db_session, monkeypatch):
    test = ReadingTest(title="RT2", description="D", time_limit=3600, total_questions=0, is_active=True)
    db_session.add(test)
    await db_session.flush()

    passage = ReadingPassage(test_id=test.id, title="P2", content="C2", passage_number=1)
    db_session.add(passage)
    await db_session.flush()

    block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="B2",
        description="D2",
        block_type="table_completion",
        order=1,
        table_completion="bad",
        parse_status=ParseStatusEnum.pending,
    )
    db_session.add(block)
    await db_session.commit()

    async def fail_parse(content: str) -> dict:
        raise RuntimeError("parse error")

    monkeypatch.setattr(tasks, "_parse_table_to_json", fail_parse)

    with pytest.raises(Retry):
        await tasks.parse_table_completion({"job_try": 1}, "reading", block.id)

    await tasks.parse_table_completion({"job_try": 3}, "reading", block.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(ReadingQuestionBlock, block.id)
        assert refreshed is not None
        assert refreshed.parse_status == ParseStatusEnum.failed
        assert "parse error" in (refreshed.parse_error or "")


@pytest.mark.asyncio
async def test_writing_ai_evaluation_pending_to_done(db_session, monkeypatch):
    user = await _create_user(db_session, "worker-ai-done@example.com")

    writing_test = WritingTest(title="WT", description="Desc", time_limit=3600, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    writing_part = WritingPart(test_id=writing_test.id, order=1, task="Discuss both views and give your opinion.")
    db_session.add(writing_part)
    await db_session.flush()

    writing_exam = WritingExam(user_id=user.id, writing_test_id=writing_test.id)
    db_session.add(writing_exam)
    await db_session.flush()

    exam_part = WritingExamPart(exam_id=writing_exam.id, part_id=writing_part.id, essay="This is my essay")
    db_session.add(exam_part)
    await db_session.commit()

    async def fake_eval(task_prompt: str, essay: str) -> dict:
        assert task_prompt
        assert essay
        return {
            "overall_band": 6.5,
            "summary": "Good response with clear structure.",
            "criteria": {
                "task_response": {"band": 6.5, "reason": "Addresses all parts of the question."},
                "coherence_cohesion": {"band": 6.5, "reason": "Logical flow with minor linking issues."},
                "lexical_resource": {"band": 6.0, "reason": "Adequate range with repetition."},
                "grammar_accuracy": {"band": 6.5, "reason": "Mostly accurate grammar with minor errors."},
            },
            "strengths": ["Clear opinion", "Relevant examples"],
            "improvements": ["Use wider vocabulary", "Improve sentence variety"],
        }

    monkeypatch.setattr(tasks, "_evaluate_writing_essay", fake_eval)
    await tasks.evaluate_writing_exam_part({"job_try": 1}, exam_part.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(WritingExamPart, exam_part.id)
        assert refreshed is not None
        assert refreshed.score == Decimal("6.5")
        assert refreshed.is_checked is False
        assert "Estimated IELTS Writing band" in (refreshed.corrections or "")
        assert "Criteria breakdown" in (refreshed.corrections or "")


@pytest.mark.asyncio
async def test_writing_ai_evaluation_failed_with_retries(db_session, monkeypatch):
    user = await _create_user(db_session, "worker-ai-fail@example.com")

    writing_test = WritingTest(title="WT2", description="Desc", time_limit=3600, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    writing_part = WritingPart(test_id=writing_test.id, order=1, task="Describe the chart.")
    db_session.add(writing_part)
    await db_session.flush()

    writing_exam = WritingExam(user_id=user.id, writing_test_id=writing_test.id)
    db_session.add(writing_exam)
    await db_session.flush()

    exam_part = WritingExamPart(exam_id=writing_exam.id, part_id=writing_part.id, essay="Essay content")
    db_session.add(exam_part)
    await db_session.commit()

    async def fail_eval(task_prompt: str, essay: str) -> dict:
        raise RuntimeError("evaluation error")

    monkeypatch.setattr(tasks, "_evaluate_writing_essay", fail_eval)

    with pytest.raises(Retry):
        await tasks.evaluate_writing_exam_part({"job_try": 1}, exam_part.id)

    await tasks.evaluate_writing_exam_part({"job_try": 3}, exam_part.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(WritingExamPart, exam_part.id)
        assert refreshed is not None
        assert refreshed.score is None
        assert "failed after retries" in (refreshed.corrections or "")


@pytest.mark.asyncio
async def test_writing_ai_evaluation_syncs_progress_and_assignments_after_final_score(
    db_session,
    monkeypatch,
):
    user = await _create_user(db_session, "worker-ai-sync@example.com")

    writing_test = WritingTest(title="WT3", description="Desc", time_limit=3600, is_active=True)
    db_session.add(writing_test)
    await db_session.flush()

    part_1 = WritingPart(test_id=writing_test.id, order=1, task="Describe the chart.")
    part_2 = WritingPart(test_id=writing_test.id, order=2, task="Discuss both views and give your opinion.")
    db_session.add_all([part_1, part_2])
    await db_session.flush()

    started_at = datetime.now(UTC) - timedelta(minutes=58)
    finished_at = datetime.now(UTC)
    writing_exam = WritingExam(
        user_id=user.id,
        writing_test_id=writing_test.id,
        started_at=started_at,
        finished_at=finished_at,
        finish_reason=FinishReasonEnum.completed,
    )
    db_session.add(writing_exam)
    await db_session.flush()

    exam_part_1 = WritingExamPart(
        exam_id=writing_exam.id,
        part_id=part_1.id,
        essay=" ".join(["overview"] * 170),
    )
    exam_part_2 = WritingExamPart(
        exam_id=writing_exam.id,
        part_id=part_2.id,
        essay=" ".join(["argument"] * 260),
    )
    db_session.add_all([exam_part_1, exam_part_2])
    await db_session.commit()

    evaluations = iter(
        [
            {
                "overall_band": 6.0,
                "summary": "Part 1 response is understandable but limited.",
                "criteria": {
                    "task_response": {"band": 6.0, "reason": "Key features covered."},
                    "coherence_cohesion": {"band": 6.0, "reason": "Clear but basic progression."},
                    "lexical_resource": {"band": 5.5, "reason": "Limited variation."},
                    "grammar_accuracy": {"band": 6.0, "reason": "Mostly controlled grammar."},
                },
            },
            {
                "overall_band": 5.5,
                "summary": "Part 2 needs stronger development and precision.",
                "criteria": {
                    "task_response": {"band": 5.5, "reason": "Position is underdeveloped."},
                    "coherence_cohesion": {"band": 5.5, "reason": "Ideas not fully extended."},
                    "lexical_resource": {"band": 5.5, "reason": "Repetition limits clarity."},
                    "grammar_accuracy": {"band": 5.5, "reason": "Frequent sentence-level issues."},
                },
            },
        ]
    )

    async def fake_eval(task_prompt: str, essay: str) -> dict:
        _ = task_prompt
        _ = essay
        return next(evaluations)

    monkeypatch.setattr(tasks, "_evaluate_writing_essay", fake_eval)

    await tasks.evaluate_writing_exam_part({"job_try": 1}, exam_part_1.id)

    async with SessionLocal() as verify_db:
        progress_rows = (
            await verify_db.execute(
                select(UserProgress).where(
                    UserProgress.user_id == user.id,
                    UserProgress.test_type == ProgressTestTypeEnum.writing,
                )
            )
        ).scalars()
        assert list(progress_rows) == []

    await tasks.evaluate_writing_exam_part({"job_try": 1}, exam_part_2.id)

    async with SessionLocal() as verify_db:
        progress_rows = (
            await verify_db.execute(
                select(UserProgress).where(
                    UserProgress.user_id == user.id,
                    UserProgress.test_type == ProgressTestTypeEnum.writing,
                )
            )
        ).scalars()
        progress_items = list(progress_rows)
        assert len(progress_items) == 1
        assert progress_items[0].band_score == Decimal("5.5")
        assert progress_items[0].test_date.replace(tzinfo=UTC) == finished_at

        analytics = (
            await verify_db.execute(select(UserAnalytics).where(UserAnalytics.user_id == user.id))
        ).scalar_one_or_none()
        assert analytics is not None
        assert int(analytics.total_tests_taken) == 1
        assert analytics.best_band_score == Decimal("5.5")

        assignments = (
            await verify_db.execute(
                select(TrainingAssignment).where(
                    TrainingAssignment.user_id == user.id,
                    TrainingAssignment.source_exam_kind == "writing",
                    TrainingAssignment.source_exam_id == writing_exam.id,
                )
            )
        ).scalars()
        assignment_items = list(assignments)
        assert len(assignment_items) >= 2
        assert all(item.task_type == "writing_revision" for item in assignment_items)


@pytest.mark.asyncio
async def test_assignment_generation_worker_creates_reading_test(db_session):
    user = await _create_user(db_session, "worker-generated-reading@example.com")

    reading_test = ReadingTest(
        title="Reading Source",
        description="Desc",
        time_limit=3600,
        total_questions=0,
        is_active=True,
    )
    donor_test = ReadingTest(
        title="Reading Donor",
        description="Donor",
        time_limit=3600,
        total_questions=0,
        is_active=True,
    )
    db_session.add_all([reading_test, donor_test])
    await db_session.flush()

    passage = ReadingPassage(test_id=reading_test.id, title="P1", content="Text", passage_number=1)
    donor_passage = ReadingPassage(test_id=donor_test.id, title="PD", content="Donor text", passage_number=1)
    db_session.add_all([passage, donor_passage])
    await db_session.flush()

    weak_block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Table",
        description="Use one word only",
        block_type="table_completion",
        order=1,
        table_completion="A | B",
        parse_status=ParseStatusEnum.done,
    )
    irrelevant_block = ReadingQuestionBlock(
        passage_id=passage.id,
        title="Multiple choice",
        description="Choose one answer",
        block_type="multiple_choice",
        order=2,
        parse_status=ParseStatusEnum.done,
    )
    donor_block = ReadingQuestionBlock(
        passage_id=donor_passage.id,
        title="Donor Table",
        description="Use one word only",
        block_type="table_completion",
        order=1,
        table_completion="X | Y",
        parse_status=ParseStatusEnum.done,
    )
    db_session.add_all([weak_block, irrelevant_block, donor_block])
    await db_session.flush()

    source_questions: list[ReadingQuestion] = []
    for order, text in enumerate(
        [
            "weak-source-1",
            "weak-source-2",
            "weak-source-3",
            "weak-source-extra-4",
            "weak-source-extra-5",
        ],
        start=1,
    ):
        question = ReadingQuestion(question_block_id=weak_block.id, question_text=text, order=order)
        db_session.add(question)
        await db_session.flush()
        db_session.add(ReadingQuestionAnswer(question_id=question.id, correct_answers=f"answer-{order}"))
        source_questions.append(question)

    for order in range(1, 4):
        question = ReadingQuestion(
            question_block_id=irrelevant_block.id,
            question_text=f"irrelevant-{order}",
            order=order,
        )
        db_session.add(question)
        await db_session.flush()
        db_session.add(ReadingQuestionAnswer(question_id=question.id, correct_answers=f"skip-{order}"))

    donor_questions: list[ReadingQuestion] = []
    for order in range(1, 8):
        question = ReadingQuestion(
            question_block_id=donor_block.id,
            question_text=f"weak-donor-{order}",
            order=order,
        )
        db_session.add(question)
        await db_session.flush()
        db_session.add(ReadingQuestionAnswer(question_id=question.id, correct_answers=f"donor-{order}"))
        donor_questions.append(question)
    await db_session.flush()

    exam = ReadingExam(
        user_id=user.id,
        reading_test_id=reading_test.id,
        started_at=datetime.now(UTC) - timedelta(minutes=15),
        finished_at=datetime.now(UTC),
        finish_reason=FinishReasonEnum.completed,
    )
    db_session.add(exam)
    await db_session.flush()

    assignment = TrainingAssignment(
        user_id=user.id,
        module=ProgressTestTypeEnum.reading,
        source_exam_kind="reading",
        source_exam_id=exam.id,
        dedupe_key="reading:generated:worker",
        task_type="objective_retry",
        title="Reading drill",
        instructions="Practice the weak area.",
        payload={
            "skill_key": "reading:table_completion",
            "block_type": "table_completion",
            "target_question_count": 10,
            "source_question_ids": [question.id for question in source_questions[:3]],
        },
        status=AssignmentStatusEnum.recommended,
        recommended_at=datetime.now(UTC),
    )
    db_session.add(assignment)
    await db_session.commit()

    await tasks.generate_assignment_test({"job_try": 1}, assignment.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(TrainingAssignment, assignment.id)
        assert refreshed is not None
        assert refreshed.generation_status == "ready"
        assert refreshed.generated_test_id is not None
        assert int(refreshed.generation_progress) == 100

        generated_test = (
            await verify_db.execute(
                select(ReadingTest)
                .where(ReadingTest.id == refreshed.generated_test_id)
                .options(
                    selectinload(ReadingTest.passages)
                    .selectinload(ReadingPassage.question_blocks)
                    .selectinload(ReadingQuestionBlock.questions)
                )
            )
        ).scalar_one()
        assert generated_test is not None
        assert generated_test.title.startswith("Weak-area Reading Drill")
        assert int(generated_test.total_questions) == 10

        generated_blocks = [
            block
            for passage in sorted(generated_test.passages, key=lambda item: item.passage_number)
            for block in sorted(passage.question_blocks, key=lambda item: item.order)
        ]
        assert generated_blocks
        assert {block.block_type for block in generated_blocks} == {"table_completion"}

        generated_texts = [
            question.question_text
            for block in generated_blocks
            for question in sorted(block.questions, key=lambda item: item.order)
        ]
        assert generated_texts[:5] == [question.question_text for question in source_questions]
        assert generated_texts[5:] == [question.question_text for question in donor_questions[:5]]
        assert all(not text.startswith("irrelevant-") for text in generated_texts)


@pytest.mark.asyncio
async def test_ai_summary_worker_pending_to_done(db_session, monkeypatch):
    user = await _create_user(db_session, "worker-summary-done@example.com")
    row = AiModuleSummary(
        user_id=user.id,
        module=AiSummaryModuleEnum.reading,
        source=AiSummarySourceEnum.manual,
        status=AiSummaryStatusEnum.pending,
        lang="en",
        attempts_limit=10,
    )
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)

    async def fake_build(*args, **kwargs):
        on_token = kwargs["on_token"]
        await on_token("token-a ")
        await on_token("token-b")
        return {
            "timing_analysis": {"overtime_seconds": 0},
            "accuracy_analysis": {},
            "mistake_hotspots": [],
            "grammar_focus": [],
            "topic_focus": [],
            "improvement": {"trend": "stable"},
            "action_plan": ["step"],
            "summary_text": "token-a token-b",
        }

    monkeypatch.setattr(tasks, "build_module_summary", fake_build)
    await tasks.generate_module_summary({"job_try": 1}, row.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(AiModuleSummary, row.id)
        assert refreshed is not None
        assert refreshed.status == AiSummaryStatusEnum.done
        assert refreshed.stream_text == "token-a token-b"
        assert refreshed.result_json is not None
        assert refreshed.result_text == "token-a token-b"


@pytest.mark.asyncio
async def test_ai_summary_worker_failed_with_retries(db_session, monkeypatch):
    user = await _create_user(db_session, "worker-summary-fail@example.com")
    row = AiModuleSummary(
        user_id=user.id,
        module=AiSummaryModuleEnum.writing,
        source=AiSummarySourceEnum.manual,
        status=AiSummaryStatusEnum.pending,
        lang="en",
        attempts_limit=10,
    )
    db_session.add(row)
    await db_session.commit()
    await db_session.refresh(row)

    async def fail_build(*args, **kwargs):
        raise RuntimeError("summary generation error")

    monkeypatch.setattr(tasks, "build_module_summary", fail_build)

    with pytest.raises(Retry):
        await tasks.generate_module_summary({"job_try": 1}, row.id)

    await tasks.generate_module_summary({"job_try": 3}, row.id)

    async with SessionLocal() as verify_db:
        refreshed = await verify_db.get(AiModuleSummary, row.id)
        assert refreshed is not None
        assert refreshed.status == AiSummaryStatusEnum.failed
        assert "summary generation error" in str(refreshed.error_text)
