from __future__ import annotations

from ..context import CoverageContext
from .listening import cover_admin_listening_crud, cover_admin_listening_delete
from .public import cover_public_catalog_and_lessons
from .reading import cover_admin_reading_crud, cover_admin_reading_delete
from .writing_lessons import (
    cover_admin_writing_and_lessons_crud,
    cover_admin_writing_and_lessons_delete,
)


async def cover_admin_content_crud(ctx: CoverageContext) -> None:
    await cover_admin_reading_crud(ctx)
    await cover_admin_listening_crud(ctx)
    await cover_admin_writing_and_lessons_crud(ctx)


async def cover_admin_delete_endpoints(ctx: CoverageContext) -> None:
    await cover_admin_reading_delete(ctx)
    await cover_admin_listening_delete(ctx)
    await cover_admin_writing_and_lessons_delete(ctx)


__all__ = [
    "cover_admin_content_crud",
    "cover_admin_delete_endpoints",
    "cover_public_catalog_and_lessons",
]
