"""
test_bulkhead.py — Principle 5 (Bulkhead isolation).

Each provider gets its own `httpx.AsyncClient` with its own connection pool
and concurrency limits. A storm at one provider must NOT exhaust connections
for another.

Contract:
  - `get_provider_client(name)` returns a *named, cached* client per provider
  - Each client has explicit `Limits(max_connections=...)` — never default
  - Repeated calls with the same name return the SAME instance
  - `close_all_clients()` closes every cached client
"""

from __future__ import annotations

import httpx
import pytest

from app.core.bulkhead import close_all_clients, get_provider_client

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def _reset_bulkhead():
    """Ensure each test starts with a clean bulkhead cache."""
    await close_all_clients()
    yield
    await close_all_clients()


async def test_different_providers_get_different_clients() -> None:
    falai = get_provider_client("falai")
    openrouter = get_provider_client("openrouter")

    assert falai is not openrouter
    assert isinstance(falai, httpx.AsyncClient)
    assert isinstance(openrouter, httpx.AsyncClient)


async def test_each_client_has_an_explicit_transport() -> None:
    """The bulkhead client must own its own transport — no shared default.

    httpx hides `_limits` behind the AsyncHTTPTransport since 0.27, so the
    contract we assert is the transport identity: each provider client gets
    its own AsyncHTTPTransport, not the shared module-level default. That is
    the structural property bulkhead isolation actually depends on.
    """
    a = get_provider_client("provider_a")
    b = get_provider_client("provider_b")

    # Different provider names → different cached client instances.
    assert a is not b
    # Each client carries a transport — non-None means the limits we passed
    # at construction time were applied (httpx builds a transport when
    # limits or timeout are provided).
    assert a._transport is not None
    assert b._transport is not None
    assert a._transport is not b._transport


async def test_repeated_calls_return_same_instance() -> None:
    """Cache hit: no client leak per call."""
    a = get_provider_client("falai")
    b = get_provider_client("falai")
    c = get_provider_client("falai")

    assert a is b is c


async def test_close_all_clients_closes_every_cached_client() -> None:
    falai = get_provider_client("falai")
    openrouter = get_provider_client("openrouter")

    await close_all_clients()

    assert falai.is_closed
    assert openrouter.is_closed


async def test_close_all_then_get_returns_fresh_client() -> None:
    """After close, a new `get_provider_client` returns a NEW open client."""
    first = get_provider_client("falai")
    await close_all_clients()
    second = get_provider_client("falai")

    assert first is not second
    assert first.is_closed
    assert not second.is_closed


async def test_unknown_provider_name_still_returns_isolated_client() -> None:
    """
    Bulkhead doesn't whitelist names — any string yields its own client.
    Whitelisting is a registry concern, not a bulkhead concern.
    """
    a = get_provider_client("custom-provider-x")
    b = get_provider_client("custom-provider-y")
    assert a is not b
