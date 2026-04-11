from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.models import RoleEnum, User
from app.main import app

HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}


@dataclass
class CoverageContext:
    client: AsyncClient
    db_session: AsyncSession
    expected_ops: set[tuple[str, str]] = field(default_factory=set)
    called_ops: set[tuple[str, str]] = field(default_factory=set)
    users: dict[str, User] = field(default_factory=dict)
    tokens: dict[str, dict[str, str]] = field(default_factory=dict)
    ids: dict[str, int] = field(default_factory=dict)

    @classmethod
    def create(cls, client: AsyncClient, db_session: AsyncSession) -> CoverageContext:
        expected_ops = {
            (method.upper(), path)
            for path, payload in app.openapi()["paths"].items()
            for method in payload
            if method.upper() in HTTP_METHODS
        }
        return cls(client=client, db_session=db_session, expected_ops=expected_ops)

    async def hit(
        self,
        method: str,
        op_path: str,
        real_path: str,
        *,
        headers: dict[str, str] | None = None,
        json: dict[str, Any] | list[Any] | None = None,
        status_code: int = 200,
    ):
        response = await self.client.request(method, real_path, headers=headers, json=json)
        assert response.status_code == status_code, (
            f"{method} {real_path} expected {status_code} got {response.status_code}: {response.text}"
        )
        self.called_ops.add((method.upper(), op_path))
        return response

    async def create_active_user(
        self,
        key: str,
        *,
        email: str,
        role: RoleEnum,
        password: str = "Password123",
    ) -> User:
        user = User(
            email=email,
            password_hash=hash_password(password),
            first_name="Test",
            last_name="User",
            role=role,
            is_active=True,
            verified_at=datetime.now(UTC),
        )
        self.db_session.add(user)
        await self.db_session.commit()
        await self.db_session.refresh(user)
        self.users[key] = user
        return user

    async def sign_in(self, *, email: str, password: str = "Password123") -> dict[str, str]:
        response = await self.client.post(
            "/api/v1/auth/sign-in",
            json={"email": email, "password": password},
        )
        assert response.status_code == 200, response.text
        payload = response.json()["tokens"]
        return {
            "access": payload["access_token"],
            "refresh": payload["refresh_token"],
        }

    def auth_headers(self, actor: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.tokens[actor]['access']}"}


async def cover_health_and_readiness(ctx: CoverageContext) -> None:
    app.state.redis = SimpleNamespace(ping=AsyncMock(return_value=True))
    await ctx.hit("GET", "/health", "/health")
    await ctx.hit("GET", "/readiness", "/readiness")
