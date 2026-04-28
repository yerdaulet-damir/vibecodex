"""Async SQLAlchemy session factory.

The engine is created lazily on first use — never at import time. This means:

  * Tests that exercise the in-memory repo never touch the DB driver.
  * Tooling (architecture lint, OpenAPI export, mypy) does not require asyncpg.
  * The DB connection is only opened when a request actually needs it.

Anti-pattern we deliberately avoid:
    engine = create_async_engine(get_settings().DATABASE_URL)  # at module top
This forces every import-time consumer to install asyncpg and resolves
config eagerly. Lazy is right.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        future=True,
    )


@lru_cache(maxsize=1)
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=get_engine(),
        expire_on_commit=False,
        class_=AsyncSession,
    )


async def get_db() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session


async def dispose_engine() -> None:
    """Called from the FastAPI lifespan on shutdown."""
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
