from __future__ import annotations

from ..context import CoverageContext


async def cover_public_catalog_and_lessons(ctx: CoverageContext) -> None:
    student_headers = ctx.auth_headers("student")

    await ctx.hit("GET", "/api/v1/lessons/categories", "/api/v1/lessons/categories")
    await ctx.hit(
        "GET",
        "/api/v1/lessons/categories/{slug}/lessons",
        "/api/v1/lessons/categories/grammar-updated/lessons",
    )

    await ctx.hit("GET", "/api/v1/reading/tests", "/api/v1/reading/tests", headers=student_headers)
    await ctx.hit(
        "GET",
        "/api/v1/reading/tests/{test_id}",
        f"/api/v1/reading/tests/{ctx.ids['reading_test_id']}",
        headers=student_headers,
    )
    await ctx.hit("GET", "/api/v1/listening/tests", "/api/v1/listening/tests", headers=student_headers)
    await ctx.hit(
        "GET",
        "/api/v1/listening/tests/{test_id}",
        f"/api/v1/listening/tests/{ctx.ids['listening_test_id']}",
        headers=student_headers,
    )
    await ctx.hit("GET", "/api/v1/writing/tests", "/api/v1/writing/tests", headers=student_headers)
    await ctx.hit(
        "GET",
        "/api/v1/writing/tests/{test_id}",
        f"/api/v1/writing/tests/{ctx.ids['writing_test_id']}",
        headers=student_headers,
    )
