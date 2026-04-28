from __future__ import annotations

import logging
from decimal import Decimal

from app.services.credits.protocols import (
    CreditsRepoProtocol,
    CreditsTransaction,
)

logger = logging.getLogger(__name__)


class CreditsUserService:
    """Single-writer for user-driven credit mutations.

    Principle 10 (Integration): all hold/confirm/refund flows for user
    charges go through this class. Admin operations live in
    `CreditsAdminService` — they never share a write path.
    """

    def __init__(self, repo: CreditsRepoProtocol) -> None:
        self._repo = repo

    async def get_balance(self, user_id: str) -> Decimal:
        return await self._repo.get_balance(user_id)

    async def get_history(
        self, user_id: str, limit: int = 50
    ) -> list[CreditsTransaction]:
        return await self._repo.get_history(user_id, limit)

    async def hold(
        self, user_id: str, amount: Decimal, idempotency_key: str
    ) -> str:
        if amount <= 0:
            raise ValueError("Amount must be positive.")
        hold_id = await self._repo.hold(user_id, amount, idempotency_key)
        logger.info(
            "credits.hold_created",
            extra={"hold_id": hold_id, "amount": str(amount)},
        )
        return hold_id

    async def confirm(self, hold_id: str) -> None:
        await self._repo.confirm(hold_id)
        logger.info("credits.hold_confirmed", extra={"hold_id": hold_id})

    async def refund(self, hold_id: str) -> None:
        await self._repo.refund(hold_id)
        logger.info("credits.hold_refunded", extra={"hold_id": hold_id})

    async def charge(
        self, user_id: str, amount: Decimal, idempotency_key: str
    ) -> str:
        """Convenience: HOLD then CONFIRM in a single call.

        Used for synchronous, in-request charges. Async pipelines (job
        handlers) call hold/confirm separately so refund-on-failure stays
        possible.
        """
        hold_id = await self.hold(user_id, amount, idempotency_key)
        await self.confirm(hold_id)
        return hold_id
