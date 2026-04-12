from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.base import Base
from app.db.models import (
    AiModuleSummary,
    AiSummaryModuleEnum,
    AiSummarySourceEnum,
    AiSummaryStatusEnum,
    Category,
    Lesson,
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionAnswer,
    ListeningQuestionBlock,
    ListeningQuestionOption,
    ListeningTest,
    ProgressTestTypeEnum,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionAnswer,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    RoleEnum,
    SpeakingPart,
    SpeakingQuestion,
    SpeakingTest,
    TeacherStudentLink,
    User,
    UserAnalytics,
    UserProfile,
    UserProgress,
    WritingPart,
    WritingTest,
)
from app.db.session import SessionLocal

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "demo"


def _fixture_path(file_name: str) -> Path:
    path = FIXTURES_DIR / file_name
    if not path.exists():
        raise FileNotFoundError(f"Fixture file not found: {path}")
    return path


def _load_fixture(file_name: str) -> dict[str, Any]:
    path = _fixture_path(file_name)
    with path.open("r", encoding="utf-8") as file:
        payload = yaml.safe_load(file) or {}
    if not isinstance(payload, dict):
        raise ValueError(f"Fixture payload must be object: {path}")
    return payload


def _to_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        normalized = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _to_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _to_decimal(value: Any, default: str = "0.0") -> Decimal:
    if value is None:
        return Decimal(default)
    return Decimal(str(value))


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _normalize_email(value: Any) -> str:
    return str(value).strip().lower()


def _require_user(users_by_email: dict[str, User], email: Any, section: str) -> User:
    normalized = _normalize_email(email)
    user = users_by_email.get(normalized)
    if user is None:
        raise ValueError(f"Unknown user email in {section} fixture: {normalized}")
    return user


def _ensure_list(payload: dict[str, Any], key: str, file_name: str) -> list[dict[str, Any]]:
    raw = payload.get(key, [])
    if not isinstance(raw, list):
        raise ValueError(f"Fixture '{file_name}' key '{key}' must be a list")
    return raw


async def clear_database(db: AsyncSession) -> None:
    dialect = db.bind.dialect.name if db.bind is not None else ""

    if dialect == "postgresql":
        table_names = [table.name for table in Base.metadata.sorted_tables]
        if table_names:
            joined_names = ", ".join(f'"{name}"' for name in table_names)
            await db.execute(text(f"TRUNCATE TABLE {joined_names} RESTART IDENTITY CASCADE"))
        return

    for table in reversed(Base.metadata.sorted_tables):
        await db.execute(delete(table))

    if dialect == "sqlite":
        try:
            await db.execute(text("DELETE FROM sqlite_sequence"))
        except Exception:
            pass


async def seed_roles_and_users(db: AsyncSession) -> dict[str, User]:
    payload = _load_fixture("users.yaml")
    users = _ensure_list(payload, "users", "users.yaml")

    if len(users) > 3:
        raise ValueError("Demo fixtures support maximum of 3 users: admin, teacher, student.")

    users_by_email: dict[str, User] = {}
    for raw_user in users:
        email = _normalize_email(raw_user["email"])
        if email in users_by_email:
            raise ValueError(f"Duplicate user email in users.yaml: {email}")

        user = User(
            email=email,
            password_hash=hash_password(str(raw_user["password"])),
            first_name=str(raw_user["first_name"]),
            last_name=str(raw_user["last_name"]),
            role=RoleEnum(str(raw_user["role"])),
            is_active=True,
            verified_at=datetime.now(UTC),
        )
        db.add(user)
        users_by_email[email] = user

    await db.flush()
    return users_by_email


async def seed_profiles_and_analytics(db: AsyncSession, users_by_email: dict[str, User]) -> None:
    payload = _load_fixture("profiles.yaml")
    profiles = _ensure_list(payload, "profiles", "profiles.yaml")
    analytics = _ensure_list(payload, "analytics", "profiles.yaml")

    for row in profiles:
        user = _require_user(users_by_email, row["email"], "profiles")
        db.add(
            UserProfile(
                user_id=user.id,
                date_of_birth=_to_date(row.get("date_of_birth")),
                country=str(row.get("country") or ""),
                native_language=str(row.get("native_language") or ""),
                target_band_score=_to_decimal(row.get("target_band_score"), default="6.0"),
            )
        )

    for row in analytics:
        user = _require_user(users_by_email, row["email"], "analytics")
        db.add(
            UserAnalytics(
                user_id=user.id,
                total_tests_taken=int(row.get("total_tests_taken") or 0),
                average_band_score=_to_decimal(row.get("average_band_score")),
                best_band_score=_to_decimal(row.get("best_band_score")),
                total_study_time_seconds=int(row.get("total_study_time_seconds") or 0),
                last_test_date=_to_datetime(row.get("last_test_date")),
            )
        )


