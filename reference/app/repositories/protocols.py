from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal, Protocol

# Domain value objects. Services depend on these — never on SQLAlchemy
# rows — which keeps the hexagon's inside clean (Principle 1, Integration).

CreditsTxKind = Literal["hold", "confirm", "refund", "credit"]


@dataclass(frozen=True, slots=True)
class CreditsTransaction:
    id: str
    user_id: str
    amount: Decimal
    kind: CreditsTxKind
    created_at: datetime
    idempotency_key: str | None = None


@dataclass(frozen=True, slots=True)
class User:
    id: str
    email: str
    created_at: datetime


class CreditsRepoProtocol(Protocol):
    async def get_balance(self, user_id: str) -> Decimal: ...

    async def hold(
        self, user_id: str, amount: Decimal, idempotency_key: str
    ) -> str: ...

    async def confirm(self, hold_id: str) -> None: ...

    async def refund(self, hold_id: str) -> None: ...

    async def credit(
        self, user_id: str, amount: Decimal, reason: str
    ) -> None: ...

    async def get_history(
        self, user_id: str, limit: int
    ) -> list[CreditsTransaction]: ...


class UserRepoProtocol(Protocol):
    async def get_by_id(self, user_id: str) -> User | None: ...

    async def get_by_email(self, email: str) -> User | None: ...
