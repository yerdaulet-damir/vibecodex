from __future__ import annotations

import logging

from app.data.models_catalog import find_model
from app.providers.base import AIProvider, JobRequest, JobResult
from app.providers.exceptions import ProviderError
from app.services.credits.user import CreditsUserService

logger = logging.getLogger(__name__)


async def handle_video_task(
    task_id: str,
    user_id: str,
    request: JobRequest,
    provider: AIProvider,
    credits: CreditsUserService,
) -> JobResult:
    catalog = find_model(request.model_id)
    if catalog is None:
        raise ValueError(f"Unknown model_id: {request.model_id}")

    cost = catalog.cost_usd_per_call
    hold_id = await credits.hold(user_id, cost, idempotency_key=task_id)

    try:
        result = await provider.generate(request)
    except ProviderError as exc:
        logger.warning(
            "task.provider_error",
            extra={"task_id": task_id, "retryable": exc.retryable},
        )
        await credits.refund(hold_id)
        raise
    except Exception:
        logger.exception("task.unexpected_error", extra={"task_id": task_id})
        await credits.refund(hold_id)
        raise

    await credits.confirm(hold_id)
    logger.info(
        "task.video_completed",
        extra={"task_id": task_id, "url": result.url, "cost": str(cost)},
    )
    return result
