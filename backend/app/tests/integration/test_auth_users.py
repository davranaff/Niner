import pytest


@pytest.mark.asyncio
async def test_signup_confirm_signin_refresh_and_me(client):
    sign_up_response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "person@example.com",
            "password": "Password123",
            "first_name": "John",
            "last_name": "Doe",
            "role": "student",
        },
    )
    assert sign_up_response.status_code == 201
    confirm_token = sign_up_response.json().get("debug_confirmation_token")
    assert confirm_token

    confirm_response = await client.post("/api/v1/auth/confirm", json={"token": confirm_token})
    assert confirm_response.status_code == 200
    auth_payload = confirm_response.json()
    access = auth_payload["tokens"]["access_token"]
    refresh = auth_payload["tokens"]["refresh_token"]

    me_response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "person@example.com"

    refresh_response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert refresh_response.status_code == 200

    sign_out_response = await client.post("/api/v1/auth/sign-out", json={"refresh_token": refresh})
    assert sign_out_response.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_flow(client):
    sign_up = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "reset@example.com",
            "password": "Password123",
            "first_name": "Reset",
            "last_name": "User",
            "role": "student",
        },
    )
    token = sign_up.json()["debug_confirmation_token"]
    await client.post("/api/v1/auth/confirm", json={"token": token})

    reset_link = await client.post("/api/v1/auth/reset-link", json={"email": "reset@example.com"})
    assert reset_link.status_code == 200
    reset_token = reset_link.json().get("debug_reset_token")
    assert reset_token

    reset_password = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "NewPassword123"},
    )
    assert reset_password.status_code == 200

    sign_in_new = await client.post(
        "/api/v1/auth/sign-in",
        json={"email": "reset@example.com", "password": "NewPassword123"},
    )
    assert sign_in_new.status_code == 200


@pytest.mark.asyncio
async def test_unauthorized_me(client):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_signup_teacher_role_is_supported(client):
    sign_up_response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "teacher-signup@example.com",
            "password": "Password123",
            "first_name": "Dilnoza",
            "last_name": "Rahimova",
            "role": "teacher",
        },
    )
    assert sign_up_response.status_code == 201
    token = sign_up_response.json()["debug_confirmation_token"]

    confirm = await client.post("/api/v1/auth/confirm", json={"token": token})
    assert confirm.status_code == 200
    assert confirm.json()["user"]["role"] == "teacher"


@pytest.mark.asyncio
async def test_signup_rejects_non_student_teacher_roles(client):
    response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "invalid-role@example.com",
            "password": "Password123",
            "first_name": "Role",
            "last_name": "Tester",
            "role": "admin",
        },
    )
    assert response.status_code == 422
