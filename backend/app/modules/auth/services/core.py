from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email
from app.core.errors import ApiError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_random_token,
    hash_password,
    resolve_refresh_token,
    sha256_token,
    verify_password,
)
from app.db.models import (
    ConfirmToken,
    PasswordResetToken,
    RefreshToken,
    RoleEnum,
    User,
    UserAnalytics,
    UserProfile,
)
from app.modules.auth import repository
from app.modules.auth.schemas import AuthOut, AuthTokensOut
from app.modules.users.schemas import UserPublic


def _user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        verified_at=user.verified_at,
    )


def _utc_now_for_value(value: datetime | None) -> datetime:
    now = datetime.now(UTC)
    if value is not None and value.tzinfo is None:
        return now.replace(tzinfo=None)
    return now


async def _issue_auth_tokens(
    db: AsyncSession,
    user: User,
    request: Request | None = None,
) -> AuthOut:
    access = create_access_token(user)
    refresh, jti, expires_at = create_refresh_token(user)

    token_row = RefreshToken(
        user_id=user.id,
        jti=jti,
        token_hash=sha256_token(refresh),
        expires_at=expires_at,
        ip_address=(request.client.host if request and request.client else None),
        user_agent=(request.headers.get("user-agent") if request else None),
    )
    db.add(token_row)
    await db.commit()

    return AuthOut(
        tokens=AuthTokensOut(
            access_token=access,
            refresh_token=refresh,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        ),
        user=_user_public(user),
    )


async def sign_up(
    db: AsyncSession,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    role: RoleEnum,
) -> str:
    normalized_email = email.lower()

    existing = await repository.get_user_by_email(db, normalized_email)
    if existing and (existing.is_active or existing.verified_at is not None):
        raise ApiError(code="email_exists", message="User with this email already exists", status_code=409)

    if existing and not existing.is_active and existing.verified_at is None:
        await db.delete(existing)
        await db.flush()

    user = User(
        email=normalized_email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        role=role,
        is_active=False,
    )
    db.add(user)
    await db.flush()

    db.add(UserProfile(user_id=user.id))
    db.add(UserAnalytics(user_id=user.id))

    raw_token = generate_random_token(32)
    db.add(
        ConfirmToken(
            user_id=user.id,
            token_hash=sha256_token(raw_token),
            expires_at=datetime.now(UTC) + timedelta(hours=settings.confirm_token_expire_hours),
        )
    )
    await db.commit()

    confirm_url = f"{settings.frontend_base_url.rstrip('/')}/confirm/{raw_token}"
    await send_email(
        subject="Confirm your account",
        recipient=user.email,
        html_body=f"<p>Confirm your account: <a href=\"{confirm_url}\">{confirm_url}</a></p>",
    )

    return raw_token


async def confirm_account(db: AsyncSession, token: str, request: Request | None = None) -> AuthOut:
    token_hash = sha256_token(token)
    row = await repository.get_confirm_token_by_hash(db, token_hash)

    if row is None:
        raise ApiError(code="invalid_confirmation", message="Invalid confirmation token", status_code=404)

    now = _utc_now_for_value(row.expires_at)
    if row.used_at is not None or row.expires_at < now:
        raise ApiError(code="invalid_confirmation", message="Confirmation token expired", status_code=400)

    user = await db.get(User, row.user_id)
    if user is None:
        raise ApiError(code="user_not_found", message="User not found", status_code=404)

    user.verified_at = now
    user.is_active = True
    row.used_at = now
    await db.commit()

    return await _issue_auth_tokens(db, user, request)


async def sign_in(db: AsyncSession, email: str, password: str, request: Request | None = None) -> AuthOut:
    user = await repository.get_user_by_email(db, email)

    if user is None or not verify_password(password, user.password_hash):
        raise ApiError(code="invalid_credentials", message="Invalid email or password", status_code=400)

    if not user.is_active:
        raise ApiError(code="inactive_user", message="Account is not active", status_code=403)

    return await _issue_auth_tokens(db, user, request)


async def refresh_tokens(db: AsyncSession, refresh_token: str, request: Request | None = None) -> AuthOut:
    _, user, token_row = await resolve_refresh_token(refresh_token, db)
    token_row.revoked_at = datetime.now(UTC)
    await db.flush()
    return await _issue_auth_tokens(db, user, request)


async def sign_out(db: AsyncSession, refresh_token: str) -> None:
    try:
        _, _, token_row = await resolve_refresh_token(refresh_token, db, check_revoked=False)
    except ApiError:
        return

    token_row.revoked_at = datetime.now(UTC)
    await db.commit()


async def create_reset_link(db: AsyncSession, email: str) -> str | None:
    user = await repository.get_user_by_email(db, email)
    if user is None:
        return None

    raw_token = generate_random_token(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=sha256_token(raw_token),
            expires_at=datetime.now(UTC) + timedelta(hours=settings.reset_token_expire_hours),
        )
    )
    await db.commit()

    reset_url = f"{settings.frontend_base_url.rstrip('/')}/reset-password/{raw_token}"
    await send_email(
        subject="Reset your password",
        recipient=user.email,
        html_body=f"<p>Reset your password: <a href=\"{reset_url}\">{reset_url}</a></p>",
    )
    return raw_token


async def reset_password(db: AsyncSession, token: str, password: str, request: Request | None = None) -> AuthOut:
    token_hash = sha256_token(token)
    row = await repository.get_password_reset_token_by_hash(db, token_hash)

    if row is None:
        raise ApiError(code="invalid_reset_token", message="Reset token not found", status_code=404)

    now = _utc_now_for_value(row.expires_at)
    if row.used_at is not None or row.expires_at < now:
        raise ApiError(code="invalid_reset_token", message="Reset token expired", status_code=400)

    user = await db.get(User, row.user_id)
    if user is None:
        raise ApiError(code="user_not_found", message="User not found", status_code=404)

    user.password_hash = hash_password(password)
    row.used_at = now
    await db.commit()

    return await _issue_auth_tokens(db, user, request)
