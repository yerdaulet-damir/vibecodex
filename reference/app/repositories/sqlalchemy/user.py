from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserModel
from app.repositories.protocols import User


class SQLAlchemyUserRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: str) -> User | None:
        row = await self._session.scalar(
            select(UserModel).where(UserModel.id == user_id)
        )
        return self._to_domain(row) if row else None

    async def get_by_email(self, email: str) -> User | None:
        row = await self._session.scalar(
            select(UserModel).where(UserModel.email == email)
        )
        return self._to_domain(row) if row else None

    @staticmethod
    def _to_domain(row: UserModel) -> User:
        return User(id=row.id, email=row.email, created_at=row.created_at)
