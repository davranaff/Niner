from __future__ import annotations

from ..context import CoverageContext


async def cover_admin_writing_and_lessons_crud(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit("GET", "/api/v1/admin/writing/tests", "/api/v1/admin/writing/tests", headers=admin_headers)
    writing_test_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/writing/tests",
        "/api/v1/admin/writing/tests",
        headers=admin_headers,
        json={"title": "Admin Writing", "description": "Desc", "time_limit": 3600, "is_active": True},
    )
    ctx.ids["writing_test_id"] = writing_test_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/writing/tests/{test_id}",
        f"/api/v1/admin/writing/tests/{ctx.ids['writing_test_id']}",
        headers=admin_headers,
        json={"title": "Admin Writing Updated", "description": "Desc2", "time_limit": 3900, "is_active": True},
    )

    writing_part_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/writing/tests/{test_id}/parts",
        f"/api/v1/admin/writing/tests/{ctx.ids['writing_test_id']}/parts",
        headers=admin_headers,
        json={"order": 1, "task": "Write something", "image_url": None},
    )
    ctx.ids["writing_part_id"] = writing_part_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/writing/parts/{part_id}",
        f"/api/v1/admin/writing/parts/{ctx.ids['writing_part_id']}",
        headers=admin_headers,
        json={"order": 1, "task": "Write better", "image_url": "https://example.com/img.png"},
    )

    await ctx.hit("GET", "/api/v1/admin/lessons/categories", "/api/v1/admin/lessons/categories", headers=admin_headers)
    category_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/lessons/categories",
        "/api/v1/admin/lessons/categories",
        headers=admin_headers,
        json={"title": "Grammar", "slug": "grammar"},
    )
    ctx.ids["category_id"] = category_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/lessons/categories/{category_id}",
        f"/api/v1/admin/lessons/categories/{ctx.ids['category_id']}",
        headers=admin_headers,
        json={"title": "Grammar Updated", "slug": "grammar-updated"},
    )

    await ctx.hit("GET", "/api/v1/admin/lessons", "/api/v1/admin/lessons", headers=admin_headers)
    lesson_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/lessons",
        "/api/v1/admin/lessons",
        headers=admin_headers,
        json={"category_id": ctx.ids["category_id"], "title": "Lesson", "video_link": "https://example.com/v1"},
    )
    ctx.ids["lesson_id"] = lesson_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/lessons/{lesson_id}",
        f"/api/v1/admin/lessons/{ctx.ids['lesson_id']}",
        headers=admin_headers,
        json={"category_id": ctx.ids["category_id"], "title": "Lesson Updated", "video_link": "https://example.com/v2"},
    )


async def cover_admin_writing_and_lessons_delete(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit(
        "DELETE",
        "/api/v1/admin/writing/parts/{part_id}",
        f"/api/v1/admin/writing/parts/{ctx.ids['writing_part_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/writing/tests/{test_id}",
        f"/api/v1/admin/writing/tests/{ctx.ids['writing_test_id']}",
        headers=admin_headers,
    )

    await ctx.hit(
        "DELETE",
        "/api/v1/admin/lessons/{lesson_id}",
        f"/api/v1/admin/lessons/{ctx.ids['lesson_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/lessons/categories/{category_id}",
        f"/api/v1/admin/lessons/categories/{ctx.ids['category_id']}",
        headers=admin_headers,
    )
