from __future__ import annotations

from app.db.models import AiModuleSummary, AiSummaryStatusEnum

from .context import CoverageContext


async def cover_teacher_student_binding(ctx: CoverageContext) -> None:
    teacher_headers = ctx.auth_headers("teacher")
    student_headers = ctx.auth_headers("student")

    invite_resp = await ctx.hit(
        "POST",
        "/api/v1/teacher/students/invites",
        "/api/v1/teacher/students/invites",
        headers=teacher_headers,
    )
    invite_token = invite_resp.json()["invite_token"]

    await ctx.hit(
        "POST",
        "/api/v1/students/me/teacher/accept-invite",
        "/api/v1/students/me/teacher/accept-invite",
        headers=student_headers,
        json={"token": invite_token},
    )
    await ctx.hit(
        "GET",
        "/api/v1/teacher/students",
        "/api/v1/teacher/students?limit=20&offset=0",
        headers=teacher_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/teacher/dashboard",
        "/api/v1/teacher/dashboard",
        headers=teacher_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/teacher/analytics",
        "/api/v1/teacher/analytics",
        headers=teacher_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/teacher/students/insights",
        "/api/v1/teacher/students/insights?limit=20&offset=0",
        headers=teacher_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/teacher/students/{student_id}/insights",
        f"/api/v1/teacher/students/{ctx.users['student'].id}/insights",
        headers=teacher_headers,
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/teacher/students/{student_id}",
        f"/api/v1/teacher/students/{ctx.users['student'].id}",
        headers=teacher_headers,
    )

    second_invite_resp = await ctx.hit(
        "POST",
        "/api/v1/teacher/students/invites",
        "/api/v1/teacher/students/invites",
        headers=teacher_headers,
    )
    await ctx.hit(
        "POST",
        "/api/v1/students/me/teacher/accept-invite",
        "/api/v1/students/me/teacher/accept-invite",
        headers=student_headers,
        json={"token": second_invite_resp.json()["invite_token"]},
    )
    await ctx.hit(
        "DELETE",
        "/api/v1/students/me/teacher",
        "/api/v1/students/me/teacher",
        headers=student_headers,
    )


async def cover_ai_summary_endpoints(ctx: CoverageContext) -> None:
    student_headers = ctx.auth_headers("student")
    ai_trigger = await ctx.hit(
        "POST",
        "/api/v1/ai/summaries",
        "/api/v1/ai/summaries",
        headers=student_headers,
        status_code=202,
        json={"module": "reading"},
    )
    summary_id = ai_trigger.json()["id"]
    ctx.ids["ai_summary_id"] = summary_id

    summary_row = await ctx.db_session.get(AiModuleSummary, summary_id)
    assert summary_row is not None
    summary_row.status = AiSummaryStatusEnum.done
    summary_row.stream_text = "summary token stream"
    summary_row.result_text = "summary token stream"
    summary_row.result_json = {"summary_text": "summary token stream"}
    summary_row.error_text = None
    await ctx.db_session.commit()

    await ctx.hit(
        "GET",
        "/api/v1/ai/summaries",
        "/api/v1/ai/summaries?limit=20&offset=0",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/ai/summaries/{summary_id}",
        f"/api/v1/ai/summaries/{summary_id}",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/ai/summaries/{summary_id}/stream",
        f"/api/v1/ai/summaries/{summary_id}/stream",
        headers=student_headers,
    )
