from __future__ import annotations

import logging
from decimal import Decimal

from app.services.credits.protocols import CreditsRepoProtocol

logger = logging.getLogger(__name__)


class CreditsAdminService:
    """Admin-side write paths — top-ups and out-of-band refunds.

    Principle 6 (Structural): user-API ≠ admin-API. Even though both
    services use the same repo, separating them prevents an admin endpoint
    from accidentally invoking user-charge logic and vice versa.
    """

    def __init__(self, repo: CreditsRepoProtocol) -> None:
        self._repo = repo

    async def credit(
        self, user_id: str, amount: Decimal, reason: str
    ) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive.")
        await self._repo.credit(user_id, amount, reason)
        logger.info(
            "credits.admin_credit",
            extra={
                "target_user_id": user_id,
                "amount": str(amount),
                "reason": reason,
            },
        )

    async def refund(self, hold_id: str) -> None:
        await self._repo.refund(hold_id)
        logger.info("credits.admin_refund", extra={"hold_id": hold_id})
