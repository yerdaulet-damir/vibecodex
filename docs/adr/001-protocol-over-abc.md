# ADR 001 — Use `typing.Protocol` instead of `abc.ABC` for repository interfaces

| Field        | Value             |
| ------------ | ----------------- |
| Status       | Accepted          |
| Date         | 2025-01           |
| Deciders     | Architecture team |
| Supersedes   | —                 |
| Superseded by| —                 |

---

## Context

The blueprint inverts dependencies between services and infrastructure: services depend on **interfaces** (e.g. `WalletRepoProtocol`), and concrete adapters (`SQLAlchemyWalletRepo`, `SupabaseWalletRepo`, `FakeWalletRepo`) implement them. We needed a Python mechanism for those interfaces.

Two practical options:

1. **`abc.ABC` + `@abc.abstractmethod`** — the classic OO approach. Concrete classes inherit from the abstract base.
2. **`typing.Protocol`** (PEP 544) — structural subtyping. Concrete classes don't inherit; they just *match the shape* and the type checker verifies it.

Both work at runtime in the sense that a fake repo can be passed where the real one is expected. The question is which serves our project better long-term.

---

## Decision

**We use `typing.Protocol` for all repository, provider, and routing-strategy interfaces.**

- `app/repositories/protocols.py` — `WalletRepoProtocol`, `TaskRepoProtocol`, `ProviderLogRepoProtocol`, etc.
- `app/services/ai/routing/_base.py` — `RoutingStrategy`.
- Concrete adapters (e.g. `SQLAlchemyWalletRepo`) **do not** import or inherit from the Protocol class. They simply implement the methods with matching signatures.
- mypy (`--strict`) is the enforcement mechanism.

Example:

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
# app/repositories/sqlalchemy/wallet.py — note: NO import of WalletRepoProtocol
from sqlalchemy.ext.asyncio import AsyncSession

class SQLAlchemyWalletRepo:
    def __init__(self, db: AsyncSession): self._db = db
    async def get(self, user_id: str) -> Wallet: ...
    @asynccontextmanager
    async def lock(self, user_id: str): ...
    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None: ...
```

```python
# app/services/wallet/user.py
from app.repositories.protocols import WalletRepoProtocol  # only the SERVICE imports the protocol

class WalletUserService:
    def __init__(self, repo: WalletRepoProtocol): self._repo = repo
```

---

## Rationale

### 1. Structural subtyping = no base class import

With `Protocol`, the concrete class doesn't have to know about the interface. This matters for:

- **Wrapping third-party clients.** If we want a vendor SDK class to satisfy `Protocol X`, we can't make it inherit from `ABC X` — but it can structurally match.
- **Reducing import graph weight.** `repositories/sqlalchemy/wallet.py` doesn't pull in `repositories/protocols.py`, which transitively doesn't pull in `app.domain.wallet`. Module loading is lighter.
- **Multi-protocol implementations.** A class can satisfy multiple Protocols without multiple-inheritance ceremony.

### 2. Easier fake repos

```python
# With Protocol: just write a class with matching methods.
class FakeWalletRepo:
    def __init__(self, initial: dict[str, Decimal] | None = None): ...
    async def get(self, user_id: str) -> Wallet: ...
    @asynccontextmanager
    async def lock(self, user_id: str): yield
    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None: ...
```

```python
# With ABC: have to inherit and remember to implement every abstract method.
class FakeWalletRepo(WalletRepoBase):   # forced inheritance
    async def get(self, user_id: str) -> Wallet: ...
    # If you forget @abstractmethod methods, runtime error on instantiation, not type-check.
```

The `Protocol` version reads as "here is what a wallet repo looks like." The `ABC` version reads as "here is the wallet repo class hierarchy."

### 3. Compatible with existing ORMs and SDKs

The `sqlalchemy` `Session` does not (and cannot) inherit from our `WalletRepoProtocol`. Neither does a Supabase client. With `Protocol`, we write a thin wrapper class that satisfies our interface; with `ABC` we'd write the same wrapper plus an inheritance declaration.

### 4. Faster tests

Tests that use `FakeWalletRepo` don't pull SQLAlchemy. With `ABC`, you'd typically have the abstract base in a module that also defined exceptions, which often pull in SQLAlchemy types — and the test inherits all that.

### 5. Mirrors current Python ecosystem direction

PEP 544 (Protocols, accepted 2017) and the surrounding ecosystem (mypy, pyright, pyre) treat Protocol as the canonical way to express duck typing. The rest of the typed-Python world (FastAPI, Pydantic, anyio) has been moving toward Protocol-based signatures for years.

---

## Consequences

### Positive

- **No base-class import in adapters.** Cleaner dependency graph.
- **Trivial fakes** for tests; no inheritance scaffolding.
- **Multiple Protocol satisfaction** without multiple inheritance.
- **Service signatures express intent**: `def __init__(self, repo: WalletRepoProtocol)` reads as a contract, not a class identity.

### Negative

- **No runtime enforcement.** If you forget to implement `lock()` on `MyWalletRepo`, a class instantiation will succeed; the failure will only happen when a service calls `repo.lock(...)`. Mitigated by:
  - `mypy --strict` in CI (catches missing methods at type-check time).
  - Contract tests for repos: each concrete repo has a smoke test that exercises every Protocol method.
- **Slight learning curve.** Developers from a Java/C# background may expect inheritance. Onboarding mentions Protocol in the first hour.
- **`isinstance(x, WalletRepoProtocol)` requires `@runtime_checkable`.** We avoid runtime `isinstance` checks against Protocols entirely — type narrowing via Protocol is a code smell. Branch on concrete behavior (e.g. capability flags) instead.

### Neutral

- Protocol classes by convention end with `Protocol` (`WalletRepoProtocol`, not `IWalletRepo` or `WalletRepoInterface`). This convention is enforced by code review.

---

## Alternatives Considered

### `abc.ABC` + `@abc.abstractmethod`

Rejected for the reasons above. The concrete class must inherit; tests must construct subclasses; multi-protocol satisfaction needs multiple inheritance.

### Plain duck typing (no interface declaration at all)

Rejected because:
- The contract becomes invisible. New developers don't know what methods a service expects until they read the service code.
- mypy can't help.
- Refactoring (renaming a method) doesn't propagate via the type checker.

### `attrs` / `dataclasses` interface inheritance

Not applicable — these are for data classes, not interface declarations.

### A third-party library (`zope.interface`, `traits`)

Rejected as unnecessary dependencies. PEP 544 Protocol is in stdlib and sufficient.

---

## Compliance & Enforcement

- **Code review:** every new repository or provider must define its Protocol in `app/repositories/protocols.py` or `app/providers/_types.py` first. Concrete adapter PRs reference the Protocol.
- **CI:** `mypy --strict app/` must pass.
- **Naming:** Protocol classes end with `Protocol`. Lint rule (`ruff` custom check) flags violations.
- **No runtime `isinstance` against Protocol** — flagged in code review.

---

## References

- [PEP 544 — Protocols: Structural subtyping (static duck typing)](https://peps.python.org/pep-0544/)
- mypy documentation on Protocols: https://mypy.readthedocs.io/en/stable/protocols.html
- *Effective Python* (3rd ed.), Item 24: "Use `typing.Protocol` for structural subtyping."
- This blueprint's principle B1 (Hexagonal / Ports & Adapters) — `docs/principles/02-integration-patterns.md`.

---

## Revision History

| Date    | Change             | Author       |
| ------- | ------------------ | ------------ |
| 2025-01 | Initial acceptance | Architecture |
