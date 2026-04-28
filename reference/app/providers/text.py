from __future__ import annotations

import logging
from decimal import Decimal
from typing import ClassVar

import httpx

from app.core.bulkhead import get_provider_client
from app.core.config import get_settings
from app.core.context import provider_ctx
from app.data.models_catalog import find_model
from app.providers.base import JobRequest, JobResult
from app.providers.exceptions import (
    ProviderError,
    ProviderInvalidResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)

PROVIDER_NAME = "text"
BASE_URL = "https://text-provider.example.com/v1"

logger = logging.getLogger(__name__)


class TextProvider:
    """LLM text generation via a chat-completions style API.

    Implements the AIProvider Protocol. All HTTP error mapping is contained
    here (anti-corruption layer) so services see only the ProviderError
    hierarchy.
    """

    provider_name: ClassVar[str] = PROVIDER_NAME

    async def generate(self, request: JobRequest) -> JobResult:
        provider_ctx.set(PROVIDER_NAME)

        settings = get_settings()
        client = get_provider_client(PROVIDER_NAME)
        headers = {
            "Authorization": f"Bearer {settings.TEXT_API_KEY}",
            "X-Idempotency-Key": request.idempotency_key,
            "Content-Type": "application/json",
        }
        payload = {
            "model": request.model_id,
            "messages": [{"role": "user", "content": request.prompt}],
            **request.params,
        }

        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                "Text provider timed out.", PROVIDER_NAME
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderError(
                f"Text provider network error: {exc}",
                PROVIDER_NAME,
                retryable=True,
            ) from exc

        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", "1"))
            raise ProviderRateLimitError(
                "Text provider rate-limited.", PROVIDER_NAME, retry_after
            )
        if 500 <= resp.status_code < 600:
            raise ProviderError(
                f"Text provider server error {resp.status_code}.",
                PROVIDER_NAME,
                retryable=True,
            )
        if resp.status_code >= 400:
            raise ProviderError(
                f"Text provider client error {resp.status_code}: "
                f"{resp.text[:200]}",
                PROVIDER_NAME,
                retryable=False,
            )

        try:
            data = resp.json()
        except ValueError as exc:
            raise ProviderInvalidResponseError(
                "Text provider returned non-JSON.",
                PROVIDER_NAME,
                raw_response={"text": resp.text[:500]},
            ) from exc

        choices = data.get("choices") or []
        if not choices:
            raise ProviderInvalidResponseError(
                "Text provider response missing choices.",
                PROVIDER_NAME,
                raw_response=data,
            )

        content = choices[0].get("message", {}).get("content", "")
        catalog_entry = find_model(request.model_id)
        cost = (
            catalog_entry.cost_usd_per_call if catalog_entry else Decimal("0")
        )

        return JobResult(
            url="",  # text responses are inline; storage is upstream concern
            cost_usd=cost,
            provider=PROVIDER_NAME,
            model_id=request.model_id,
            metadata={"content": content, "usage": data.get("usage", {})},
        )
