from __future__ import annotations

from app.providers.base import AIProvider, JobRequest, JobResult
from app.providers.exceptions import (
    ProviderError,
    ProviderInvalidResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)
from app.providers.image import ImageProvider, VideoProvider
from app.providers.text import TextProvider

# Process-wide singletons. Each provider owns its bulkhead client (Principle B5),
# so creating one per request would defeat connection pooling.
_image = ImageProvider()
_video = VideoProvider()
_text = TextProvider()

_BY_MODALITY: dict[str, AIProvider] = {
    "image": _image,
    "video": _video,
    "text": _text,
}


def get_provider_for(modality: str) -> AIProvider:
    """Return the singleton AIProvider for a modality.

    New modality = one line here. Switching providers (Principle B8 feature flag)
    happens at this single seam.
    """
    try:
        return _BY_MODALITY[modality]
    except KeyError as e:
        raise ValueError(f"No provider registered for modality: {modality}") from e


__all__ = [
    "AIProvider",
    "JobRequest",
    "JobResult",
    "ProviderError",
    "ProviderInvalidResponseError",
    "ProviderRateLimitError",
    "ProviderTimeoutError",
    "ImageProvider",
    "VideoProvider",
    "TextProvider",
    "get_provider_for",
]
