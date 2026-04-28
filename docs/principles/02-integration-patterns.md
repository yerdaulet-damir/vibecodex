# Part B — Integration Patterns

> 10 architectural principles that govern how the application talks to **databases, external APIs, and itself** without coupling rotting in.

If Part A is *"how do I split this file?"*, Part B is *"how do I keep these layers from leaking into each other?"*. Each principle isolates one form of coupling that wrecks long-lived FastAPI codebases.

Each principle includes:
- Summary
- The **problem** (a concrete bad pattern)
- The **solution** (complete code, runnable, no placeholders)
- FastAPI-specific implementation notes
- The **impact** of skipping it

---

## B1 — Hexagonal / Ports & Adapters

**Summary:** services never import infrastructure. The outside world enters through Protocol-typed parameters injected at the edge.

### Problem (BEFORE)

```python
# app/services/wallet_service.py
from sqlalchemy.orm import Session
from app.models.wallet import Wallet

class WalletService:
    def __init__(self, db: Session):
        self._db = db

    async def charge(self, user_id: str, amount: Decimal) -> Wallet:
        wallet = self._db.query(Wallet).filter(Wallet.user_id == user_id).with_for_update().one()
        if wallet.balance < amount:
            raise InsufficientFundsError()
        wallet.balance -= amount
        self._db.commit()
        return wallet
```

Why this hurts:
- The service depends on `sqlalchemy`. Tests must spin up a database or mock `Session`.
- Migrating to a new backend (DynamoDB, Supabase) means rewriting the service.
- Service code is full of ORM idioms (`with_for_update`, `commit`) that have nothing to do with business rules.

### Solution (AFTER)

```python
# app/repositories/protocols.py
from typing import Protocol, AsyncContextManager
from app.domain.wallet import Wallet, LedgerEntry

class WalletRepoProtocol(Protocol):
    async def get(self, user_id: str) -> Wallet: ...
    def lock(self, user_id: str) -> AsyncContextManager[None]: ...
    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None: ...
```

```python
# app/domain/wallet.py — pure domain, no infra imports
from dataclasses import dataclass, replace
from decimal import Decimal
from uuid import UUID
from datetime import datetime, timezone
from enum import Enum

class EntryKind(str, Enum):
    HOLD = "hold"; DEDUCT = "deduct"; REFUND = "refund"; ADMIN_CREDIT = "admin_credit"

@dataclass(frozen=True)
class LedgerEntry:
    user_id: str
    kind: EntryKind
    amount: Decimal
    key: UUID
    created_at: datetime
    reason: str | None = None

    @classmethod
    def hold(cls, user_id: str, amount: Decimal, key: UUID) -> "LedgerEntry":
        return cls(user_id, EntryKind.HOLD, amount, key, datetime.now(timezone.utc))

    @classmethod
    def deduct(cls, user_id: str, amount: Decimal, key: UUID) -> "LedgerEntry":
        return cls(user_id, EntryKind.DEDUCT, amount, key, datetime.now(timezone.utc))

    @classmethod
    def refund(cls, user_id: str, amount: Decimal, key: UUID) -> "LedgerEntry":
        return cls(user_id, EntryKind.REFUND, amount, key, datetime.now(timezone.utc))

    @classmethod
    def admin_credit(cls, user_id: str, amount: Decimal, reason: str, key: UUID) -> "LedgerEntry":
        return cls(user_id, EntryKind.ADMIN_CREDIT, amount, key, datetime.now(timezone.utc), reason)

@dataclass(frozen=True)
class Wallet:
    user_id: str
    balance: Decimal
    version: int

    def can_apply(self, e: LedgerEntry) -> bool:
        if e.kind in (EntryKind.HOLD, EntryKind.DEDUCT):
            return self.balance >= e.amount
        return True

    def apply(self, e: LedgerEntry) -> "Wallet":
        if e.kind in (EntryKind.HOLD, EntryKind.DEDUCT):
            return replace(self, balance=self.balance - e.amount, version=self.version + 1)
        return replace(self, balance=self.balance + e.amount, version=self.version + 1)
```

```python
# app/services/wallet/user.py
from decimal import Decimal
from uuid import UUID
from app.repositories.protocols import WalletRepoProtocol
from app.domain.wallet import Wallet, LedgerEntry
from ._writer import apply_ledger_entry

class WalletUserService:
    def __init__(self, repo: WalletRepoProtocol):
        self._repo = repo

    async def charge(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(self._repo, LedgerEntry.deduct(user_id, amount, key))
```

The service has no idea what backs the repo. Test:

