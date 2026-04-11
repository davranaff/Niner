from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.db.session import get_db
from app.modules.auth import services
from app.modules.auth.schemas import (
    AuthOut,
    ConfirmIn,
    MessageOut,
    RefreshIn,
    ResetLinkIn,
    ResetLinkOut,
    ResetPasswordIn,
    SignInIn,
    SignOutIn,
    SignUpIn,
    SignUpOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sign-up", response_model=SignUpOut, status_code=status.HTTP_201_CREATED)
async def sign_up(payload: SignUpIn, db: AsyncSession = Depends(get_db)) -> SignUpOut:
    token = await services.sign_up(
        db,
        email=payload.email,
        password=payload.password,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=payload.role,
    )
    return SignUpOut(
        message="Confirmation email sent",
        debug_confirmation_token=token if settings.expose_debug_tokens else None,
    )


@router.post("/confirm", response_model=AuthOut)
async def confirm(payload: ConfirmIn, request: Request, db: AsyncSession = Depends(get_db)) -> AuthOut:
    return await services.confirm_account(db, token=payload.token, request=request)


@router.post("/sign-in", response_model=AuthOut)
async def sign_in(payload: SignInIn, request: Request, db: AsyncSession = Depends(get_db)) -> AuthOut:
    ip = request.client.host if request.client else "unknown"
    await rate_limiter.check(
        key=f"signin:{ip}:{payload.email.lower()}",
        limit=settings.rate_limit_sign_in,
        window_seconds=settings.rate_limit_window_seconds,
    )
    return await services.sign_in(db, email=payload.email, password=payload.password, request=request)


@router.post("/refresh", response_model=AuthOut)
async def refresh(payload: RefreshIn, request: Request, db: AsyncSession = Depends(get_db)) -> AuthOut:
    return await services.refresh_tokens(db, refresh_token=payload.refresh_token, request=request)


@router.post("/sign-out", response_model=MessageOut)
async def sign_out(payload: SignOutIn, db: AsyncSession = Depends(get_db)) -> MessageOut:
    await services.sign_out(db, refresh_token=payload.refresh_token)
    return MessageOut(message="Signed out")


@router.post("/reset-link", response_model=ResetLinkOut)
async def reset_link(payload: ResetLinkIn, request: Request, db: AsyncSession = Depends(get_db)) -> ResetLinkOut:
    ip = request.client.host if request.client else "unknown"
    await rate_limiter.check(
        key=f"reset-link:{ip}:{payload.email.lower()}",
        limit=settings.rate_limit_reset,
        window_seconds=settings.rate_limit_window_seconds,
    )
    token = await services.create_reset_link(db, email=payload.email)
    return ResetLinkOut(
        message="If the email exists, reset link has been sent",
        debug_reset_token=token if settings.expose_debug_tokens else None,
    )


@router.post("/reset-password", response_model=AuthOut)
async def reset_password(
    payload: ResetPasswordIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthOut:
    ip = request.client.host if request.client else "unknown"
    await rate_limiter.check(
        key=f"reset-password:{ip}",
        limit=settings.rate_limit_reset,
        window_seconds=settings.rate_limit_window_seconds,
    )
    return await services.reset_password(db, token=payload.token, password=payload.password, request=request)
