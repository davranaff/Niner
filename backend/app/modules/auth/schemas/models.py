from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.db.models import RoleEnum
from app.modules.users.schemas import UserPublic


class SignUpIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    role: Literal[RoleEnum.student, RoleEnum.teacher]


class ConfirmIn(BaseModel):
    token: str


class SignInIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RefreshIn(BaseModel):
    refresh_token: str


class SignOutIn(BaseModel):
    refresh_token: str


class ResetLinkIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=8)


class AuthTokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthOut(BaseModel):
    tokens: AuthTokensOut
    user: UserPublic


class MessageOut(BaseModel):
    message: str


class SignUpOut(MessageOut):
    debug_confirmation_token: str | None = None


class ResetLinkOut(MessageOut):
    debug_reset_token: str | None = None
