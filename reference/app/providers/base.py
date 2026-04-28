from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, ClassVar, Literal, Protocol

Format = Literal["image", "video", "audio", "text"]


@dataclass(frozen=True, slots=True)
class JobRequest:
    model_id: str
    prompt: str
    format: Format
    idempotency_key: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class JobResult:
    url: str
    cost_usd: Decimal
    provider: str
    model_id: str
    metadata: dict[str, Any] = field(default_factory=dict)


class AIProvider(Protocol):
    """Provider boundary — services depend on this Protocol, not on httpx."""

    provider_name: ClassVar[str]

    async def generate(self, request: JobRequest) -> JobResult: ...
