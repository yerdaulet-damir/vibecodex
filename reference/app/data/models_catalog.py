"""Static catalog data — lives separately from routing/strategy logic.

Principle 2 (Structural): swap the catalog (or load it from a file/DB)
without touching the strategy that picks providers from it.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

Format = Literal["image", "video", "audio", "text"]


@dataclass(frozen=True, slots=True)
class ModelEntry:
    model_id: str
    provider: str
    format: Format
    cost_usd_per_call: Decimal


CATALOG: tuple[ModelEntry, ...] = (
    ModelEntry("image-pro", "image", "image", Decimal("0.05")),
    ModelEntry("image-fast", "image", "image", Decimal("0.01")),
    ModelEntry("video-standard", "image", "video", Decimal("0.50")),
    ModelEntry("text-large", "text", "text", Decimal("0.003")),
)


def find_model(model_id: str) -> ModelEntry | None:
    return next((m for m in CATALOG if m.model_id == model_id), None)


def models_for_format(fmt: Format) -> tuple[ModelEntry, ...]:
    return tuple(m for m in CATALOG if m.format == fmt)
