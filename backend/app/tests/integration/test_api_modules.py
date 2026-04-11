import pytest

from app.db.models import Category, Lesson


async def _auth_headers(client, email: str) -> dict[str, str]:
    sign_up = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": email,
            "password": "Password123",
            "first_name": "A",
            "last_name": "B",
            "role": "student",
        },
    )
    token = sign_up.json()["debug_confirmation_token"]
    confirm = await client.post("/api/v1/auth/confirm", json={"token": token})
    access = confirm.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {access}"}


@pytest.mark.asyncio
async def test_profile_progress_analytics_and_dashboard_parts(client, db_session):
    headers = await _auth_headers(client, "profile@example.com")

    profile = await client.get("/api/v1/profile", headers=headers)
    assert profile.status_code == 200

    patch_profile = await client.patch(
        "/api/v1/profile",
        headers=headers,
        json={"country": "UZ", "native_language": "uz"},
    )
    assert patch_profile.status_code == 200
    assert patch_profile.json()["country"] == "UZ"

    create_progress = await client.post(
        "/api/v1/progress",
        headers=headers,
        json={
            "band_score": "6.5",
            "correct_answers": 30,
            "total_questions": 40,
            "time_taken_seconds": 3000,
            "test_type": "reading",
        },
    )
    assert create_progress.status_code == 200

    progress = await client.get("/api/v1/progress", headers=headers)
    assert progress.status_code == 200
    assert len(progress.json()["items"]) == 1

    analytics = await client.get("/api/v1/analytics", headers=headers)
    assert analytics.status_code == 200
    assert analytics.json()["total_tests_taken"] == 1

    activity = await client.get("/api/v1/dashboard/activity", headers=headers)
    assert activity.status_code == 200
    assert "summary" in activity.json()

    stats = await client.get("/api/v1/dashboard/stats", headers=headers)
    assert stats.status_code == 200
    assert stats.json()["total_attempts"] == 1

    history = await client.get("/api/v1/dashboard/history", headers=headers)
    assert history.status_code == 200
    assert len(history.json()["items"]) == 1

    quick_links = await client.get("/api/v1/dashboard/quick-links", headers=headers)
    assert quick_links.status_code == 200
    assert len(quick_links.json()["items"]) >= 1


@pytest.mark.asyncio
async def test_lessons_endpoints(client, db_session):
    category = Category(title="Reading Lessons", slug="reading-lessons")
    db_session.add(category)
    await db_session.flush()
    db_session.add(Lesson(category_id=category.id, title="Lesson 1", video_link="https://example.com"))
    await db_session.commit()

    categories_response = await client.get("/api/v1/lessons/categories")
    assert categories_response.status_code == 200
    assert categories_response.json()["items"][0]["slug"] == "reading-lessons"

    lessons_response = await client.get("/api/v1/lessons/categories/reading-lessons/lessons")
    assert lessons_response.status_code == 200
    assert lessons_response.json()["items"][0]["title"] == "Lesson 1"
