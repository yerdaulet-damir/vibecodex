from __future__ import annotations

from typing import Any


class ProviderError(Exception):
    """Domain-level error from any AI provider.

    Anti-corruption layer: providers translate raw HTTP/JSON errors into
    this hierarchy so services never see vendor-specific quirks.
    """

    def __init__(
        self,
        message: str,
        provider: str,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.retryable = retryable


class ProviderRateLimitError(ProviderError):
    def __init__(self, message: str, provider: str, retry_after: int) -> None:
        super().__init__(message, provider, retryable=True)
        self.retry_after = retry_after


class ProviderTimeoutError(ProviderError):
    def __init__(self, message: str, provider: str) -> None:
        super().__init__(message, provider, retryable=True)


class ProviderInvalidResponseError(ProviderError):
    def __init__(
        self,
        message: str,
        provider: str,
        raw_response: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, provider, retryable=False)
        self.raw_response = raw_response or {}
