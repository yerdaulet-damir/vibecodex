from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# One pool per provider. A misbehaving provider (slow, hanging) cannot
# starve connections destined for healthy providers — that's the bulkhead.
_clients: dict[str, httpx.AsyncClient] = {}


def get_provider_client(provider_name: str) -> httpx.AsyncClient:
    client = _clients.get(provider_name)
    if client is not None and not client.is_closed:
        return client

    settings = get_settings()
    limits = httpx.Limits(
        max_connections=settings.HTTP_MAX_CONNECTIONS,
        max_keepalive_connections=settings.HTTP_MAX_KEEPALIVE,
    )
    client = httpx.AsyncClient(
        timeout=settings.HTTP_TIMEOUT_SECONDS,
        limits=limits,
    )
    _clients[provider_name] = client
    logger.info(
        "bulkhead.client_created",
        extra={"provider_pool": provider_name},
    )
    return client


async def close_all_clients() -> None:
    for name, client in list(_clients.items()):
        try:
            await client.aclose()
        except Exception:  # noqa: BLE001 — shutdown best-effort
            logger.exception("bulkhead.close_failed", extra={"provider_pool": name})
    _clients.clear()
