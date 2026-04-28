from __future__ import annotations

from typing import Awaitable, Callable

from app.providers.base import AIProvider, JobRequest, JobResult
from app.services.credits.user import CreditsUserService
from app.services.task_handlers.image_handler import handle_image_task
from app.services.task_handlers.video_handler import handle_video_task

# Modality → handler registry. Adding a new modality = one line here.
TaskHandler = Callable[..., Awaitable[JobResult]]

_HANDLERS: dict[str, TaskHandler] = {
    "image": handle_image_task,
    "video": handle_video_task,
}


def get_handler(modality: str) -> TaskHandler:
    """Look up the worker handler for a given modality."""
    try:
        return _HANDLERS[modality]
    except KeyError as e:
        raise ValueError(f"No handler registered for modality: {modality}") from e


__all__ = [
    "AIProvider",
    "JobRequest",
    "JobResult",
    "CreditsUserService",
    "TaskHandler",
    "get_handler",
    "handle_image_task",
    "handle_video_task",
]
