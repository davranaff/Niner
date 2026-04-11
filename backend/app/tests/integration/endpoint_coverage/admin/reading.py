from __future__ import annotations

from ..context import CoverageContext


async def cover_admin_reading_crud(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit("GET", "/api/v1/admin/reading/tests", "/api/v1/admin/reading/tests", headers=admin_headers)
    reading_test_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/tests",
        "/api/v1/admin/reading/tests",
        headers=admin_headers,
        json={"title": "Admin Reading", "description": "Desc", "time_limit": 3600, "is_active": True},
    )
    ctx.ids["reading_test_id"] = reading_test_resp.json()["id"]

    await ctx.hit(
        "GET",
        "/api/v1/admin/reading/tests/{test_id}",
        f"/api/v1/admin/reading/tests/{ctx.ids['reading_test_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "PATCH",
        "/api/v1/admin/reading/tests/{test_id}",
        f"/api/v1/admin/reading/tests/{ctx.ids['reading_test_id']}",
        headers=admin_headers,
        json={"title": "Admin Reading Updated", "description": "Desc", "time_limit": 3900, "is_active": True},
    )

    reading_passage_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/tests/{test_id}/passages",
        f"/api/v1/admin/reading/tests/{ctx.ids['reading_test_id']}/passages",
        headers=admin_headers,
        json={"title": "Passage", "content": "Content", "passage_number": 1},
    )
    ctx.ids["reading_passage_id"] = reading_passage_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/reading/passages/{passage_id}",
        f"/api/v1/admin/reading/passages/{ctx.ids['reading_passage_id']}",
        headers=admin_headers,
        json={"title": "Passage Upd", "content": "Content 2", "passage_number": 1},
    )

    reading_block_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/passages/{passage_id}/blocks",
        f"/api/v1/admin/reading/passages/{ctx.ids['reading_passage_id']}/blocks",
        headers=admin_headers,
        json={"title": "Block", "description": "Desc", "block_type": "true_false_ng", "order": 1},
    )
    ctx.ids["reading_block_id"] = reading_block_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/reading/blocks/{block_id}",
        f"/api/v1/admin/reading/blocks/{ctx.ids['reading_block_id']}",
        headers=admin_headers,
        json={"title": "Block Upd", "description": "Desc 2", "block_type": "true_false_ng", "order": 1},
    )

    reading_question_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/blocks/{block_id}/questions",
        f"/api/v1/admin/reading/blocks/{ctx.ids['reading_block_id']}/questions",
        headers=admin_headers,
        json={"question_text": "Question", "order": 1},
    )
    ctx.ids["reading_question_id"] = reading_question_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/reading/questions/{question_id}",
        f"/api/v1/admin/reading/questions/{ctx.ids['reading_question_id']}",
        headers=admin_headers,
        json={"question_text": "Question Upd", "order": 1},
    )

    reading_option_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/questions/{question_id}/options",
        f"/api/v1/admin/reading/questions/{ctx.ids['reading_question_id']}/options",
        headers=admin_headers,
        json={"option_text": "A", "is_correct": True, "order": 1},
    )
    ctx.ids["reading_option_id"] = reading_option_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/reading/options/{option_id}",
        f"/api/v1/admin/reading/options/{ctx.ids['reading_option_id']}",
        headers=admin_headers,
        json={"option_text": "A1", "is_correct": True, "order": 1},
    )

    reading_text_block_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/passages/{passage_id}/blocks",
        f"/api/v1/admin/reading/passages/{ctx.ids['reading_passage_id']}/blocks",
        headers=admin_headers,
        json={"title": "Text Block", "description": "Desc", "block_type": "short_answers", "order": 2},
    )
    reading_text_block_id = reading_text_block_resp.json()["id"]

    reading_text_question_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/blocks/{block_id}/questions",
        f"/api/v1/admin/reading/blocks/{reading_text_block_id}/questions",
        headers=admin_headers,
        json={"question_text": "Text Question", "order": 1},
    )
    reading_text_question_id = reading_text_question_resp.json()["id"]

    reading_answer_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/reading/questions/{question_id}/answers",
        f"/api/v1/admin/reading/questions/{reading_text_question_id}/answers",
        headers=admin_headers,
        json={"correct_answers": "answer"},
    )
    ctx.ids["reading_answer_id"] = reading_answer_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/reading/answers/{answer_id}",
        f"/api/v1/admin/reading/answers/{ctx.ids['reading_answer_id']}",
        headers=admin_headers,
        json={"correct_answers": "answer"},
    )


async def cover_admin_reading_delete(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit(
        "DELETE",
        "/api/v1/admin/reading/answers/{answer_id}",
        f"/api/v1/admin/reading/answers/{ctx.ids['reading_answer_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/reading/options/{option_id}",
        f"/api/v1/admin/reading/options/{ctx.ids['reading_option_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/reading/questions/{question_id}",
        f"/api/v1/admin/reading/questions/{ctx.ids['reading_question_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/reading/blocks/{block_id}",
        f"/api/v1/admin/reading/blocks/{ctx.ids['reading_block_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/reading/passages/{passage_id}",
        f"/api/v1/admin/reading/passages/{ctx.ids['reading_passage_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/reading/tests/{test_id}",
        f"/api/v1/admin/reading/tests/{ctx.ids['reading_test_id']}",
        headers=admin_headers,
    )
