from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded once from env at startup.

    Environment-driven config is the only feature-flag mechanism we use —
    `CREDITS_REPO_BACKEND` swaps the credits repository implementation
    without touching call sites (Principle 8).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://localhost/blueprint",
        description="Async SQLAlchemy URL.",
    )
    TEXT_API_KEY: str = Field(default="")
    MEDIA_API_KEY: str = Field(default="")

    CREDITS_REPO_BACKEND: Literal["sqlalchemy", "memory"] = Field(
        default="sqlalchemy"
    )

    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO"
    )

    HTTP_TIMEOUT_SECONDS: float = Field(default=30.0)
    HTTP_MAX_CONNECTIONS: int = Field(default=10)
    HTTP_MAX_KEEPALIVE: int = Field(default=5)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