async def seed_progress(db: AsyncSession, users_by_email: dict[str, User]) -> None:
    payload = _load_fixture("progress.yaml")
    entries = _ensure_list(payload, "progress_entries", "progress.yaml")

    for row in entries:
        user = _require_user(users_by_email, row["email"], "progress_entries")
        test_date = _to_datetime(row.get("test_date"))
        if test_date is None:
            raise ValueError("progress_entries.test_date is required")

        db.add(
            UserProgress(
                user_id=user.id,
                test_date=test_date,
                test_type=ProgressTestTypeEnum(str(row["test_type"])),
                band_score=_to_decimal(row.get("band_score"), default="0.0"),
                correct_answers=row.get("correct_answers"),
                total_questions=row.get("total_questions"),
                time_taken_seconds=row.get("time_taken_seconds"),
            )
        )


async def seed_teacher_student_links(db: AsyncSession, users_by_email: dict[str, User]) -> None:
    payload = _load_fixture("teacher_students.yaml")
    links = _ensure_list(payload, "links", "teacher_students.yaml")

    for row in links:
        teacher = _require_user(users_by_email, row["teacher_email"], "teacher_students.links")
        student = _require_user(users_by_email, row["student_email"], "teacher_students.links")
        db.add(
            TeacherStudentLink(
                teacher_id=teacher.id,
                student_id=student.id,
            )
        )


async def seed_ai_summaries(db: AsyncSession, users_by_email: dict[str, User]) -> None:
    payload = _load_fixture("ai_summaries.yaml")
    summaries = _ensure_list(payload, "summaries", "ai_summaries.yaml")

    for row in summaries:
        user = _require_user(users_by_email, row["email"], "ai_summaries.summaries")

        trigger_user_id = None
        trigger_email = row.get("trigger_email")
        if trigger_email:
            trigger_user_id = _require_user(
                users_by_email,
                trigger_email,
                "ai_summaries.summaries",
            ).id

        db.add(
            AiModuleSummary(
                user_id=user.id,
                module=AiSummaryModuleEnum(str(row["module"])),
                source=AiSummarySourceEnum(str(row.get("source") or "manual")),
                status=AiSummaryStatusEnum(str(row.get("status") or "pending")),
                lang=str(row.get("lang") or "en"),
                attempts_limit=int(row.get("attempts_limit") or 10),
                exam_id=row.get("exam_id"),
                trigger_user_id=trigger_user_id,
                started_at=_to_datetime(row.get("started_at")),
                finished_at=_to_datetime(row.get("finished_at")),
                stream_text=row.get("stream_text"),
                result_json=row.get("result_json"),
                result_text=row.get("result_text"),
                error_text=row.get("error_text"),
            )
        )


async def seed_lessons(db: AsyncSession) -> None:
    payload = _load_fixture("lessons.yaml")
    categories = _ensure_list(payload, "categories", "lessons.yaml")

    for row in categories:
        category = Category(
            title=str(row["title"]),
            slug=str(row["slug"]),
        )
        db.add(category)
        await db.flush()

        lessons = row.get("lessons", [])
        if not isinstance(lessons, list):
            raise ValueError("Fixture 'lessons.yaml' key 'lessons' must be a list")

        for lesson_row in lessons:
            db.add(
                Lesson(
                    category_id=category.id,
                    title=str(lesson_row["title"]),
                    video_link=str(lesson_row["video_link"]),
                )
            )


def _count_reading_questions(test_payload: dict[str, Any]) -> int:
    return sum(
        len(block.get("questions", []))
        for passage in test_payload.get("passages", [])
        for block in passage.get("blocks", [])
    )


def _count_listening_questions(test_payload: dict[str, Any]) -> int:
    return sum(
        len(block.get("questions", []))
        for part in test_payload.get("parts", [])
        for block in part.get("blocks", [])
    )


