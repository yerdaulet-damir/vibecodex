from __future__ import annotations

from typing import Protocol

from app.data.models_catalog import find_model
from app.providers.base import AIProvider
from app.providers.image import ImageProvider, VideoProvider
from app.providers.text import TextProvider


class ProviderRoutingStrategy(Protocol):
    """Strategy Pattern (Principle 4): different rules compose without
    if-else trees."""

    def select(self, model_id: str, format: str) -> AIProvider | None: ...


class CatalogStrategy:
    """Look the model up in the catalog and instantiate the matching
    provider."""

    def select(self, model_id: str, format: str) -> AIProvider | None:
        entry = find_model(model_id)
        if entry is None or entry.format != format:
            return None
        return _build(entry.provider, format)


class StaticDefaultStrategy:
    """Fallback when the catalog is silent — useful for new models in beta."""

    def __init__(self, defaults: dict[str, str]) -> None:
        self._defaults = defaults  # format → provider name

    def select(self, model_id: str, format: str) -> AIProvider | None:
        provider = self._defaults.get(format)
        return _build(provider, format) if provider else None


class CompositeStrategy:
    """Tries strategies in order — first hit wins."""

    def __init__(self, *strategies: ProviderRoutingStrategy) -> None:
        self._strategies = strategies

    def select(self, model_id: str, format: str) -> AIProvider | None:
        for s in self._strategies:
            provider = s.select(model_id, format)
            if provider is not None:
                return provider
        return None


def _build(provider_name: str | None, format: str) -> AIProvider | None:
    if provider_name == "image" and format == "image":
        return ImageProvider()
    if provider_name == "image" and format == "video":
        return VideoProvider()
    if provider_name == "text":
        return TextProvider()
    return None


def default_strategy() -> ProviderRoutingStrategy:
    return CompositeStrategy(
        CatalogStrategy(),
        StaticDefaultStrategy(
            {"image": "image", "video": "image", "text": "text"}
        ),
    )
