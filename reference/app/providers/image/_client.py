from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.bulkhead import get_provider_client
from app.core.config import get_settings
from app.core.context import provider_ctx
from app.providers.exceptions import (
    ProviderError,
    ProviderInvalidResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)

PROVIDER_NAME = "image"
BASE_URL = "https://media-provider.example.com"

logger = logging.getLogger(__name__)


async def call_media(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Single network entrypoint for the media provider.

    All HTTP error mapping lives here so concrete providers (image, video)
    only translate response shape — never status codes or transport errors.
    """
    provider_ctx.set(PROVIDER_NAME)

    settings = get_settings()
    client = get_provider_client(PROVIDER_NAME)
    headers = {
        "Authorization": f"Bearer {settings.MEDIA_API_KEY}",
        "X-Idempotency-Key": payload.get("idempotency_key", ""),
        "Content-Type": "application/json",
    }

    try:
        resp = await client.post(
            f"{BASE_URL}{path}", json=payload, headers=headers
        )
    except httpx.TimeoutException as exc:
        raise ProviderTimeoutError(
            "Media provider request timed out.", PROVIDER_NAME
        ) from exc
    except httpx.HTTPError as exc:
        raise ProviderError(
            f"Media provider network error: {exc}",
            PROVIDER_NAME,
            retryable=True,
        ) from exc

    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", "1"))
        raise ProviderRateLimitError(
            "Media provider rate-limited.", PROVIDER_NAME, retry_after
        )
    if 500 <= resp.status_code < 600:
        raise ProviderError(
            f"Media provider server error {resp.status_code}.",
            PROVIDER_NAME,
            retryable=True,
        )
    if resp.status_code >= 400:
        raise ProviderError(
            f"Media provider client error {resp.status_code}: "
            f"{resp.text[:200]}",
            PROVIDER_NAME,
            retryable=False,
        )

    try:
        return resp.json()
    except ValueError as exc:
        raise ProviderInvalidResponseError(
            "Media provider returned non-JSON.",
            PROVIDER_NAME,
            raw_response={"text": resp.text[:500]},
        ) from exc
