from __future__ import annotations

from decimal import Decimal
from typing import ClassVar

from app.core.context import provider_ctx
from app.data.models_catalog import find_model
from app.providers.base import JobRequest, JobResult
from app.providers.exceptions import ProviderInvalidResponseError
from app.providers.image._client import PROVIDER_NAME, call_media


class ImageProvider:
    provider_name: ClassVar[str] = PROVIDER_NAME

    async def generate(self, request: JobRequest) -> JobResult:
        provider_ctx.set(PROVIDER_NAME)

        payload = {
            "prompt": request.prompt,
            "image_size": request.params.get("image_size", "square_hd"),
            "width": request.params.get("width", 1024),
            "height": request.params.get("height", 1024),
            "idempotency_key": request.idempotency_key,
        }
        data = await call_media(f"/{request.model_id}", payload)

        images = data.get("images") or []
        if not images or "url" not in images[0]:
            raise ProviderInvalidResponseError(
                "Media provider image response missing url.",
                PROVIDER_NAME,
                raw_response=data,
            )

        catalog_entry = find_model(request.model_id)
        cost = (
            catalog_entry.cost_usd_per_call if catalog_entry else Decimal("0")
        )

        return JobResult(
            url=images[0]["url"],
            cost_usd=cost,
            provider=PROVIDER_NAME,
            model_id=request.model_id,
            metadata={
                "width": payload["width"],
                "height": payload["height"],
            },
        )