```python
# tests/services/wallet/test_user.py
from decimal import Decimal
from uuid import uuid4
from app.repositories.fakes import FakeWalletRepo
from app.services.wallet.user import WalletUserService
from app.services.wallet.exceptions import InsufficientFundsError
import pytest

@pytest.mark.asyncio
async def test_charge_deducts_balance():
    repo = FakeWalletRepo(initial={"u1": Decimal("100")})
    svc = WalletUserService(repo=repo)

    wallet = await svc.charge(user_id="u1", amount=Decimal("30"), key=uuid4())

    assert wallet.balance == Decimal("70")

@pytest.mark.asyncio
async def test_charge_rejects_when_insufficient():
    repo = FakeWalletRepo(initial={"u1": Decimal("10")})
    svc = WalletUserService(repo=repo)

    with pytest.raises(InsufficientFundsError):
        await svc.charge(user_id="u1", amount=Decimal("30"), key=uuid4())
```

No `Session`, no `sqlite:///:memory:`, no fixture file. Pure unit test.

### Impact if you don't

Every test bootstraps SQLAlchemy. Test suite takes 90 seconds. You can't move to async DB drivers without rewriting half the codebase. You can't try a new repository implementation without forking the service.

---

## B2 — Dependency Inversion via `typing.Protocol`

**Summary:** use FastAPI `Depends()` + `typing.Protocol` + factory functions in `core/deps.py`. Do not install a DI container.

### Problem (BEFORE)

Some teams reach for `dependency-injector` or `punq`:

```python
# app/container.py
from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    db = providers.Singleton(SessionLocal)
    wallet_repo = providers.Factory(SQLAlchemyWalletRepo, db=db)
    wallet_svc = providers.Factory(WalletUserService, repo=wallet_repo)
```

```python
@router.get("/wallet/me")
@inject
async def get_wallet(svc: WalletUserService = Provide[Container.wallet_svc]):
    ...
```

Now you have:
- A second DI framework on top of FastAPI's already-perfectly-good DI.
- Magic decorators that require module-level `Container.wire(...)` calls.
- Mocking in tests that pages back through the container, not the FastAPI override mechanism.
- A new dependency to learn for every team member.

### Solution (AFTER)

FastAPI `Depends()` + Protocol + factory functions.

```python
# app/core/deps.py
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import async_session_maker
from app.repositories.protocols import WalletRepoProtocol
from app.repositories.sqlalchemy.wallet import SQLAlchemyWalletRepo
from app.services.wallet.user import WalletUserService
from app.services.wallet.admin import WalletAdminService

async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        yield session

def get_wallet_repo(db: AsyncSession = Depends(get_db)) -> WalletRepoProtocol:
    return SQLAlchemyWalletRepo(db)

def get_wallet_user_service(repo: WalletRepoProtocol = Depends(get_wallet_repo)) -> WalletUserService:
    return WalletUserService(repo=repo)

def get_wallet_admin_service(repo: WalletRepoProtocol = Depends(get_wallet_repo)) -> WalletAdminService:
    return WalletAdminService(repo=repo)

async def get_current_user_id(authorization: str = Header(...)) -> str:
    # JWT verify here; this is illustrative
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization[len("Bearer "):]
    return await _decode_jwt_subject(token)
```

Tests override:

```python
# tests/conftest.py
from fastapi.testclient import TestClient
from app.main import app
from app.core.deps import get_wallet_repo, get_current_user_id
from app.repositories.fakes import FakeWalletRepo
from decimal import Decimal

def _fake_repo():
    return FakeWalletRepo(initial={"test-user": Decimal("100")})

def _fake_user():
    return "test-user"

app.dependency_overrides[get_wallet_repo] = _fake_repo
app.dependency_overrides[get_current_user_id] = _fake_user

client = TestClient(app)
```

No magic, no decorators, no container wiring. The whole DI graph is grep-able.

### When you genuinely need more

If you have ≥30 services with deeply shared dependencies and explicit factories become repetitive, you can extract a small `Wiring` dataclass that holds singletons. But almost every FastAPI codebase needs nothing beyond `Depends()` + factories.

### Impact if you don't

You have two DI systems fighting each other. New devs spend their first week learning the container DSL. Test setup takes a paragraph of code per fixture. Type checker can't see through `Provide[...]`.

---

## B3 — Anti-Corruption Layer (ACL)

**Summary:** every provider adapter MUST return `GenerateResult | ProviderError`. Never raw `dict`. Vendor field names never cross the boundary.

### Problem (BEFORE)

