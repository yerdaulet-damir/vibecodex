from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from typing import Any

# Request-scoped observability context.
# Each ContextVar lives for the duration of a single async task —
# logs, metrics, and provider calls all read from these without
# threading the values through every function signature.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)
provider_ctx: ContextVar[str | None] = ContextVar("provider", default=None)


def get_log_context() -> dict[str, Any]:
    return {
        "request_id": request_id_ctx.get(),
        "user_id": user_id_ctx.get(),
        "provider": provider_ctx.get(),
    }


class JsonLogFormatter(logging.Formatter):
    """Structured JSON logs enriched with request-scoped context."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        payload.update(get_log_context())

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        # Allow extra={"key": "value"} to propagate.
        for key, value in record.__dict__.items():
            if key in payload or key.startswith("_"):
                continue
            if key in {
                "args", "msg", "levelname", "levelno", "name", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process",
            }:
                continue
            payload[key] = value

        return json.dumps(payload, default=str)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
