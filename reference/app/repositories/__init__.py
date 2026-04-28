from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.repositories.memory import InMemoryCreditsRepo
from app.repositories.protocols import (
    CreditsRepoProtocol,
    CreditsTransaction,
    User,
    UserRepoProtocol,
)
from app.repositories.sqlalchemy import (
    SQLAlchemyCreditsRepo,
    SQLAlchemyUserRepo,
)

# One process-wide memory repo so the in-memory backend behaves as expected
# across requests (a fresh repo per request would discard balances).
_memory_credits_repo = InMemoryCreditsRepo()


def get_credits_repo(
    db: AsyncSession = Depends(get_db),
) -> CreditsRepoProtocol:
    backend = get_settings().CREDITS_REPO_BACKEND
    if backend == "memory":
        return _memory_credits_repo
    return SQLAlchemyCreditsRepo(db)


def get_user_repo(
    db: AsyncSession = Depends(get_db),
) -> UserRepoProtocol:
    return SQLAlchemyUserRepo(db)


__all__ = [
    "CreditsRepoProtocol",
    "CreditsTransaction",
    "User",
    "UserRepoProtocol",
    "get_credits_repo",
    "get_user_repo",
]