```python
# app/services/ai_service.py
class AIService:
    async def generate_image(self, prompt: str) -> dict:
        resp = await self._http.post("https://fal.run/v1/image", json={"prompt": prompt})
        return resp.json()   # leaking vendor shape

# app/routers/generate.py
@router.post("/image")
async def gen(req: ImageRequest, svc: AIService = Depends(...)):
    data = await svc.generate_image(req.prompt)
    return {
        "url": data["images"][0]["url"],   # vendor field reference in router
        "cost": data["billing"]["cost_usd"],
    }
```

When Fal renames `images` to `outputs` in v2, you grep the codebase and find 14 places that mention `data["images"]`. None of them have type checks. The migration takes a week.

### Solution (AFTER)

```python
# app/providers/_types.py
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class GenerateResult:
    url: str
    cost_usd: Decimal
    latency_ms: int
    provider_request_id: str

class ProviderError(Exception):
    def __init__(self, message: str, *, retryable: bool, code: str | None = None):
        super().__init__(message)
        self.retryable = retryable
        self.code = code

class ProviderTimeout(ProviderError):
    def __init__(self, message: str): super().__init__(message, retryable=True, code="timeout")

class ProviderQuotaExceeded(ProviderError):
    def __init__(self, message: str): super().__init__(message, retryable=False, code="quota")

class ProviderInvalidRequest(ProviderError):
    def __init__(self, message: str): super().__init__(message, retryable=False, code="invalid_request")

class ProviderUpstream5xx(ProviderError):
    def __init__(self, message: str): super().__init__(message, retryable=True, code="upstream_5xx")
```

```python
# app/providers/falai/image.py
from decimal import Decimal
import httpx
from app.providers._types import (
    GenerateResult, ProviderError,
    ProviderTimeout, ProviderQuotaExceeded, ProviderUpstream5xx,
)
from ._client import FalClient

class FalImageAdapter:
    def __init__(self, client: FalClient):
        self._c = client

    async def generate(self, *, prompt: str, model: str, n: int = 1) -> GenerateResult | ProviderError:
        try:
            data = await self._c.request("/v1/image", {"prompt": prompt, "model": model, "n": n})
        except httpx.TimeoutException as e:
            return ProviderTimeout(str(e))
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                return ProviderQuotaExceeded(e.response.text)
            if 500 <= status < 600:
                return ProviderUpstream5xx(e.response.text)
            return ProviderError(e.response.text, retryable=False, code=str(status))

        return _parse_response(data)


def _parse_response(data: dict) -> GenerateResult:
    """Pulled out to a free function so contract tests can call it directly."""
    return GenerateResult(
        url=data["images"][0]["url"],
        cost_usd=Decimal(str(data["billing"]["cost_usd"])),
        latency_ms=int(data["meta"]["latency_ms"]),
        provider_request_id=data["request_id"],
    )
```

When Fal renames a field, you change **one** function (`_parse_response`). The contract test (B9) catches it. Nothing else moves.

### Impact if you don't

Every vendor API change is a multi-day refactor. You become reluctant to upgrade providers. Eventually, a deprecated field disappears and 50% of requests start failing in prod.

---

## B4 — Strategy Pattern for Provider Routing

**Summary:** replace a god `ai_router.py` (1000+ lines of `if/elif`) with composable strategies. Each strategy is one class, one file, individually testable.

### Problem (BEFORE)

```python
# app/services/ai_router.py — 1100 LOC
async def route(req: GenerateRequest) -> GenerateResult:
    if req.model_id.startswith("gpt"):
        if req.budget_cents > 50:
            try: return await openai.generate(req)
            except: return await anthropic.generate(req)
        else:
            return await openai_mini.generate(req)
    elif req.model_id.startswith("claude"):
        # ... 200 lines of similar branching ...
    elif req.model_id == "auto":
        # ... 300 lines for auto-routing ...
```

Every routing concern (cost, fallback, modality, A/B testing, regional preference) accretes more `if`s. The function becomes untestable.

### Solution (AFTER)

```python
# app/services/ai/routing/_base.py
from typing import Protocol
from app.providers._types import GenerateResult, ProviderError
from app.domain.generate import GenerateContext

class RoutingStrategy(Protocol):
    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError: ...
```

```python
# app/services/ai/routing/registry.py
from app.providers._types import GenerateResult, ProviderError, ProviderInvalidRequest
from app.domain.generate import GenerateContext
from ._base import RoutingStrategy

class ProviderEntry(Protocol):
    async def generate(self, ctx: GenerateContext) -> GenerateResult | ProviderError: ...

class RegistryRoutingStrategy:
    """Routes by explicit model_id → provider mapping."""

    def __init__(self, registry: dict[str, ProviderEntry]):
        self._registry = registry

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        provider = self._registry.get(ctx.model_id)
        if provider is None:
            return ProviderInvalidRequest(f"unknown model: {ctx.model_id}")
        return await provider.generate(ctx)
```

