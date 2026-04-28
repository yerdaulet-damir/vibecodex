---
name: add-provider
description: Checklist for adding a new AI provider (image, video, text, audio) that satisfies all 5 integration principles — ACL, bulkhead, idempotency, observability, and contract test. Load when integrating any new external AI API. Prevents the most common mistake of pasting httpx calls directly into a service.
---

# add-provider

A provider added wrong leaks its API shape into your business logic. One API change from the vendor → rewrite half your service. Follow this checklist.

---

## Step 1 — Decide: file or folder?

| Provider supports | Structure |
|------------------|-----------|
| One modality (text only, image only) | `app/providers/<name>.py` |
| Multiple modalities (image + video) | `app/providers/<name>/` with `image.py`, `video.py`, `__init__.py` |

Principle A4: one file per format when a provider handles multiple formats.

---

## Step 2 — Create the provider file from this template

```python
# app/providers/<name>.py  (or app/providers/<name>/image.py)
from __future__ import annotations

import logging
from decimal import Decimal

import httpx

from app.core.bulkhead import get_provider_client   # Principle B5
from app.core.context import provider_ctx           # Principle B7
from app.providers.base import AIProvider, JobRequest, JobResult
from app.providers.exceptions import (
    ProviderError,
    ProviderInvalidResponseError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)

logger = logging.getLogger(__name__)


class <Name>Provider:
    provider_name = "<name>"                        # used in logs + bulkhead key

    async def generate(self, request: JobRequest) -> JobResult:
        provider_ctx.set(self.provider_name)        # Principle B7: set before any I/O
        client = get_provider_client(self.provider_name)  # Principle B5: isolated client

        try:
            response = await client.post(
                "/v1/generate",
                json=self._build_payload(request),
                headers={"X-Idempotency-Key": request.idempotency_key},  # Principle B6
                timeout=30.0,
            )
            response.raise_for_status()
        except httpx.TimeoutException as e:
            raise ProviderTimeoutError(
                message=str(e), provider=self.provider_name, retryable=True
            ) from e
        except httpx.HTTPStatusError as e:
            self._map_http_error(e)

        return self._parse_response(response.json(), request)  # Principle B3: ACL here

    def _build_payload(self, request: JobRequest) -> dict:
        return {"prompt": request.prompt, "model": request.model_id, **request.params}

    def _parse_response(self, data: dict, request: JobRequest) -> JobResult:
        # ACL: validate and map to our domain type. Never return raw data.
        try:
            url = data["output"]["url"]          # adjust to actual provider shape
            cost = Decimal(str(data.get("cost", "0")))
        except (KeyError, TypeError) as e:
            raise ProviderInvalidResponseError(
                message=f"Unexpected response shape: {e}",
                provider=self.provider_name,
                retryable=False,
                raw_response=data,
            ) from e
        return JobResult(
            url=url,
            cost_usd=cost,
            provider=self.provider_name,
            model_id=request.model_id,
        )

    def _map_http_error(self, e: httpx.HTTPStatusError) -> None:
        if e.response.status_code == 429:
            retry_after = int(e.response.headers.get("Retry-After", 60))
            raise ProviderRateLimitError(
                message="Rate limited",
                provider=self.provider_name,
                retryable=True,
                retry_after=retry_after,
            ) from e
        raise ProviderError(
            message=f"HTTP {e.response.status_code}",
            provider=self.provider_name,
            retryable=e.response.status_code >= 500,
        ) from e
```

---

## Step 3 — Register in bulkhead (if not auto-registered)

`get_provider_client("<name>")` auto-creates an isolated `httpx.AsyncClient` on first call with the limits from `settings.HTTP_MAX_CONNECTIONS`. No extra step needed unless the provider needs custom limits:

```python
# app/core/bulkhead.py — only if non-default limits needed
_PROVIDER_LIMITS = {
    "<name>": httpx.Limits(max_connections=5, max_keepalive_connections=2),
}
```

---

## Step 4 — Add contract test snapshot

Create a fixture with a real (or realistic) provider response:

```bash
touch reference/tests/fixtures/<name>_response.json
```

```json
{
  "output": { "url": "https://cdn.example.com/result.png" },
  "cost": "0.004",
  "id": "job_abc123"
}
```

Add a parser test in `tests/integration/test_provider_contracts.py`:

```python
def test_<name>_response_parses_to_job_result(load_fixture):
    raw = load_fixture("<name>_response.json")
    provider = <Name>Provider()
    request = JobRequest(model_id="m", prompt="p", modality="image",
                         idempotency_key="k")
    result = provider._parse_response(raw, request)
    assert isinstance(result, JobResult)
    assert result.url.startswith("https://")
    assert result.cost_usd >= Decimal("0")
```

This test breaks in CI when the provider changes their response shape. That's the point.

---

## Step 5 — Export from providers package

```python
# app/providers/__init__.py
from app.providers.<name> import <Name>Provider

__all__ = [..., "<Name>Provider"]
```

---

## Verification checklist

| Principle | Check |
|-----------|-------|
| B3 — ACL: returns JobResult not dict | `_parse_response` returns `JobResult` |
| B5 — Bulkhead: isolated client | uses `get_provider_client(self.provider_name)` |
| B6 — Idempotency: key forwarded | `headers={"X-Idempotency-Key": request.idempotency_key}` |
| B7 — Observability: context set | `provider_ctx.set(self.provider_name)` before I/O |
| B9 — Contract test exists | fixture + parser test in `test_provider_contracts.py` |

```bash
# Run the contract test
pytest tests/integration/test_provider_contracts.py -v

# Architecture lint still passes
bash scripts/lint-architecture.sh
```

Both must be green before the provider is considered done.
