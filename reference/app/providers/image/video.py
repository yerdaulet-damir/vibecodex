from __future__ import annotations

from decimal import Decimal
from typing import ClassVar

from app.core.context import provider_ctx
from app.data.models_catalog import find_model
from app.providers.base import JobRequest, JobResult
from app.providers.exceptions import ProviderInvalidResponseError
from app.providers.image._client import PROVIDER_NAME, call_media


class VideoProvider:
    provider_name: ClassVar[str] = PROVIDER_NAME

    async def generate(self, request: JobRequest) -> JobResult:
        provider_ctx.set(PROVIDER_NAME)

        payload = {
            "prompt": request.prompt,
            "duration_seconds": request.params.get("duration_seconds", 5),
            "aspect_ratio": request.params.get("aspect_ratio", "16:9"),
            "idempotency_key": request.idempotency_key,
        }
        data = await call_media(f"/{request.model_id}", payload)

        video = data.get("video") or {}
        url = video.get("url")
        if not url:
            raise ProviderInvalidResponseError(
                "Media provider video response missing url.",
                PROVIDER_NAME,
                raw_response=data,
            )

        catalog_entry = find_model(request.model_id)
        cost = (
            catalog_entry.cost_usd_per_call if catalog_entry else Decimal("0")
        )

        return JobResult(
            url=url,
            cost_usd=cost,
            provider=PROVIDER_NAME,
            model_id=request.model_id,
            metadata={
                "duration_seconds": payload["duration_seconds"],
                "aspect_ratio": payload["aspect_ratio"],
            },
        )