```python
# app/services/ai/routing/fallback.py
from app.providers._types import GenerateResult, ProviderError
from app.domain.generate import GenerateContext
from ._base import RoutingStrategy

class FallbackStrategy:
    """If primary fails with retryable=True, try fallback."""

    def __init__(self, primary: RoutingStrategy, fallback: RoutingStrategy):
        self._primary = primary
        self._fallback = fallback

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        result = await self._primary.execute(ctx)
        if isinstance(result, ProviderError) and result.retryable:
            return await self._fallback.execute(ctx)
        return result
```

```python
# app/services/ai/routing/cost.py
from app.providers._types import GenerateResult, ProviderError
from app.domain.generate import GenerateContext
from ._base import RoutingStrategy

class CostOptimizationStrategy:
    """Use cheap path when budget is below threshold; otherwise premium."""

    def __init__(self, *, cheap: RoutingStrategy, premium: RoutingStrategy, threshold_cents: int):
        self._cheap = cheap
        self._premium = premium
        self._threshold = threshold_cents

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        chosen = self._cheap if ctx.budget_cents <= self._threshold else self._premium
        return await chosen.execute(ctx)
```

```python
# app/services/ai/routing/modality.py
from app.providers._types import GenerateResult, ProviderError, ProviderInvalidRequest
from app.domain.generate import GenerateContext, Modality
from ._base import RoutingStrategy

class ModalityRoutingStrategy:
    """Route by modality (image / video / audio / text)."""

    def __init__(self, routes: dict[Modality, RoutingStrategy]):
        self._routes = routes

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        strategy = self._routes.get(ctx.modality)
        if strategy is None:
            return ProviderInvalidRequest(f"unsupported modality: {ctx.modality}")
        return await strategy.execute(ctx)
```

Composition at startup:

```python
# app/main.py (or app/core/wiring.py)
from app.services.ai.routing.registry import RegistryRoutingStrategy
from app.services.ai.routing.fallback import FallbackStrategy
from app.services.ai.routing.cost import CostOptimizationStrategy
from app.services.ai.routing.modality import ModalityRoutingStrategy
from app.domain.generate import Modality

image_strategy = FallbackStrategy(
    primary=CostOptimizationStrategy(
        cheap=RegistryRoutingStrategy({"flux-mini": flux_mini_adapter}),
        premium=RegistryRoutingStrategy({"flux-ultra": flux_ultra_adapter}),
        threshold_cents=10,
    ),
    fallback=RegistryRoutingStrategy({"sdxl": sdxl_adapter}),
)

routing = ModalityRoutingStrategy({
    Modality.IMAGE: image_strategy,
    Modality.VIDEO: video_strategy,
    Modality.TEXT:  text_strategy,
})
```

Each strategy is unit-tested in isolation:

```python
# tests/services/ai/routing/test_fallback.py
import pytest
from app.services.ai.routing.fallback import FallbackStrategy
from app.providers._types import GenerateResult, ProviderTimeout

class _Fail:
    async def execute(self, ctx): return ProviderTimeout("primary down")

class _Ok:
    async def execute(self, ctx):
        return GenerateResult(url="https://x", cost_usd=Decimal("0.01"), latency_ms=100, provider_request_id="r")

@pytest.mark.asyncio
async def test_fallback_invokes_secondary_on_retryable_error():
    s = FallbackStrategy(primary=_Fail(), fallback=_Ok())
    result = await s.execute(_make_ctx())
    assert isinstance(result, GenerateResult)
```

### Impact if you don't

Routing logic is one branching mass. You can't test cost optimization without bootstrapping the entire provider graph. New routing concerns (regional preference, A/B test) cause merge conflicts because everyone is editing the same function.

---

## B5 — Bulkhead Isolation per Provider

**Summary:** each external provider has its own `httpx.AsyncClient` with its own `Limits`. One hung provider cannot consume the connection pool of others.

### Problem (BEFORE)

```python
# app/core/http.py
import httpx
HTTP = httpx.AsyncClient()   # shared by every adapter
```

When Fal.ai's API hangs, every request to it ties up a connection from the global pool. After ~100 stuck requests, OpenAI calls also fail because they can't acquire a connection. One bad provider takes down all integrations.

### Solution (AFTER)

