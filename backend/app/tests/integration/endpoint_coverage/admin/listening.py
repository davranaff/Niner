from __future__ import annotations

from ..context import CoverageContext


async def cover_admin_listening_crud(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit("GET", "/api/v1/admin/listening/tests", "/api/v1/admin/listening/tests", headers=admin_headers)
    listening_test_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/tests",
        "/api/v1/admin/listening/tests",
        headers=admin_headers,
        json={
            "title": "Admin Listening",
            "description": "Desc",
            "time_limit": 2400,
            "is_active": True,
            "voice_url": "https://example.com/audio.mp3",
        },
    )
    ctx.ids["listening_test_id"] = listening_test_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/listening/tests/{test_id}",
        f"/api/v1/admin/listening/tests/{ctx.ids['listening_test_id']}",
        headers=admin_headers,
        json={
            "title": "Admin Listening Updated",
            "description": "Desc",
            "time_limit": 2700,
            "is_active": True,
            "voice_url": "https://example.com/audio2.mp3",
        },
    )

    listening_part_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/tests/{test_id}/parts",
        f"/api/v1/admin/listening/tests/{ctx.ids['listening_test_id']}/parts",
        headers=admin_headers,
        json={"title": "Part", "order": 1},
    )
    ctx.ids["listening_part_id"] = listening_part_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/listening/parts/{part_id}",
        f"/api/v1/admin/listening/parts/{ctx.ids['listening_part_id']}",
        headers=admin_headers,
        json={"title": "Part Upd", "order": 1},
    )

    listening_block_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/parts/{part_id}/blocks",
        f"/api/v1/admin/listening/parts/{ctx.ids['listening_part_id']}/blocks",
        headers=admin_headers,
        json={"title": "Block", "description": "Desc", "block_type": "multiple_choice", "order": 1},
    )
    ctx.ids["listening_block_id"] = listening_block_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/listening/blocks/{block_id}",
        f"/api/v1/admin/listening/blocks/{ctx.ids['listening_block_id']}",
        headers=admin_headers,
        json={"title": "Block Upd", "description": "Desc2", "block_type": "multiple_choice", "order": 1},
    )

    listening_question_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/blocks/{block_id}/questions",
        f"/api/v1/admin/listening/blocks/{ctx.ids['listening_block_id']}/questions",
        headers=admin_headers,
        json={"question_text": "Question", "order": 1},
    )
    ctx.ids["listening_question_id"] = listening_question_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/listening/questions/{question_id}",
        f"/api/v1/admin/listening/questions/{ctx.ids['listening_question_id']}",
        headers=admin_headers,
        json={"question_text": "Question Upd", "order": 1},
    )

    listening_option_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/questions/{question_id}/options",
        f"/api/v1/admin/listening/questions/{ctx.ids['listening_question_id']}/options",
        headers=admin_headers,
        json={"option_text": "A", "is_correct": True, "order": 1},
    )
    ctx.ids["listening_option_id"] = listening_option_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/listening/options/{option_id}",
        f"/api/v1/admin/listening/options/{ctx.ids['listening_option_id']}",
        headers=admin_headers,
        json={"option_text": "A1", "is_correct": True, "order": 1},
    )

    listening_text_block_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/parts/{part_id}/blocks",
        f"/api/v1/admin/listening/parts/{ctx.ids['listening_part_id']}/blocks",
        headers=admin_headers,
        json={"title": "Text Block", "description": "Desc", "block_type": "short_answer", "order": 2},
    )
    listening_text_block_id = listening_text_block_resp.json()["id"]

    listening_text_question_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/blocks/{block_id}/questions",
        f"/api/v1/admin/listening/blocks/{listening_text_block_id}/questions",
        headers=admin_headers,
        json={"question_text": "Text Question", "order": 1},
    )
    listening_text_question_id = listening_text_question_resp.json()["id"]

    listening_answer_resp = await ctx.hit(
        "POST",
        "/api/v1/admin/listening/questions/{question_id}/answers",
        f"/api/v1/admin/listening/questions/{listening_text_question_id}/answers",
        headers=admin_headers,
        json={"correct_answers": "listen"},
    )
    ctx.ids["listening_answer_id"] = listening_answer_resp.json()["id"]

    await ctx.hit(
        "PATCH",
        "/api/v1/admin/listening/answers/{answer_id}",
        f"/api/v1/admin/listening/answers/{ctx.ids['listening_answer_id']}",
        headers=admin_headers,
        json={"correct_answers": "listen"},
    )


async def cover_admin_listening_delete(ctx: CoverageContext) -> None:
    admin_headers = ctx.auth_headers("admin")

    await ctx.hit(
        "DELETE",
        "/api/v1/admin/listening/answers/{answer_id}",
        f"/api/v1/admin/listening/answers/{ctx.ids['listening_answer_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/listening/options/{option_id}",
        f"/api/v1/admin/listening/options/{ctx.ids['listening_option_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/listening/questions/{question_id}",
        f"/api/v1/admin/listening/questions/{ctx.ids['listening_question_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/listening/blocks/{block_id}",
        f"/api/v1/admin/listening/blocks/{ctx.ids['listening_block_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/listening/parts/{part_id}",
        f"/api/v1/admin/listening/parts/{ctx.ids['listening_part_id']}",
        headers=admin_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/admin/listening/tests/{test_id}",
        f"/api/v1/admin/listening/tests/{ctx.ids['listening_test_id']}",
        headers=admin_headers,
    )