async def seed_reading_tests(db: AsyncSession) -> None:
    payload = _load_fixture("reading_tests.yaml")
    tests = _ensure_list(payload, "tests", "reading_tests.yaml")

    for test_row in tests:
        reading_test = ReadingTest(
            title=str(test_row["title"]),
            description=str(test_row["description"]),
            time_limit=int(test_row["time_limit"]),
            total_questions=_count_reading_questions(test_row),
            is_active=bool(test_row.get("is_active", True)),
        )
        db.add(reading_test)
        await db.flush()

        passages = test_row.get("passages", [])
        if not isinstance(passages, list):
            raise ValueError("Fixture 'reading_tests.yaml' key 'passages' must be a list")

        for passage_row in passages:
            passage = ReadingPassage(
                test_id=reading_test.id,
                title=str(passage_row["title"]),
                content=str(passage_row["content"]),
                passage_number=int(passage_row["passage_number"]),
            )
            db.add(passage)
            await db.flush()

            blocks = passage_row.get("blocks", [])
            if not isinstance(blocks, list):
                raise ValueError("Fixture 'reading_tests.yaml' key 'blocks' must be a list")

            for block_row in blocks:
                list_of_headings = block_row.get("list_of_headings")
                if isinstance(list_of_headings, list):
                    list_of_headings = "\n".join(str(item) for item in list_of_headings)

                block = ReadingQuestionBlock(
                    passage_id=passage.id,
                    title=str(block_row["title"]),
                    description=str(block_row["description"]),
                    block_type=str(block_row["block_type"]),
                    order=int(block_row["order"]),
                    question_heading=block_row.get("question_heading"),
                    list_of_headings=list_of_headings,
                    table_completion=block_row.get("table_completion"),
                    table_json=block_row.get("table_json"),
                    flow_chart_completion=block_row.get("flow_chart_completion"),
                )
                db.add(block)
                await db.flush()

                questions = block_row.get("questions", [])
                if not isinstance(questions, list):
                    raise ValueError("Fixture 'reading_tests.yaml' key 'questions' must be a list")

                for question_row in questions:
                    question = ReadingQuestion(
                        question_block_id=block.id,
                        question_text=str(question_row["question_text"]),
                        order=int(question_row["order"]),
                    )
                    db.add(question)
                    await db.flush()

                    for index, option_row in enumerate(_as_list(question_row.get("options")), start=1):
                        db.add(
                            ReadingQuestionOption(
                                question_id=question.id,
                                option_text=str(option_row["option_text"]),
                                is_correct=bool(option_row.get("is_correct", False)),
                                order=int(option_row.get("order") or index),
                            )
                        )

                    for answer in _as_list(question_row.get("answers")):
                        db.add(
                            ReadingQuestionAnswer(
                                question_id=question.id,
                                correct_answers=str(answer),
                            )
                        )


async def seed_listening_tests(db: AsyncSession) -> None:
    payload = _load_fixture("listening_tests.yaml")
    tests = _ensure_list(payload, "tests", "listening_tests.yaml")

    for test_row in tests:
        listening_test = ListeningTest(
            title=str(test_row["title"]),
            description=str(test_row["description"]),
            time_limit=int(test_row["time_limit"]),
            total_questions=_count_listening_questions(test_row),
            is_active=bool(test_row.get("is_active", True)),
            voice_url=test_row.get("voice_url"),
        )
        db.add(listening_test)
        await db.flush()

        parts = test_row.get("parts", [])
        if not isinstance(parts, list):
            raise ValueError("Fixture 'listening_tests.yaml' key 'parts' must be a list")

        for part_row in parts:
            part = ListeningPart(
                test_id=listening_test.id,
                title=str(part_row["title"]),
                order=int(part_row["order"]),
            )
            db.add(part)
            await db.flush()

            blocks = part_row.get("blocks", [])
            if not isinstance(blocks, list):
                raise ValueError("Fixture 'listening_tests.yaml' key 'blocks' must be a list")

            for block_row in blocks:
                block = ListeningQuestionBlock(
                    part_id=part.id,
                    title=str(block_row["title"]),
                    description=str(block_row["description"]),
                    block_type=str(block_row["block_type"]),
                    order=int(block_row["order"]),
                    table_completion=block_row.get("table_completion"),
                    table_json=block_row.get("table_json"),
                )
                db.add(block)
                await db.flush()

                questions = block_row.get("questions", [])
                if not isinstance(questions, list):
                    raise ValueError("Fixture 'listening_tests.yaml' key 'questions' must be a list")

                for question_row in questions:
                    question = ListeningQuestion(
                        question_block_id=block.id,
                        question_text=str(question_row["question_text"]),
                        order=int(question_row["order"]),
                    )
                    db.add(question)
                    await db.flush()

                    for index, option_row in enumerate(_as_list(question_row.get("options")), start=1):
                        db.add(
                            ListeningQuestionOption(
                                question_id=question.id,
                                option_text=str(option_row["option_text"]),
                                is_correct=bool(option_row.get("is_correct", False)),
                                order=int(option_row.get("order") or index),
                            )
                        )

                    for answer in _as_list(question_row.get("answers")):
                        db.add(
                            ListeningQuestionAnswer(
                                question_id=question.id,
                                correct_answers=str(answer),
                            )
                        )


