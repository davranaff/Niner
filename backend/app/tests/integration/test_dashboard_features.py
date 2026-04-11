from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.core.security import hash_password
from app.db.models import ProgressTestTypeEnum, RoleEnum, User, UserProgress


async def _create_active_user(db_session, email: str, password: str = "Password123") -> User:
    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name="Aziz",
        last_name="Karimov",
        role=RoleEnum.student,
        is_active=True,
        verified_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _auth_headers(client, email: str, password: str = "Password123") -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/sign-in",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    token = response.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_dashboard_activity_stats_history_and_quick_links(client, db_session):
    user = await _create_active_user(db_session, "dashboard.student@example.com")

    now = datetime.now(UTC).replace(hour=10, minute=0, second=0, microsecond=0)
    points = [
        (now, ProgressTestTypeEnum.reading, "7.0", 3600),
        (now - timedelta(days=1), ProgressTestTypeEnum.listening, "6.5", 1800),
        (now - timedelta(days=2), ProgressTestTypeEnum.writing, "6.0", 1200),
        (now - timedelta(days=5), ProgressTestTypeEnum.speaking, "6.5", 900),
        (now - timedelta(days=10), ProgressTestTypeEnum.reading, "6.0", 3000),
        (now - timedelta(days=370), ProgressTestTypeEnum.listening, "5.5", 1800),
    ]

    for test_date, test_type, band_score, seconds in points:
        db_session.add(
            UserProgress(
                user_id=user.id,
                test_date=test_date,
                test_type=test_type,
                band_score=Decimal(band_score),
                correct_answers=None,
                total_questions=None,
                time_taken_seconds=seconds,
            )
        )
    await db_session.commit()

    headers = await _auth_headers(client, user.email)
    year = now.year

    activity = await client.get(f"/api/v1/dashboard/activity?year={year}", headers=headers)
    assert activity.status_code == 200
    activity_payload = activity.json()
    assert activity_payload["year"] == year
    assert activity_payload["settings"]["selected_modules"] == [
        "reading",
        "listening",
        "speaking",
        "writing",
    ]
    assert year in activity_payload["settings"]["available_years"]
    assert activity_payload["summary"]["practice_days"] == 5
    assert activity_payload["summary"]["total_attempts"] == 5
    assert activity_payload["summary"]["total_minutes"] == 175

    today_cell = next(item for item in activity_payload["days"] if item["date"] == str(now.date()))
    assert today_cell["attempts"] == 1
    assert today_cell["total_minutes"] == 60
    assert today_cell["intensity"] == 3

    filtered_activity = await client.get(
        f"/api/v1/dashboard/activity?year={year}&modules=reading&modules=listening",
        headers=headers,
    )
    assert filtered_activity.status_code == 200
    filtered_activity_payload = filtered_activity.json()
    assert filtered_activity_payload["settings"]["selected_modules"] == ["reading", "listening"]
    assert filtered_activity_payload["summary"]["total_attempts"] == 3

    stats = await client.get("/api/v1/dashboard/stats", headers=headers)
    assert stats.status_code == 200
    stats_payload = stats.json()
    assert stats_payload["total_attempts"] == 6
    assert stats_payload["minutes_this_week"] == 125
    assert stats_payload["current_streak"] == 3
    assert Decimal(str(stats_payload["predicted_overall_band"])) == Decimal("6.5")

    filtered_stats = await client.get(
        "/api/v1/dashboard/stats?modules=reading&modules=listening",
        headers=headers,
    )
    assert filtered_stats.status_code == 200
    filtered_stats_payload = filtered_stats.json()
    assert filtered_stats_payload["total_attempts"] == 4
    assert Decimal(str(filtered_stats_payload["predicted_overall_band"])) == Decimal("6.8")

    history = await client.get("/api/v1/dashboard/history?limit=2&offset=0", headers=headers)
    assert history.status_code == 200
    history_payload = history.json()
    assert history_payload["limit"] == 2
    assert history_payload["offset"] == 0
    assert len(history_payload["items"]) == 2
    assert history_payload["items"][0]["test_date"] >= history_payload["items"][1]["test_date"]
    assert history_payload["items"][0]["test_type"] == "reading"

    writing_history = await client.get(
        "/api/v1/dashboard/history?modules=writing",
        headers=headers,
    )
    assert writing_history.status_code == 200
    writing_history_items = writing_history.json()["items"]
    assert len(writing_history_items) == 1
    assert writing_history_items[0]["test_type"] == "writing"

    quick_links = await client.get("/api/v1/dashboard/quick-links", headers=headers)
    assert quick_links.status_code == 200
    quick_links_payload = quick_links.json()["items"]
    assert any(link["path"] == "/dashboard/reading" for link in quick_links_payload)
    assert any(link["path"] == "/dashboard/listening" for link in quick_links_payload)
    assert any(link["path"] == "/dashboard/writing" for link in quick_links_payload)
    assert any(link["path"] == "/dashboard/profile" for link in quick_links_payload)

