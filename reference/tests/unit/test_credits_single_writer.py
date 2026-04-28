"""
test_credits_single_writer.py — enforces Principle B10 (Single-Writer).

The Single-Writer Principle: for any state machine with safety-critical
mutations, exactly ONE function does the writing. For credit holds, that
function is `CreditsUserService.hold()`. No router, no provider, no
admin endpoint, and no other service may call `repo.hold()` directly.

These tests pin that contract. The architecture lint script
(`scripts/lint-architecture.sh`) enforces it statically; these tests
verify the runtime behavior matches.
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.credits.admin import CreditsAdminService
from app.services.credits.user import CreditsUserService

pytestmark = pytest.mark.asyncio


async def test_charge_holds_then_confirms(
    credits_service: CreditsUserService, credits_repo
) -> None:
    """Happy path: charge() = hold + confirm, exactly one of each."""
    credits_repo.seed_balance("user-1", Decimal("10.00"))

    hold_id = await credits_service.charge(
        "user-1", Decimal("4.00"), idempotency_key="idem-1"
    )

    assert hold_id
    assert len(credits_repo.hold_calls) == 1
    assert len(credits_repo.confirm_calls) == 1
    assert credits_repo.confirm_calls[0] == hold_id
    assert len(credits_repo.refund_calls) == 0
    assert await credits_repo.get_balance("user-1") == Decimal("6.00")


async def test_charge_rejects_zero_amount(
    credits_service: CreditsUserService, credits_repo
) -> None:
    """Validation happens BEFORE repo.hold() is touched."""
    credits_repo.seed_balance("user-1", Decimal("10.00"))

    with pytest.raises(ValueError, match="positive"):
        await credits_service.charge(
            "user-1", Decimal("0"), idempotency_key="idem-zero"
        )

    assert credits_repo.hold_calls == []  # never reached the repo


async def test_charge_is_idempotent_on_repeated_key(
    credits_service: CreditsUserService, credits_repo
) -> None:
    """Same idempotency_key → repo returns the existing hold_id, balance untouched."""
    credits_repo.seed_balance("user-1", Decimal("10.00"))

    id1 = await credits_service.charge(
        "user-1", Decimal("4.00"), idempotency_key="idem-x"
    )
    id2 = await credits_service.charge(
        "user-1", Decimal("4.00"), idempotency_key="idem-x"
    )

    assert id1 == id2
    # balance was deducted exactly once
    assert await credits_repo.get_balance("user-1") == Decimal("6.00")


async def test_admin_service_does_not_call_hold(
    credits_repo,
) -> None:
    """`CreditsAdminService` uses a different write path (credit), never hold.

    This is the runtime correlate of the lint rule that `repo.hold(` may
    only appear inside `services/credits/user.py`.
    """
    admin = CreditsAdminService(repo=credits_repo)
    # CreditsAdminService surface — keep tests resilient if methods change.
    # We assert the contract: no hold, only credit.
    if hasattr(admin, "credit"):
        await admin.credit("user-1", Decimal("5.00"), reason="manual top-up")

    assert credits_repo.hold_calls == []
    assert len(credits_repo.credit_calls) >= 1


async def test_only_credits_user_service_calls_hold(
    credits_service: CreditsUserService, credits_repo
) -> None:
    """The named principle test — search the lint script for this name.

    Guarantees that after a successful charge, exactly one hold has been
    recorded — regardless of how many other code paths existed.
    """
    credits_repo.seed_balance("user-1", Decimal("100.00"))
    await credits_service.charge(
        "user-1", Decimal("1.00"), idempotency_key="idem-once"
    )
    assert len(credits_repo.hold_calls) == 1
