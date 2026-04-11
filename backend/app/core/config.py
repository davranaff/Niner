import json
from functools import lru_cache
from typing import Annotated, Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Bandnine API"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"

    secret_key: str = "change-this-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    confirm_token_expire_hours: int = 24
    reset_token_expire_hours: int = 1

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/bandnine"
    redis_url: str = "redis://localhost:6379/0"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str = "noreply@example.com"

    frontend_base_url: str = "http://localhost:3000"
    cors_allow_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    cors_allow_credentials: bool = True
    cors_allow_methods: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    cors_allow_headers: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["*"])

    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"

    rate_limit_sign_in: int = 10
    rate_limit_reset: int = 5
    rate_limit_window_seconds: int = 60

    expose_debug_tokens: bool = Field(default=False)

    @field_validator("cors_allow_origins", "cors_allow_methods", "cors_allow_headers", mode="before")
    @classmethod
    def parse_env_list(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return []
            try:
                parsed = json.loads(normalized)
            except json.JSONDecodeError:
                return [item.strip() for item in normalized.split(",") if item.strip()]
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