```python
# app/core/http.py
import httpx
from app.core.config import settings

FAL_HTTP = httpx.AsyncClient(
    base_url=settings.FAL_BASE_URL,
    timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0),
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
    headers={"Authorization": f"Key {settings.FAL_API_KEY}"},
)

OPENAI_HTTP = httpx.AsyncClient(
    base_url="https://api.openai.com/v1",
    timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0),
    limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
)

ANTHROPIC_HTTP = httpx.AsyncClient(
    base_url="https://api.anthropic.com",
    timeout=httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0),
    limits=httpx.Limits(max_connections=30, max_keepalive_connections=15),
    headers={
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
    },
)

async def shutdown_clients() -> None:
    await FAL_HTTP.aclose()
    await OPENAI_HTTP.aclose()
    await ANTHROPIC_HTTP.aclose()
```

Wire into FastAPI lifespan:

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.http import shutdown_clients

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await shutdown_clients()

app = FastAPI(lifespan=lifespan)
```

Each adapter receives its own client:

```python
# app/core/deps.py
from app.core.http import FAL_HTTP, OPENAI_HTTP
from app.providers.falai._client import FalClient
from app.providers.falai.image import FalImageAdapter

def get_fal_image_adapter() -> FalImageAdapter:
    return FalImageAdapter(client=FalClient(http=FAL_HTTP))
```

### Sizing the limits

Pick `max_connections` per provider based on:
- Their published rate limits (don't be the source of 429s).
- Your worker concurrency.
- The `read` timeout for that provider's typical response time.

A safe starting point: `max_connections = 2 × expected_concurrent_requests`.

### Impact if you don't

A single hung provider cascades. Your monitoring shows OpenAI errors spiking when in fact OpenAI is fine — you just ran out of FDs because Fal.ai is holding 200 stuck connections.

---

## B6 — Idempotency Keys

**Summary:** every side-effect operation accepts a UUID idempotency key. If the provider supports `Idempotency-Key` header, forward it. Otherwise, persist `(user_id, key) → request_id` and look up before retrying.

### Problem (BEFORE)

The mobile app retries on a network blip. The user gets charged twice. The image is generated twice. Refunding is manual customer support.

### Solution (AFTER)

#### Client side: header

```python
# app/routers/generate/image.py
from uuid import UUID, uuid4
from fastapi import Header

@router.post("/image", response_model=ImageResponse)
async def generate_image(
    req: ImageRequest,
    user_id: str = Depends(get_current_user_id),
    idempotency_key: UUID = Header(default_factory=uuid4, alias="Idempotency-Key"),
    svc: ImageGenerationService = Depends(get_image_svc),
) -> ImageResponse:
    return ImageResponse.from_domain(
        await svc.generate(user_id=user_id, request=req, idempotency_key=idempotency_key)
    )
```

If the client doesn't send a header, FastAPI generates one — but a retry without the same header is a *new* request from our perspective. Document this loudly in the OpenAPI description.

#### Provider supports it: forward header

```python
# app/providers/openai/chat.py
async def complete(self, *, req: ChatRequest, idempotency_key: UUID) -> GenerateResult | ProviderError:
    headers = {"Idempotency-Key": str(idempotency_key)}
    resp = await self._http.post("/chat/completions", json=req.model_dump(), headers=headers)
    # ... parse ...
```

#### Provider does NOT support it: persist + lookup

```python
# app/repositories/protocols.py
class ProviderLogRepoProtocol(Protocol):
    async def find(self, *, user_id: str, key: UUID) -> "ProviderLog | None": ...
    async def persist(self, log: "ProviderLog") -> None: ...

# app/domain/provider_log.py
from dataclasses import dataclass
from uuid import UUID

@dataclass(frozen=True)
class ProviderLog:
    user_id: str
    key: UUID
    provider: str
    cached_url: str
    cached_cost_usd: Decimal
    cached_request_id: str
```

```python
# app/providers/falai/image.py (extended)
from app.domain.generate import ImageRequest
from app.domain.provider_log import ProviderLog
from app.providers._types import GenerateResult, ProviderError

class FalImageAdapter:
    def __init__(self, client: FalClient, logs: ProviderLogRepoProtocol):
        self._c = client
        self._logs = logs

    async def generate(self, *, req: ImageRequest, idempotency_key: UUID) -> GenerateResult | ProviderError:
        cached = await self._logs.find(user_id=req.user_id, key=idempotency_key)
        if cached is not None:
            return GenerateResult(
                url=cached.cached_url,
                cost_usd=cached.cached_cost_usd,
                latency_ms=0,
                provider_request_id=cached.cached_request_id,
            )

        result = await self._call(req)
        if isinstance(result, GenerateResult):
            await self._logs.persist(ProviderLog(
                user_id=req.user_id, key=idempotency_key, provider="fal",
                cached_url=result.url, cached_cost_usd=result.cost_usd,
                cached_request_id=result.provider_request_id,
            ))
        return result