async def seed_writing_tests(db: AsyncSession) -> None:
    payload = _load_fixture("writing_tests.yaml")
    tests = _ensure_list(payload, "tests", "writing_tests.yaml")

    for test_row in tests:
        writing_test = WritingTest(
            title=str(test_row["title"]),
            description=str(test_row["description"]),
            time_limit=int(test_row["time_limit"]),
            is_active=bool(test_row.get("is_active", True)),
        )
        db.add(writing_test)
        await db.flush()

        parts = test_row.get("parts", [])
        if not isinstance(parts, list):
            raise ValueError("Fixture 'writing_tests.yaml' key 'parts' must be a list")

        for part_row in parts:
            db.add(
                WritingPart(
                    test_id=writing_test.id,
                    order=int(part_row["order"]),
                    task=str(part_row["task"]),
                    image_url=part_row.get("image_url"),
                    file_urls=[str(url) for url in _as_list(part_row.get("file_urls"))],
                )
            )


async def seed_speaking_tests(db: AsyncSession) -> None:
    payload = _load_fixture("speaking_tests.yaml")
    tests = _ensure_list(payload, "tests", "speaking_tests.yaml")

    for test_row in tests:
        speaking_test = SpeakingTest(
            slug=str(test_row["slug"]),
            title=str(test_row["title"]),
            description=str(test_row["description"]),
            level=str(test_row["level"]),
            duration_minutes=int(test_row["duration_minutes"]),
            instructions=[str(item) for item in _as_list(test_row.get("instructions"))],
            scoring_focus=[str(item) for item in _as_list(test_row.get("scoring_focus"))],
            is_active=bool(test_row.get("is_active", True)),
        )
        db.add(speaking_test)
        await db.flush()

        parts = test_row.get("parts", [])
        if not isinstance(parts, list):
            raise ValueError("Fixture 'speaking_tests.yaml' key 'parts' must be a list")

        for part_row in parts:
            part = SpeakingPart(
                test_id=speaking_test.id,
                part_id=str(part_row["part_id"]),
                part_order=int(part_row["order"]),
                title=str(part_row["title"]),
                examiner_guidance=str(part_row["examiner_guidance"]),
                duration_minutes=int(part_row["duration_minutes"]),
            )
            db.add(part)
            await db.flush()

            questions = part_row.get("questions", [])
            if not isinstance(questions, list):
                raise ValueError("Fixture 'speaking_tests.yaml' key 'questions' must be a list")

            for question_row in questions:
                db.add(
                    SpeakingQuestion(
                        part_id=part.id,
                        question_code=str(question_row["question_code"]),
                        question_order=int(question_row["order"]),
                        short_label=str(question_row["short_label"]),
                        prompt=str(question_row["prompt"]),
                        expected_answer_seconds=int(question_row["expected_answer_seconds"]),
                        rephrase_prompt=question_row.get("rephrase_prompt"),
                        follow_ups=[str(item) for item in _as_list(question_row.get("follow_ups"))],
                        cue_card=question_row.get("cue_card"),
                    )
                )


async def seed_exam_content(db: AsyncSession) -> None:
    await seed_reading_tests(db)
    await seed_listening_tests(db)
    await seed_writing_tests(db)
    await seed_speaking_tests(db)


async def main() -> None:
    async with SessionLocal() as db:
        try:
            await clear_database(db)
            users_by_email = await seed_roles_and_users(db)
            await seed_profiles_and_analytics(db, users_by_email)
            await seed_progress(db, users_by_email)
            await seed_teacher_student_links(db, users_by_email)
            await seed_ai_summaries(db, users_by_email)
            await seed_lessons(db)
            await seed_exam_content(db)
            await db.commit()
        except Exception:
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
