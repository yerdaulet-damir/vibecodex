# Code Standards

Authoritative coding standards for this FastAPI codebase. Companion document to `CLAUDE.md`. When in doubt, this file is the SSOT for "how should this be shaped."

---

## Layer Isolation Rules

| Layer        | Allowed imports                                                   | Forbidden imports                                                  |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `routers/`   | `fastapi`, `app.schemas.*`, `app.core.deps`, `app.services.*`     | `sqlalchemy`, `httpx`, `boto3`, `app.models.*`, `app.repositories.*` (except via `Depends`) |
| `services/`  | `app.repositories.protocols`, `app.providers._types`, `app.domain.*`, stdlib | `sqlalchemy`, `httpx`, `boto3`, FastAPI `Request`/`Response`/`HTTPException` |
| `repositories/sqlalchemy/` | `sqlalchemy`, `app.models.*`, `app.repositories.protocols`, `app.domain.*` | services, providers, FastAPI                                        |
| `providers/<vendor>/`     | `httpx`, `app.providers._types`                                | services, repositories, FastAPI                                    |
| `core/`       | stdlib, `pydantic`, `pydantic-settings`, `httpx`, `fastapi`        | services (avoid cycles)                                            |

**Rule:** if your import has to cross sideways (e.g. service importing from another service's submodule), the boundary is wrong. Either move the function or extract a Protocol.

---

## Protocol Pattern for Repositories

**Every repository has a Protocol in `app/repositories/protocols.py`.** Services depend on the Protocol, not the SQLAlchemy class.

```python
# app/repositories/protocols.py
from typing import Protocol, AsyncContextManager
from decimal import Decimal
from app.domain.wallet import Wallet, LedgerEntry

class WalletRepoProtocol(Protocol):
    async def get(self, user_id: str) -> Wallet: ...
    def lock(self, user_id: str) -> AsyncContextManager[None]: ...
    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None: ...
    async def list_entries(self, user_id: str, *, limit: int, offset: int) -> list[LedgerEntry]: ...
```

```python
# app/repositories/sqlalchemy/wallet.py
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.wallet import WalletORM, LedgerEntryORM
from app.domain.wallet import Wallet, LedgerEntry

class SQLAlchemyWalletRepo:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def get(self, user_id: str) -> Wallet:
        row = (await self._db.execute(
            select(WalletORM).where(WalletORM.user_id == user_id)
        )).scalar_one()
        return Wallet(user_id=row.user_id, balance=row.balance, version=row.version)

    @asynccontextmanager
    async def lock(self, user_id: str):
        await self._db.execute(
            select(WalletORM).where(WalletORM.user_id == user_id).with_for_update()
        )
        try:
            yield
            await self._db.commit()
        except Exception:
            await self._db.rollback()
            raise

    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None:
        await self._db.merge(WalletORM(
            user_id=wallet.user_id, balance=wallet.balance, version=wallet.version,
        ))
        self._db.add(LedgerEntryORM(
            user_id=entry.user_id, kind=entry.kind, amount=entry.amount,
            idempotency_key=str(entry.key), created_at=entry.created_at,
        ))
```

```python
# app/repositories/fakes.py — for tests
from collections import defaultdict
from contextlib import asynccontextmanager
from decimal import Decimal
from app.domain.wallet import Wallet, LedgerEntry

class FakeWalletRepo:
    def __init__(self, initial: dict[str, Decimal] | None = None):
        self._wallets: dict[str, Wallet] = {
            uid: Wallet(user_id=uid, balance=bal, version=0)
            for uid, bal in (initial or {}).items()
        }
        self._entries: list[LedgerEntry] = []

    async def get(self, user_id: str) -> Wallet:
        return self._wallets.get(user_id, Wallet(user_id=user_id, balance=Decimal("0"), version=0))

    @asynccontextmanager
    async def lock(self, user_id: str):
        yield   # FakeRepo is single-threaded by construction in tests

    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None:
        self._wallets[wallet.user_id] = wallet
        self._entries.append(entry)

    async def list_entries(self, user_id: str, *, limit: int, offset: int) -> list[LedgerEntry]:
        return [e for e in self._entries if e.user_id == user_id][offset:offset + limit]
```

**Why Protocol over ABC:** structural subtyping (no inheritance), no base class import in concrete classes, much easier to write fakes. See `docs/adr/001-protocol-over-abc.md`.

---

## Anti-Corruption Layer (ACL) for Providers

Every provider adapter MUST return `GenerateResult | ProviderError` — never raw `dict`, never the vendor's response model.

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

Services check the result with `isinstance`:

```python
result = await self._image_provider.generate(req)
if isinstance(result, ProviderError):
    if result.retryable:
        result = await self._fallback_provider.generate(req)
    if isinstance(result, ProviderError):
        raise GenerationFailedError(str(result)) from result
# result is GenerateResult here
```

---

## Single-Writer for Critical Resources

For wallet balance, quota counters, and any idempotent task state: exactly **ONE** function in the codebase writes. Located at `app/services/<domain>/_writer.py`.

```python
# app/services/wallet/_writer.py
from decimal import Decimal
from app.repositories.protocols import WalletRepoProtocol
from app.domain.wallet import Wallet, LedgerEntry
from .exceptions import InsufficientFundsError, DuplicateEntryError

async def apply_ledger_entry(repo: WalletRepoProtocol, entry: LedgerEntry) -> Wallet:
    """The ONE function in the codebase that mutates a wallet balance.

    All HOLD / DEDUCT / REFUND / CREDIT operations route through here.
    Concurrency is controlled by `repo.lock(user_id)` (FOR UPDATE row lock).
    Idempotency is controlled by the unique index on `(user_id, idempotency_key)`.
    """
    async with repo.lock(entry.user_id):
        wallet = await repo.get(entry.user_id)

        if not wallet.can_apply(entry):
            raise InsufficientFundsError(
                f"user={entry.user_id} balance={wallet.balance} entry={entry.amount}"
            )

        new_wallet = wallet.apply(entry)   # pure domain function
        try:
            await repo.persist(new_wallet, entry)
        except DuplicateEntryError:
            # Idempotent retry — return current state
            return await repo.get(entry.user_id)
        return new_wallet
```

The user-facing service is a thin wrapper:

```python
# app/services/wallet/user.py
from uuid import UUID
from decimal import Decimal
from app.repositories.protocols import WalletRepoProtocol
from app.domain.wallet import Wallet, LedgerEntry
from ._writer import apply_ledger_entry

class WalletUserService:
    def __init__(self, repo: WalletRepoProtocol):
        self._repo = repo

    async def hold(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(
            self._repo, LedgerEntry.hold(user_id=user_id, amount=amount, key=key),
        )

    async def deduct(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(
            self._repo, LedgerEntry.deduct(user_id=user_id, amount=amount, key=key),
        )

    async def refund(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(
            self._repo, LedgerEntry.refund(user_id=user_id, amount=amount, key=key),
        )
```

Admin tools also go through `apply_ledger_entry`:

```python
# app/services/wallet/admin.py
from decimal import Decimal
from uuid import UUID
from ._writer import apply_ledger_entry
from app.domain.wallet import LedgerEntry

class WalletAdminService:
    def __init__(self, repo: WalletRepoProtocol): self._repo = repo

    async def credit_compensation(self, user_id: str, amount: Decimal, reason: str, key: UUID):
        return await apply_ledger_entry(
            self._repo,
            LedgerEntry.admin_credit(user_id=user_id, amount=amount, reason=reason, key=key),
        )
```

There is no second `repo.persist(wallet, ...)` site anywhere. Security audit: one file, one function, one test.

---

## Strategy Pattern for Provider Routing

Replace a god `ai_router.py` with composable strategies.

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
class RegistryRoutingStrategy:
    """Routes by explicit model_id → provider mapping."""
    def __init__(self, registry: dict[str, "ProviderProtocol"]):
        self._registry = registry

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        provider = self._registry.get(ctx.model_id)
        if provider is None:
            from app.providers._types import ProviderInvalidRequest
            return ProviderInvalidRequest(f"unknown model: {ctx.model_id}")
        return await provider.generate(ctx.request)
```

```python
# app/services/ai/routing/fallback.py
class FallbackStrategy:
    """If primary fails with retryable=True, try fallback."""
    def __init__(self, primary: RoutingStrategy, fallback: RoutingStrategy):
        self._primary = primary; self._fallback = fallback

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        result = await self._primary.execute(ctx)
        if isinstance(result, ProviderError) and result.retryable:
            return await self._fallback.execute(ctx)
        return result
```

```python
# app/services/ai/routing/cost.py
class CostOptimizationStrategy:
    """Prefer cheaper provider when quality tier permits."""
    def __init__(self, cheap: RoutingStrategy, premium: RoutingStrategy, threshold_cents: int):
        self._cheap = cheap; self._premium = premium; self._t = threshold_cents

    async def execute(self, ctx: GenerateContext) -> GenerateResult | ProviderError:
        if ctx.quality_budget_cents <= self._t:
            return await self._cheap.execute(ctx)
        return await self._premium.execute(ctx)
```

The orchestrator composes strategies:

```python
# app/services/ai/orchestrator.py
class AIOrchestrator:
    def __init__(self, strategy: RoutingStrategy):
        self._strategy = strategy

    async def generate(self, ctx: GenerateContext) -> GenerateResult:
        result = await self._strategy.execute(ctx)
        if isinstance(result, ProviderError):
            raise GenerationFailedError(str(result)) from result
        return result

# Wired at startup:
strategy = FallbackStrategy(
    primary  = CostOptimizationStrategy(cheap=registry_cheap, premium=registry_premium, threshold_cents=50),
    fallback = registry_fallback,
)
orchestrator = AIOrchestrator(strategy=strategy)
```

Each strategy file ≤120 LOC, individually unit-testable.

---

## Naming Conventions

| Context              | Convention                        | Example                          |
| -------------------- | --------------------------------- | -------------------------------- |
| Python files         | snake_case                        | `wallet_writer.py`               |
| Python classes       | PascalCase                        | `WalletUserService`              |
| Protocol classes     | PascalCase + `Protocol`           | `WalletRepoProtocol`             |
| Functions            | snake_case verb-first             | `apply_ledger_entry`             |
| Private functions    | leading underscore                | `_parse_response`                |
| Constants            | UPPER_SNAKE_CASE                  | `STARS_PER_USD`                  |
| Pydantic schemas     | `<Noun>Request` / `<Noun>Response` | `ChargeRequest`, `WalletResponse` |
| SQLAlchemy models    | PascalCase singular + `ORM` suffix when needed | `User`, `WalletORM` (when domain `Wallet` shadows it) |
| Domain dataclasses   | PascalCase, frozen                | `Wallet`, `LedgerEntry`          |
| Files for adapters   | `<vendor>/<format>.py`            | `providers/falai/image.py`       |
| Strategy classes     | PascalCase + `Strategy`           | `FallbackStrategy`               |
| Single-writer file   | `_writer.py`                      | `services/wallet/_writer.py`     |
| Test files           | `test_<unit>.py`                  | `test_writer.py`                 |
| Contract tests       | `tests/contracts/test_<vendor>_<format>.py` | `test_falai_image.py` |
| Custom exceptions    | PascalCase + `Error`              | `InsufficientFundsError`         |

---

## Other Standards

- **Pydantic v2** only. `BaseModel` with `model_config = ConfigDict(frozen=True)` for response models.
- **Type hints everywhere.** `mypy --strict` clean.
- **No `print()`** — `logger = logging.getLogger(__name__)`.
- **Async by default.** Sync only if there's a CPU-bound reason.
- **Decimal for money, never float.** `from decimal import Decimal`.
- **UUID for ids that cross system boundaries.**
- **Datetimes are UTC and timezone-aware.** `datetime.now(timezone.utc)`.
- **No `eval`, `exec`, `pickle.load` on untrusted input.**
- **Settings via `pydantic-settings`** in `app/core/config.py`. Env vars prefixed `APP_`.
- **Linting:** `ruff` + `flake8 --max-line-length=120`. CI fails on warnings.
- **One Pydantic model per HTTP shape.** `WalletResponse` is for JSON output; the domain `Wallet` dataclass stays in services.

---

## Pre-Commit Quick Audit

Before opening a PR, run:

```bash
ruff check app/
mypy --strict app/
pytest -x
python scripts/check_loc.py app/
```

If any fails, fix before committing.
