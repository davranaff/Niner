from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.pagination import CursorPage, serialize_page
from app.db.models import User, WritingTest
from app.modules.writing import repository
from app.modules.writing.schemas import WritingTestListItem


def _serialize_writing_part(part: Any) -> dict[str, Any]:
    file_urls = list(part.file_urls or [])
    image_urls = [part.image_url] if part.image_url else []
    return {
        "id": part.id,
        "order": part.order,
        "task": part.task,
        "image_url": part.image_url,
        "file_urls": file_urls,
        "test_id": part.test_id,
        "prompt": {
            "text": part.task,
            "image_urls": image_urls,
            "file_urls": file_urls,
        },
        "answer_spec": {
            "answer_type": "text_input",
            "input_variant": "essay",
        },
    }


def serialize_writing_test_detail(test: WritingTest) -> dict[str, Any]:
    parts = [_serialize_writing_part(part) for part in sorted(test.writing_parts, key=lambda x: x.order)]
    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "time_limit": test.time_limit,
        "created_at": test.created_at,
        "parts": parts,
        # Backward-compatible alias for older clients.
        "writing_parts": parts,
    }


async def list_writing_tests(db: AsyncSession, user: User, offset: int, limit: int) -> CursorPage:
    rows = await repository.list_active_tests(db, offset=offset, limit=limit)
    stats_by_test_id = await repository.get_attempt_stats_by_test_ids(
        db,
        user_id=user.id,
        test_ids=[row.id for row in rows],
    )
    return serialize_page(
        rows,
        serializer=lambda row: WritingTestListItem(
            id=row.id,
            title=row.title,
            description=row.description,
            time_limit=row.time_limit,
            is_active=row.is_active,
            created_at=row.created_at,
            attempts_count=stats_by_test_id.get(row.id, {}).get("attempts_count", 0),
            successful_attempts_count=stats_by_test_id.get(row.id, {}).get(
                "successful_attempts_count",
                0,
            ),
            failed_attempts_count=stats_by_test_id.get(row.id, {}).get(
                "failed_attempts_count",
                0,
            ),
        ).model_dump(),
        limit=limit,
        offset=offset,
    )


async def get_writing_test_detail(db: AsyncSession, test_id: int) -> dict[str, Any]:
    test = await repository.get_test_detail(db, test_id)
    if test is None:
        raise ApiError(code="writing_test_not_found", message="Writing test not found", status_code=404)
    return serialize_writing_test_detail(test)
