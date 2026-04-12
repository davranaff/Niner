from __future__ import annotations

from unittest.mock import AsyncMock

from app.db.models import RoleEnum

from .context import CoverageContext


async def cover_auth_users_profile_dashboard(ctx: CoverageContext) -> None:
    from app.modules.auth.services import core as auth_services

    auth_services.send_email = AsyncMock(return_value=None)

    admin_user = await ctx.create_active_user(
        "admin",
        email="admin-coverage@example.com",
        role=RoleEnum.admin,
    )
    teacher_user = await ctx.create_active_user(
        "teacher",
        email="teacher-coverage@example.com",
        role=RoleEnum.teacher,
    )
    student_user = await ctx.create_active_user(
        "student",
        email="student-coverage@example.com",
        role=RoleEnum.student,
    )

    admin_sign_in = await ctx.hit(
        "POST",
        "/api/v1/auth/sign-in",
        "/api/v1/auth/sign-in",
        json={"email": admin_user.email, "password": "Password123"},
    )
    admin_tokens = admin_sign_in.json()["tokens"]
    ctx.tokens["admin"] = {
        "access": admin_tokens["access_token"],
        "refresh": admin_tokens["refresh_token"],
    }
    ctx.tokens["teacher"] = await ctx.sign_in(email=teacher_user.email)
    ctx.tokens["student"] = await ctx.sign_in(email=student_user.email)

    admin_headers = ctx.auth_headers("admin")
    student_headers = ctx.auth_headers("student")

    sign_up = await ctx.hit(
        "POST",
        "/api/v1/auth/sign-up",
        "/api/v1/auth/sign-up",
        status_code=201,
        json={
            "email": "flow-coverage@example.com",
            "password": "Password123",
            "first_name": "Flow",
            "last_name": "Coverage",
            "role": "student",
        },
    )
    confirm_token = sign_up.json()["debug_confirmation_token"]

    confirm = await ctx.hit(
        "POST",
        "/api/v1/auth/confirm",
        "/api/v1/auth/confirm",
        json={"token": confirm_token},
    )
    flow_refresh = confirm.json()["tokens"]["refresh_token"]

    await ctx.hit(
        "POST",
        "/api/v1/auth/refresh",
        "/api/v1/auth/refresh",
        json={"refresh_token": flow_refresh},
    )
    await ctx.hit(
        "POST",
        "/api/v1/auth/sign-out",
        "/api/v1/auth/sign-out",
        json={"refresh_token": flow_refresh},
    )

    reset_link = await ctx.hit(
        "POST",
        "/api/v1/auth/reset-link",
        "/api/v1/auth/reset-link",
        json={"email": "flow-coverage@example.com"},
    )
    reset_token = reset_link.json()["debug_reset_token"]
    await ctx.hit(
        "POST",
        "/api/v1/auth/reset-password",
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "Password1234"},
    )

    await ctx.hit("GET", "/api/v1/users/me", "/api/v1/users/me", headers=student_headers)
    await ctx.hit(
        "PATCH",
        "/api/v1/users/me",
        "/api/v1/users/me",
        headers=student_headers,
        json={"first_name": "Changed", "last_name": "Name"},
    )
    await ctx.hit(
        "PUT",
        "/api/v1/users/me/password",
        "/api/v1/users/me/password",
        headers=student_headers,
        json={"old_password": "Password123", "new_password": "Password123X"},
    )
    await ctx.hit("GET", "/api/v1/users", "/api/v1/users?search=student", headers=admin_headers)

    await ctx.hit("GET", "/api/v1/profile", "/api/v1/profile", headers=student_headers)
    await ctx.hit(
        "PATCH",
        "/api/v1/profile",
        "/api/v1/profile",
        headers=student_headers,
        json={"country": "UZ", "native_language": "uz"},
    )
    await ctx.hit(
        "POST",
        "/api/v1/progress",
        "/api/v1/progress",
        headers=student_headers,
        json={
            "band_score": "6.5",
            "correct_answers": 30,
            "total_questions": 40,
            "time_taken_seconds": 3100,
            "test_type": "reading",
        },
    )
    await ctx.hit("GET", "/api/v1/progress", "/api/v1/progress", headers=student_headers)
    await ctx.hit("GET", "/api/v1/analytics", "/api/v1/analytics", headers=student_headers)
    await ctx.hit(
        "GET",
        "/api/v1/dashboard/activity",
        "/api/v1/dashboard/activity?year=2026&modules=reading&modules=listening",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/dashboard/stats",
        "/api/v1/dashboard/stats?modules=reading",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/dashboard/history",
        "/api/v1/dashboard/history?limit=5&offset=0",
        headers=student_headers,
    )
    await ctx.hit(
        "GET",
        "/api/v1/dashboard/quick-links",
        "/api/v1/dashboard/quick-links",
        headers=student_headers,
    )