```

The repo enforces uniqueness with a DB index on `(user_id, key)`.

### Impact if you don't

Production retries → double charges → support tickets → trust erosion. By the time you instrument retries, you have a backlog of compensations to run.

---

## B7 — Per-Integration Observability Context

**Summary:** `contextvars.ContextVar` for `provider`, `user_id`, `request_id`. JSON formatter reads them. You filter logs in production with `jsonPayload.provider="fal"`.

### Problem (BEFORE)

```python
logger.info(f"calling fal for user {user_id} request {request_id}")
```

You grep these strings in production logs. The string format drifts between modules. Aggregating "all errors per provider" is impossible because there's no structured field.

### Solution (AFTER)

```python
# app/core/logging.py
import contextvars, json, logging

provider_var   = contextvars.ContextVar[str | None]("provider", default=None)
user_id_var    = contextvars.ContextVar[str | None]("user_id", default=None)
request_id_var = contextvars.ContextVar[str | None]("request_id", default=None)

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts":         self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level":      record.levelname,
            "msg":        record.getMessage(),
            "logger":     record.name,
            "provider":   provider_var.get(),
            "user_id":    user_id_var.get(),
            "request_id": request_id_var.get(),
        }
        # Pull through `extra={...}` from logger.info(..., extra=...)
        for key, value in record.__dict__.items():
            if key not in _STD_RECORD_KEYS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps({k: v for k, v in payload.items() if v is not None})

_STD_RECORD_KEYS = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "message", "taskName",
}

def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
```

#### Middleware sets request_id and user_id

```python
# app/core/middleware.py
from uuid import uuid4
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import request_id_var, user_id_var

class ContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-Id") or str(uuid4())
        request_id_var.set(rid)
        # user_id_var is set later, inside get_current_user_id, once auth is verified
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response
```

```python
# app/core/deps.py
from app.core.logging import user_id_var

async def get_current_user_id(...) -> str:
    user_id = await _decode_jwt_subject(token)
    user_id_var.set(user_id)
    return user_id
```

#### Provider sets `provider` for the duration of the call

```python
# app/providers/falai/image.py
import logging
from app.core.logging import provider_var

logger = logging.getLogger(__name__)

class FalImageAdapter:
    async def generate(self, *, req: ImageRequest, idempotency_key: UUID):
        token = provider_var.set("fal")
        try:
            logger.info("provider call started", extra={"model": req.model_id})
            return await self._do_generate(req, idempotency_key)
        finally:
            provider_var.reset(token)
```

Now every log line has structured fields. Filter in GCP:

```bash
gcloud logging read 'jsonPayload.provider="fal" AND jsonPayload.level="ERROR"' --limit=100
```

Or in Datadog: `@provider:fal @level:error`.

### Impact if you don't

Aggregating "error rate per provider" is impossible. Debugging an incident means tailing an unstructured stream and grepping for substrings.

---

## B8 — Versioned Adapters / Feature Flags

**Summary:** when migrating an integration backend, keep both adapters live. Switch with one env var. Rollback is instant.

### Problem (BEFORE)

You're moving wallet storage from Postgres to Supabase. You write a migration PR that:
- Changes 4 service files
- Renames `SQLAlchemyWalletRepo` to `WalletRepo`
- Updates 30 caller sites
- Drops the old code

Deploy. Find a bug. Roll back means reverting a 50-file PR while customers are seeing 500s.

### Solution (AFTER)

```python
# app/repositories/sqlalchemy/wallet.py
class SQLAlchemyWalletRepo: ...  # existing

# app/repositories/supabase/wallet.py
class SupabaseWalletRepo:
    def __init__(self, client):
        self._c = client
    async def get(self, user_id: str) -> Wallet:
        resp = await self._c.table("wallets").select("*").eq("user_id", user_id).single().execute()
        return Wallet(user_id=resp.data["user_id"], balance=Decimal(resp.data["balance"]), version=resp.data["version"])
    # ... rest of Protocol ...
```

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    WALLET_REPO_BACKEND: Literal["postgres", "supabase"] = "postgres"
    # ...

settings = Settings()
```

