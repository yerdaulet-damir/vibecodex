from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.repositories.protocols import CreditsTransaction


class InMemoryCreditsRepo:
    """Process-local credits repo, useful for tests and local dev.

    Selected when CREDITS_REPO_BACKEND=memory (Principle 8: feature flags).
    """

    def __init__(self) -> None:
        self._balances: dict[str, Decimal] = {}
        self._holds: dict[str, dict[str, object]] = {}
        self._idem: dict[str, str] = {}
        self._ledger: list[CreditsTransaction] = []

    async def get_balance(self, user_id: str) -> Decimal:
        return self._balances.get(user_id, Decimal("0"))

    async def hold(
        self, user_id: str, amount: Decimal, idempotency_key: str
    ) -> str:
        if idempotency_key in self._idem:
            return self._idem[idempotency_key]

        balance = self._balances.get(user_id, Decimal("0"))
        if balance < amount:
            raise ValueError("Insufficient balance.")
        self._balances[user_id] = balance - amount

        hold_id = str(uuid.uuid4())
        self._holds[hold_id] = {
            "user_id": user_id,
            "amount": amount,
            "status": "held",
        }
        self._idem[idempotency_key] = hold_id
        self._record(user_id, amount, "hold", idempotency_key)
        return hold_id

    async def confirm(self, hold_id: str) -> None:
        hold = self._holds.get(hold_id)
        if not hold or hold["status"] != "held":
            return
        hold["status"] = "confirmed"
        self._record(
            str(hold["user_id"]),
            Decimal(str(hold["amount"])),
            "confirm",
        )

    async def refund(self, hold_id: str) -> None:
        hold = self._holds.get(hold_id)
        if not hold or hold["status"] != "held":
            return
        user_id = str(hold["user_id"])
        amount = Decimal(str(hold["amount"]))
        self._balances[user_id] = (
            self._balances.get(user_id, Decimal("0")) + amount
        )
        hold["status"] = "refunded"
        self._record(user_id, amount, "refund")

    async def credit(
        self, user_id: str, amount: Decimal, reason: str
    ) -> None:
        self._balances[user_id] = (
            self._balances.get(user_id, Decimal("0")) + amount
        )
        self._record(user_id, amount, "credit", reason)

    async def get_history(
        self, user_id: str, limit: int
    ) -> list[CreditsTransaction]:
        rows = [t for t in self._ledger if t.user_id == user_id]
        rows.sort(key=lambda t: t.created_at, reverse=True)
        return rows[:limit]

    def _record(
        self,
        user_id: str,
        amount: Decimal,
        kind: str,
        idempotency_key: str | None = None,
    ) -> None:
        self._ledger.append(
            CreditsTransaction(
                id=str(uuid.uuid4()),
                user_id=user_id,
                amount=amount,
                kind=kind,  # type: ignore[arg-type]
                created_at=datetime.now(timezone.utc),
                idempotency_key=idempotency_key,
            )
        )
