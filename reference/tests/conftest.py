"""
conftest.py — the reference pattern for testing with Protocol-based DI.

Why a Fake (not a Mock):
    Fakes implement the Protocol — `FakeCreditsRepo` satisfies
    `CreditsRepoProtocol`. If the protocol grows a new method, the fake
    breaks at *import time* (mypy / runtime), not deep inside a flaky test.
    Mocks pretend forever; fakes catch interface drift.

Used by every test in this folder. Add new fakes here, not inline.
"""

from __future__ import annotations

import sys
import uuid
from decimal import Decimal
from pathlib import Path

import pytest

# Make `app.*` importable when running `pytest` from the repo root.
APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from app.repositories.protocols import (  # noqa: E402
    CreditsRepoProtocol,
    CreditsTransaction,
)
from app.services.credits.user import CreditsUserService  # noqa: E402


class FakeCreditsRepo:
    """In-memory `CreditsRepoProtocol` implementation for tests.

    Spy lists (`hold_calls`, `confirm_calls`, `refund_calls`) let assertions
    verify which paths the code under test actually exercised — essential
    for the Single-Writer test (Principle B10).
    """

    def __init__(self) -> None:
        self._balances: dict[str, Decimal] = {}
        self._holds: dict[str, dict] = {}
        self._idem: dict[str, str] = {}
        self._ledger: list[CreditsTransaction] = []

        # Spies — read-only from tests.
        self.hold_calls: list[dict] = []
        self.confirm_calls: list[str] = []
        self.refund_calls: list[str] = []
        self.credit_calls: list[dict] = []

    # --- helpers used only by tests --------------------------------------
    def seed_balance(self, user_id: str, amount: Decimal) -> None:
        self._balances[user_id] = amount

    # --- CreditsRepoProtocol ---------------------------------------------
    async def get_balance(self, user_id: str) -> Decimal:
        return self._balances.get(user_id, Decimal("0"))

    async def hold(
        self, user_id: str, amount: Decimal, idempotency_key: str
    ) -> str:
        self.hold_calls.append(
            {"user_id": user_id, "amount": amount, "idempotency_key": idempotency_key}
        )
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
        return hold_id

    async def confirm(self, hold_id: str) -> None:
        self.confirm_calls.append(hold_id)
        h = self._holds.get(hold_id)
        if h and h["status"] == "held":
            h["status"] = "confirmed"

    async def refund(self, hold_id: str) -> None:
        self.refund_calls.append(hold_id)
        h = self._holds.get(hold_id)
        if not h or h["status"] != "held":
            return
        user_id = str(h["user_id"])
        amount = Decimal(str(h["amount"]))
        self._balances[user_id] = (
            self._balances.get(user_id, Decimal("0")) + amount
        )
        h["status"] = "refunded"

    async def credit(
        self, user_id: str, amount: Decimal, reason: str
    ) -> None:
        self.credit_calls.append(
            {"user_id": user_id, "amount": amount, "reason": reason}
        )
        self._balances[user_id] = (
            self._balances.get(user_id, Decimal("0")) + amount
        )

    async def get_history(
        self, user_id: str, limit: int
    ) -> list[CreditsTransaction]:
        return [t for t in self._ledger if t.user_id == user_id][:limit]


# Import-time check — if `CreditsRepoProtocol` grows a new method,
# this assignment fails at module load and every test errors loudly.
_repo_check: CreditsRepoProtocol = FakeCreditsRepo()  # noqa: F841


# --- Fixtures ---------------------------------------------------------------
@pytest.fixture
def credits_repo() -> FakeCreditsRepo:
    """Fresh in-memory repo for each test."""
    return FakeCreditsRepo()


@pytest.fixture
def credits_service(credits_repo: FakeCreditsRepo) -> CreditsUserService:
    """`CreditsUserService` wired to the fake repo."""
    return CreditsUserService(repo=credits_repo)