```python
# app/core/deps.py
from app.core.config import settings
from app.repositories.sqlalchemy.wallet import SQLAlchemyWalletRepo
from app.repositories.supabase.wallet import SupabaseWalletRepo

def get_wallet_repo(
    db: AsyncSession = Depends(get_db),
    supabase = Depends(get_supabase_client),
) -> WalletRepoProtocol:
    if settings.WALLET_REPO_BACKEND == "supabase":
        return SupabaseWalletRepo(client=supabase)
    return SQLAlchemyWalletRepo(db)
```

Migration plan:
1. Deploy with `WALLET_REPO_BACKEND=postgres` (default). No behavior change.
2. Shadow-write to Supabase from a dedicated job; verify parity for 48 hours.
3. Set `WALLET_REPO_BACKEND=supabase` on 5% of traffic (canary).
4. Promote to 100%. Watch error rates.
5. After 2 weeks, remove `SQLAlchemyWalletRepo` (separate PR).

If at step 3 or 4 you see a problem: `WALLET_REPO_BACKEND=postgres` env change, redeploy in 90 seconds. No code revert.

### Impact if you don't

Every backend migration is a high-risk Friday-night cutover. Rollbacks involve git reverts and re-deploys. Confidence to migrate erodes; you stay on legacy backends longer than is wise.

---

## B9 — Contract Tests (Pact-Style)

**Summary:** for each external provider, snapshot a real response and write a parser test against it. CI fails the day the provider changes their API.

### Problem (BEFORE)

A provider deprecates a field on a Tuesday. You don't notice. On Thursday a user reports broken generations. You spend Friday debugging "why does production fail when staging passes."

### Solution (AFTER)

```python
# tests/contracts/fixtures/falai_image_v1.json
{
  "request_id": "req_abc123",
  "images": [{"url": "https://cdn.fal.run/abc.png", "width": 1024, "height": 1024}],
  "billing": {"cost_usd": 0.0042, "currency": "USD"},
  "meta": {"latency_ms": 1820, "model": "flux-pro"}
}
```

```python
# tests/contracts/test_falai_image.py
import json, pathlib
from decimal import Decimal
from app.providers.falai.image import _parse_response
from app.providers._types import GenerateResult

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "falai_image_v1.json"

def test_parser_extracts_url():
    data = json.loads(FIXTURE.read_text())
    result = _parse_response(data)
    assert isinstance(result, GenerateResult)
    assert result.url == "https://cdn.fal.run/abc.png"

def test_parser_extracts_cost_as_decimal():
    data = json.loads(FIXTURE.read_text())
    result = _parse_response(data)
    assert result.cost_usd == Decimal("0.0042")

def test_parser_extracts_request_id():
    data = json.loads(FIXTURE.read_text())
    result = _parse_response(data)
    assert result.provider_request_id == "req_abc123"
```

CI runs these on every PR. A nightly cron also runs a **live** version that hits the real API:

```python
# tests/contracts/live/test_falai_image_live.py
import os, pytest
import httpx
from app.providers.falai._client import FalClient
from app.providers.falai.image import FalImageAdapter

LIVE = os.environ.get("RUN_LIVE_CONTRACT_TESTS") == "1"

@pytest.mark.skipif(not LIVE, reason="live tests gated by RUN_LIVE_CONTRACT_TESTS")
@pytest.mark.asyncio
async def test_falai_image_live_request_shape():
    http = httpx.AsyncClient(
        base_url="https://fal.run",
        headers={"Authorization": f"Key {os.environ['FAL_API_KEY']}"},
    )
    adapter = FalImageAdapter(client=FalClient(http=http))
    result = await adapter.generate(prompt="a red apple", model="flux-mini", n=1)
    await http.aclose()

    assert hasattr(result, "url"), f"unexpected result: {result}"
    assert result.url.startswith("https://")
    # If this fails, Fal changed their response shape — update fixture and parser.
```

When live test fails, you update `falai_image_v1.json` and the parser in the same PR. The fixture-based test now exercises the new shape.

### Impact if you don't

Vendor changes silently break you. The signal is a customer complaint, not a CI alarm.

---

## B10 — Single-Writer Principle

**Summary:** for any critical resource (wallet balance, quota, idempotent task state), exactly **ONE** function writes. One file, one test, one audit point.

### Problem (BEFORE)

Wallet balance is mutated in:
- `services/wallet_service.py::charge`
- `services/wallet_service.py::refund`
- `services/payment_service.py::complete_purchase` (introduced last quarter, "I'll just inline it")
- `services/admin/billing.py::manual_adjust` (added under deadline)
- `migrations/scripts/backfill_credits.py` (used once, left in tree)

