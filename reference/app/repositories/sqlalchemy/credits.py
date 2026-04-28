from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credits import CreditBalance, CreditHold, CreditLedger
from app.repositories.protocols import CreditsTransaction


class SQLAlchemyCreditsRepo:
    """Concrete adapter — only this layer touches the ORM."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_balance(self, user_id: str) -> Decimal:
        row = await self._session.scalar(
            select(CreditBalance).where(CreditBalance.user_id == user_id)
        )
        return row.balance if row else Decimal("0")

    async def hold(
        self, user_id: str, amount: Decimal, idempotency_key: str
    ) -> str:
        # Idempotency: replay of the same key returns the same hold_id.
        existing = await self._session.scalar(
            select(CreditHold).where(
                CreditHold.idempotency_key == idempotency_key
            )
        )
        if existing is not None:
            return str(existing.id)

        # Lock the balance row to prevent concurrent overdrafts.
        balance = await self._session.scalar(
            select(CreditBalance)
            .where(CreditBalance.user_id == user_id)
            .with_for_update()
        )
        if balance is None or balance.balance < amount:
            raise ValueError("Insufficient balance.")

        balance.balance -= amount
        balance.updated_at = datetime.now(timezone.utc)

        hold = CreditHold(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            idempotency_key=idempotency_key,
            status="held",
            created_at=datetime.now(timezone.utc),
        )
        self._session.add(hold)
        self._session.add(
            self._ledger(user_id, amount, "hold", idempotency_key)
        )
        await self._session.commit()
        return hold.id

    async def confirm(self, hold_id: str) -> None:
        hold = await self._load_hold_for_update(hold_id)
        if hold.status != "held":
            return
        hold.status = "confirmed"
        self._session.add(self._ledger(hold.user_id, hold.amount, "confirm"))
        await self._session.commit()

    async def refund(self, hold_id: str) -> None:
        hold = await self._load_hold_for_update(hold_id)
        if hold.status != "held":
            return

        balance = await self._session.scalar(
            select(CreditBalance)
            .where(CreditBalance.user_id == hold.user_id)
            .with_for_update()
        )
        if balance is None:
            raise RuntimeError("Balance row missing during refund.")

        balance.balance += hold.amount
        balance.updated_at = datetime.now(timezone.utc)
        hold.status = "refunded"
        self._session.add(self._ledger(hold.user_id, hold.amount, "refund"))
        await self._session.commit()

    async def credit(
        self, user_id: str, amount: Decimal, reason: str
    ) -> None:
        balance = await self._session.scalar(
            select(CreditBalance)
            .where(CreditBalance.user_id == user_id)
            .with_for_update()
        )
        now = datetime.now(timezone.utc)
        if balance is None:
            balance = CreditBalance(
                user_id=user_id, balance=amount, updated_at=now
            )
            self._session.add(balance)
        else:
            balance.balance += amount
            balance.updated_at = now

        self._session.add(self._ledger(user_id, amount, "credit", reason))
        await self._session.commit()

    async def get_history(
        self, user_id: str, limit: int
    ) -> list[CreditsTransaction]:
        rows = await self._session.scalars(
            select(CreditLedger)
            .where(CreditLedger.user_id == user_id)
            .order_by(CreditLedger.created_at.desc())
            .limit(limit)
        )
        return [
            CreditsTransaction(
                id=str(r.id),
                user_id=r.user_id,
                amount=r.amount,
                kind=r.kind,
                created_at=r.created_at,
                idempotency_key=r.idempotency_key,
            )
            for r in rows
        ]

    async def _load_hold_for_update(self, hold_id: str) -> CreditHold:
        hold = await self._session.scalar(
            select(CreditHold)
            .where(CreditHold.id == hold_id)
            .with_for_update()
        )
        if hold is None:
            raise ValueError(f"Hold {hold_id} not found.")
        return hold

    @staticmethod
    def _ledger(
        user_id: str,
        amount: Decimal,
        kind: str,
        idempotency_key: str | None = None,
    ) -> CreditLedger:
        return CreditLedger(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            kind=kind,
            idempotency_key=idempotency_key,
            created_at=datetime.now(timezone.utc),
        )
