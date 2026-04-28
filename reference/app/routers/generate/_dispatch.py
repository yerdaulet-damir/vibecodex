from __future__ import annotations

import asyncio
import uuid
from typing import Any

from app.providers import get_provider_for
from app.providers.base import JobRequest
from app.schemas.generate import TaskResponse
from app.services.credits.user import CreditsUserService
from app.services.task_store import task_store


async def dispatch_job(
    user_id: str,
    modality: str,
    prompt: str,
    model_id: str,
    params: dict[str, Any],
    credits: CreditsUserService,
) -> TaskResponse:
    """Validate balance, register task, fire-and-forget to handler.

    Principle A5: worker logic lives in services/task_handlers/, not here.
    Principle B6: idempotency key = task_id, so re-runs after a crash
                  never double-charge.
    """
    task_id = str(uuid.uuid4())
    task_store.create(task_id, user_id=user_id, modality=modality)

    request = JobRequest(
        model_id=model_id,
        prompt=prompt,
        format=modality,  # type: ignore[arg-type]
        idempotency_key=task_id,
        params=params,
    )

    # Late import: handlers transitively import the providers package, which
    # imports this dispatcher's siblings — keep the cycle broken.
    from app.services.task_handlers import get_handler  # noqa: PLC0415

    handler = get_handler(modality)
    provider = get_provider_for(modality)

    asyncio.create_task(
        handler(
            task_id=task_id,
            user_id=user_id,
            request=request,
            provider=provider,
            credits=credits,
        )
    )
    return TaskResponse(task_id=task_id, status="queued")