Five writers. Five places to verify FOR UPDATE locking. Five places to audit. Bugs guaranteed.

### Solution (AFTER)

```python
# app/services/wallet/_writer.py
from app.repositories.protocols import WalletRepoProtocol
from app.domain.wallet import Wallet, LedgerEntry
from .exceptions import InsufficientFundsError, DuplicateEntryError

async def apply_ledger_entry(
    repo: WalletRepoProtocol,
    entry: LedgerEntry,
) -> Wallet:
    """The ONE function in the codebase that mutates a wallet balance.

    All HOLD / DEDUCT / REFUND / CREDIT operations route through here.
    Concurrency: enforced by `repo.lock(user_id)` (FOR UPDATE row lock).
    Idempotency: enforced by the unique index on `(user_id, idempotency_key)`.
    Errors: InsufficientFundsError on negative balance attempt; DuplicateEntryError on retry.
    """
    async with repo.lock(entry.user_id):
        wallet = await repo.get(entry.user_id)
        if not wallet.can_apply(entry):
            raise InsufficientFundsError(
                f"user={entry.user_id} balance={wallet.balance} entry={entry.amount}"
            )
        new_wallet = wallet.apply(entry)
        try:
            await repo.persist(new_wallet, entry)
        except DuplicateEntryError:
            return await repo.get(entry.user_id)   # idempotent return
        return new_wallet
```

Every other module — user service, admin service, payment service, backfill scripts — calls `apply_ledger_entry`. There is no other site that calls `repo.persist(wallet, entry)`.

### Test

```python
# tests/services/wallet/test_writer.py
import asyncio, pytest
from decimal import Decimal
from uuid import uuid4
from app.repositories.fakes import FakeWalletRepo
from app.services.wallet._writer import apply_ledger_entry
from app.services.wallet.exceptions import InsufficientFundsError
from app.domain.wallet import LedgerEntry

@pytest.mark.asyncio
async def test_deduct_within_balance_succeeds():
    repo = FakeWalletRepo(initial={"u1": Decimal("100")})
    wallet = await apply_ledger_entry(repo, LedgerEntry.deduct("u1", Decimal("30"), uuid4()))
    assert wallet.balance == Decimal("70")

@pytest.mark.asyncio
async def test_deduct_exceeding_balance_raises():
    repo = FakeWalletRepo(initial={"u1": Decimal("10")})
    with pytest.raises(InsufficientFundsError):
        await apply_ledger_entry(repo, LedgerEntry.deduct("u1", Decimal("30"), uuid4()))

@pytest.mark.asyncio
async def test_idempotent_retry_returns_same_balance():
    repo = FakeWalletRepo(initial={"u1": Decimal("100")})
    key = uuid4()
    w1 = await apply_ledger_entry(repo, LedgerEntry.deduct("u1", Decimal("30"), key))
    w2 = await apply_ledger_entry(repo, LedgerEntry.deduct("u1", Decimal("30"), key))
    assert w1.balance == w2.balance == Decimal("70")

@pytest.mark.asyncio
async def test_refund_increases_balance():
    repo = FakeWalletRepo(initial={"u1": Decimal("70")})
    wallet = await apply_ledger_entry(repo, LedgerEntry.refund("u1", Decimal("30"), uuid4()))
    assert wallet.balance == Decimal("100")
```

### Audit

A security audit of the billing system is now: read **one file** (`_writer.py`, ~30 lines). Verify:
1. Lock acquired (`repo.lock(...)`).
2. Read-then-write inside lock (no TOCTOU).
3. Idempotency check.
4. Domain invariant (`can_apply`) verified.
5. Persist atomic.

Done.

### Impact if you don't

Every audit is a multi-day codebase tour. Bugs in less-traveled writer sites (`backfill_credits.py`) deplete balances incorrectly and stay hidden until a quarterly reconciliation.

---

## Integration Checklist (before any PR adding an external call)

```
□ Adapter returns GenerateResult | ProviderError, never dict.
□ Adapter has a dedicated httpx.AsyncClient with explicit Limits.
□ The endpoint has an Idempotency-Key header parameter (or acquires one upstream).
□ The provider sets provider_var via contextvars.
□ A contract test fixture exists for the response shape.
□ For migrations: feature flag in core/config.py routes between old and new.
□ For critical resources: writes go through the single-writer function.
□ Service does not import sqlalchemy/httpx/boto3.
□ Repository implements a Protocol from repositories/protocols.py.
□ Tests pass with FakeRepo, no live DB or HTTP.
```

If every box is checked, the integration will survive vendor changes, network blips, traffic spikes, and the next refactor.
