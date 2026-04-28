# CLAUDE.md — vibecodex

> Authoritative project instructions for Claude (and any LLM assistant) working in a codebase that has adopted the **vibecodex** standard. These rules OVERRIDE any default behavior. Follow them exactly. When in doubt, prefer the rule that produces the smaller, more isolated change.

## Project Purpose

This is a **production FastAPI service**. The codebase follows 18 architectural principles (8 decomposition + 10 integration) that keep the project maintainable as it grows past 30 endpoints, multiple external providers, and a long lifetime. Your job as the AI partner is to add features and fix bugs **without violating any of those principles** — even when the user asks you to "just add it real quick."

If a quick fix would violate a rule, you say so and propose the right shape. You never silently take the shortcut.

---

## Architecture (MANDATORY)

The codebase has exactly four layers. Imports flow **only downward**:

```
Router  → Service → Repository (via Protocol) → ORM/HTTP/S3
                ↘ Provider (via ACL) → external API
```

| Layer            | Lives in                       | What it does                                         | What it CANNOT import                                  |
| ---------------- | ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------ |
| **Router**       | `app/routers/`                 | HTTP only: parse request, call service, format reply | `sqlalchemy`, `httpx`, business logic                  |
| **Service**      | `app/services/`                | Business rules, domain orchestration                 | `sqlalchemy`, `httpx`, `boto3`, FastAPI `Request`      |
| **Repository**   | `app/repositories/`            | Data access (SQL, S3, Redis)                         | other services, FastAPI                                |
| **Provider**     | `app/providers/<vendor>/`     | External API adapter, returns ACL types              | services, repositories, FastAPI                        |
| **Schema**       | `app/schemas/`                 | Pydantic request/response models                     | services, repositories                                  |
| **Models**       | `app/models/`                  | SQLAlchemy ORM                                       | services, providers                                    |
| **Core**         | `app/core/`                    | Config, deps, logging, http clients                  | services, routers (avoid cycles)                       |

**Dependency Inversion via `typing.Protocol`** — services never depend on a concrete repository. They accept an interface:

```python
# repositories/protocols.py
from typing import Protocol
from decimal import Decimal
from app.domain.wallet import Wallet, LedgerEntry

class WalletRepoProtocol(Protocol):
    async def get(self, user_id: str) -> Wallet: ...
    async def lock(self, user_id: str): ...  # async ctx mgr, FOR UPDATE
    async def persist(self, wallet: Wallet, entry: LedgerEntry) -> None: ...
```

```python
# services/wallet/user.py
class WalletUserService:
    def __init__(self, repo: WalletRepoProtocol):
        self._repo = repo
```

```python
# core/deps.py
def get_wallet_service(db: Session = Depends(get_db)) -> WalletUserService:
    return WalletUserService(repo=SQLAlchemyWalletRepo(db))
```

```python
# routers/wallet.py
@router.get("/wallet/me", response_model=WalletResponse)
async def get_wallet(
    user_id: str = Depends(get_current_user_id),
    svc: WalletUserService = Depends(get_wallet_service),
) -> WalletResponse:
    return WalletResponse.from_domain(await svc.get_for(user_id))
```

---

## The 18 Principles as Actionable Rules

### Part A — Safe Decomposition

**Rule A1 — Folder, not file, when a domain splits by type.**
If `routers/X.py` is acquiring multiple disjoint sub-domains (e.g. image / video / audio), convert to package `routers/X/{a.py, b.py, c.py, __init__.py}`. `__init__.py` re-exports a combined `router`. `main.py` doesn't change.

**Rule A2 — Static data lives in `app/data/` (or a `registry.py` next to its domain).**
Pricing tables, model registries, prompt templates, country lists. Never inline a 60-line dict at the top of a service file.

**Rule A3 — Auth and schemas don't live in the router file.**
Auth deps go to `core/<domain>_auth.py`. Pydantic schemas go to `schemas/<domain>/*.py`. Routers stay thin.

**Rule A4 — One file per provider format.**
A vendor that exposes `image` and `video` APIs becomes `providers/<vendor>/{image.py, video.py, _client.py}`. Shared HTTP plumbing lives in `_client.py`.

**Rule A5 — Worker handlers are NOT in the router.**
HTTP enqueue/list/cancel stays in `routers/tasks.py`. Background processing logic lives in `services/task_handlers/<format>.py` and is invoked by your queue worker, not by FastAPI.

**Rule A6 — User-API ≠ Admin-API in the same service file.**
Split `wallet_service.py` into `services/wallet/{user.py, admin.py, history.py}`. Admin-only methods cannot be reached from user code by accident.

**Rule A7 — File size: 400 LOC soft, 600 LOC hard.**
At 400 lines you must plan a split. At 600 lines you must split before merging. CI runs `scripts/check_loc.py`. No exceptions.

**Rule A8 — Refactor without breaking imports.**
When you split a file, the old public name(s) must still resolve via `__init__.py` re-exports until the migration is complete. Caller code (and stale AI memory) should not break.

### Part B — Integration Patterns

**Rule B1 — Hexagonal: services do not import infrastructure.**
A service that imports `sqlalchemy`, `httpx`, or `boto3` is a bug. The outside world enters via Protocol-typed parameters injected from `core/deps.py`.

**Rule B2 — Use `typing.Protocol` and FastAPI `Depends()` for DI. Do not introduce a DI container.**
No `dependency-injector`, `punq`, or service locator. The factory function in `core/deps.py` is the wiring layer.

**Rule B3 — Every provider returns `GenerateResult | ProviderError`.**
Adapters never return `dict`, never leak vendor field names. The ACL boundary is non-negotiable.

```python
# providers/_types.py
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
```

**Rule B4 — Routing logic uses Strategy Pattern, not a god-`if`.**
`services/ai/routing/{registry.py, fallback.py, cost.py, modality.py}`. Each strategy is one class, one file, ≤120 LOC, individually unit-testable.

**Rule B5 — Bulkhead per provider.**
Each external provider has its own `httpx.AsyncClient` with its own `Limits` and `timeout`. Defined once in `core/http.py` and injected.

```python
# core/http.py
import httpx

FAL_HTTP    = httpx.AsyncClient(timeout=60, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))
OPENAI_HTTP = httpx.AsyncClient(timeout=30, limits=httpx.Limits(max_connections=50, max_keepalive_connections=20))
```

**Rule B6 — Idempotency key on every side-effect operation.**
Every `POST` that creates external state (charges money, generates media, sends email) accepts an `Idempotency-Key` header (UUID). Forward to the provider if it supports the header; otherwise persist the key in `provider_logs` and look it up before retrying.

**Rule B7 — Observability via `contextvars`.**
`core/logging.py` defines `provider_var`, `user_id_var`, `request_id_var`. Middleware sets `request_id` and `user_id`. The provider adapter sets `provider` for the duration of its call. JSON formatter reads them.

```python
# core/logging.py
import contextvars, logging, json

provider_var   = contextvars.ContextVar("provider",   default=None)
user_id_var    = contextvars.ContextVar("user_id",    default=None)
request_id_var = contextvars.ContextVar("request_id", default=None)

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level":      record.levelname,
            "msg":        record.getMessage(),
            "logger":     record.name,
            "provider":   provider_var.get(),
            "user_id":    user_id_var.get(),
            "request_id": request_id_var.get(),
        }
        return json.dumps({k: v for k, v in payload.items() if v is not None})
```

**Rule B8 — Versioned adapters / feature flags for migrations.**
When replacing an integration, keep both adapters. The factory picks one based on `settings.<X>_BACKEND`. Rollback is an env change.

**Rule B9 — Contract tests for every external provider.**
`tests/contracts/test_<provider>_<format>.py` snapshots a real response shape and asserts the parser still extracts every field. Runs in CI nightly and on PR.

**Rule B10 — Single-Writer Principle for critical resources.**
For wallet balance, quota counters, idempotent task state: exactly **ONE** function in the codebase writes. Locate it in `services/<domain>/_writer.py`. All other code goes through it. One test covers it. One point for the security audit.

```python
# services/wallet/_writer.py
async def apply_ledger_entry(repo: WalletRepoProtocol, entry: LedgerEntry) -> Wallet:
    """The ONE function in the codebase that mutates a wallet balance."""
    async with repo.lock(entry.user_id):
        wallet = await repo.get(entry.user_id)
        new_wallet = wallet.apply(entry)   # pure domain function
        await repo.persist(new_wallet, entry)
        return new_wallet
```

---

## File Size Rules

- **0–400 LOC**: green. No action.
- **400–600 LOC**: yellow. The next change to this file must include or precede a split. Add a `# TODO(decompose): A1 — split by ...` comment at the top.
- **600+ LOC**: red. Do not merge. Decompose first.

CI script:

```python
# scripts/check_loc.py
import sys, pathlib
HARD = 600
SOFT = 400

def main(roots: list[str]) -> int:
    fail = False
    for root in roots:
        for p in pathlib.Path(root).rglob("*.py"):
            if "__init__" in p.name: continue
            n = sum(1 for _ in p.open(encoding="utf-8"))
            if n > HARD:
                print(f"HARD-FAIL {p}: {n} LOC > {HARD}"); fail = True
            elif n > SOFT:
                print(f"WARN      {p}: {n} LOC > {SOFT}")
    return 1 if fail else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["app"]))
```

---

## Forbidden Patterns

These are rejected outright. If a user request would require one, **propose the correct shape instead**.

1. **`Session` parameter on a service method.**
   ```python
   # ❌ BAD
   class WalletService:
       async def credit(self, db: Session, user_id: str, amount: Decimal): ...
   ```
   Use a Protocol-typed repo instead.

2. **Provider returning `dict` to a service.**
   ```python
   # ❌ BAD
   async def call_openai(...) -> dict:
       resp = await client.post(...); return resp.json()
   ```
   Map to `GenerateResult | ProviderError` inside the adapter.

3. **Business logic in a router handler.**
   ```python
   # ❌ BAD
   @router.post("/charge")
   async def charge(req: ChargeReq, db: Session = Depends(get_db)):
       wallet = db.query(Wallet).filter(...).first()
       if wallet.balance < req.amount: raise HTTPException(402)
       wallet.balance -= req.amount; db.commit()
       ...
   ```
   Router calls one service method. The service owns the logic.

4. **Two writers to the same critical resource.**
   If you need to mutate `wallet.balance` from a new place, you call the existing writer in `services/wallet/_writer.py`. You do **not** add a second `repo.persist(...)` site.

5. **Shared `httpx.AsyncClient` across all providers.**
   Each provider gets its own. One global client = no bulkhead.

6. **Inline static data in service files.**
   Pricing dicts, model registries, country tables → `app/data/`.

7. **`from app.routers.x import something` from a service.**
   Services do not import routers. If you find yourself wanting to, the function belongs in a service, not a router.

8. **Hardcoded secrets / config strings.**
   Everything via `pydantic-settings` in `core/config.py`.

9. **Bare `except:` or `except Exception: pass`.**
   Catch the specific error class. Always log with context.

10. **`f"SELECT * FROM users WHERE id={user_id}"`.**
    Parameterized queries only.

---

## When to Split a File into a Folder (Concrete Criteria)

Split `<file>.py` into a package the moment **any** of the following becomes true:

- File size crosses **400 LOC** (yellow line — plan now, split before next change crosses 500).
- File contains **two or more disjoint sub-domains** (e.g. image vs video, user vs admin) that don't share state.
- File mixes **HTTP handlers + worker handlers** (Rule A5).
- File mixes **auth dependencies + Pydantic schemas + route handlers** (Rule A3).
- A grep across the codebase shows **two or more callers each importing only one symbol** from the file — the split lines are obvious.

Split procedure (atomic PR):

1. Create `<file>/` package and `<file>/__init__.py`.
2. Move the disjoint pieces into separate sub-files (`a.py`, `b.py`, `c.py`).
3. Re-export the public names from `__init__.py` to preserve backwards compatibility.
4. Run tests — they must pass without changes to test code.
5. Open a separate PR to migrate callers off the legacy names. Once that PR lands, remove the alias.

---

## Testing Strategy per Layer

| Layer        | What you test                                        | How                                                      |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------- |
| **Router**   | Status codes, response shape, auth boundary          | `TestClient`, fake service via `app.dependency_overrides` |
| **Service**  | Business rules, edge cases, error mapping            | Pure unit test, pass `FakeWalletRepo` from `repositories/fakes.py` |
| **Repo**     | SQL correctness, migration compatibility             | Real Postgres in Docker, transactional rollback          |
| **Provider** | Parser correctness against real response shape       | **Contract test** with snapshot fixture + occasional live test |
| **End-to-end** | Critical flows (signup → charge → generate)        | Few. Run nightly. Mock external providers with recorded responses. |

The single-writer function (`services/wallet/_writer.py`) gets dedicated concurrency tests:

```python
# tests/services/wallet/test_writer.py
async def test_concurrent_holds_do_not_oversubscribe():
    repo = FakeWalletRepo(initial={"u1": Decimal("100")})
    results = await asyncio.gather(*[
        apply_ledger_entry(repo, LedgerEntry.hold("u1", Decimal("60"), key=uuid4()))
        for _ in range(10)
    ], return_exceptions=True)
    held = sum(1 for r in results if not isinstance(r, Exception))
    assert held == 1   # only one HOLD of 60 fits in a 100 wallet
```

---

## Naming Conventions

| Context              | Convention                  | Example                          |
| -------------------- | --------------------------- | -------------------------------- |
| Python files         | snake_case                  | `wallet_writer.py`               |
| Python classes       | PascalCase                  | `WalletUserService`              |
| Protocol classes     | PascalCase + `Protocol`     | `WalletRepoProtocol`             |
| Functions            | snake_case verb-first       | `apply_ledger_entry`             |
| Constants            | UPPER_SNAKE_CASE            | `STARS_PER_USD`                  |
| Pydantic schemas     | PascalCase + `Request`/`Response` | `ChargeRequest`, `WalletResponse` |
| SQLAlchemy models    | PascalCase singular         | `User`, `Wallet`, `Task`         |
| Files for adapters   | `<vendor>/<format>.py`      | `providers/falai/image.py`       |
| Strategy classes     | PascalCase + `Strategy`     | `FallbackStrategy`               |
| Single-writer file   | `_writer.py` (underscore)   | `services/wallet/_writer.py`     |
| Test files           | `test_<unit>.py`            | `test_writer.py`                 |
| Contract tests       | `tests/contracts/test_<vendor>_<format>.py` | `test_falai_image.py` |

`_`-prefixed names (`_client.py`, `_writer.py`, `_repo.py`) are package-internal — not re-exported from `__init__.py`, not imported across packages.

---

## Pre-Implementation Checklist (run through this BEFORE writing code)

1. Which layer am I editing? Will I cross any layer boundary?
2. If I'm in a service, does my code import `sqlalchemy`, `httpx`, or `boto3`? **STOP** — refactor through a Protocol.
3. If I'm in a provider adapter, what does it return? **Must be `GenerateResult | ProviderError`.**
4. If I'm mutating a critical resource (wallet, quota, task state), am I calling the existing single-writer? **STOP** if I'm adding a second writer.
5. Will this file cross 400 LOC after my change? Plan the split.
6. Is the data I'm adding static config (prices, registry)? It goes in `app/data/`, not in the service file.
7. Is the new endpoint authenticated? Does every DB query scope by `user_id`?
8. Did I add an external API call? Does it have its own bulkhead `httpx` client and an idempotency key?

---

## Common Tasks: How They Should Look

### Adding a new endpoint

1. Add Pydantic schemas in `schemas/<domain>/<feature>.py`.
2. Add service method in `services/<domain>/<file>.py` (existing or new).
3. Add a thin route in `routers/<domain>.py` (≤10 lines per handler).
4. Add factory in `core/deps.py` if the service is new.
5. Add a unit test for the service (with `FakeRepo`) and a route test (with `TestClient`).

### Adding a new external provider

1. New folder `providers/<vendor>/`.
2. `_client.py` for HTTP plumbing.
3. One file per format (`image.py`, `chat.py`, ...).
4. Each adapter returns `GenerateResult | ProviderError`.
5. Register a dedicated `httpx.AsyncClient` in `core/http.py`.
6. Add a contract test in `tests/contracts/test_<vendor>_<format>.py`.
7. Wire into the routing strategy (e.g. extend `RegistryRoutingStrategy`).

### Adding a new background task type

1. Define the task payload schema in `schemas/tasks/<type>.py`.
2. Implement the handler in `services/task_handlers/<type>.py`.
3. Register the handler in your worker dispatch table.
4. Router only enqueues — never processes.

---

## When Asked to "Just Add It Quick"

The user is under deadline pressure. You acknowledge the time pressure and propose the **smallest correct** change:

> "I can add this in 4 lines if I put it in the existing service. Sketch:
> 1. New schema `ChargeRequest` in `schemas/wallet/charge.py` (8 lines).
> 2. New method `WalletUserService.charge` (~15 lines) that calls the existing `_writer.apply_ledger_entry`.
> 3. New route in `routers/wallet.py` (5 lines).
>
> I will **not** put the SQL in the router or add a second writer to the wallet table. Both would create maintenance debt that costs more than 30 seconds to remove later."

You are firm but not preachy. You name the rule once and move on.

---

## Reference

- Full principle docs: `docs/principles/01-safe-decomposition.md`, `docs/principles/02-integration-patterns.md`
- Architectural decisions: `docs/adr/`
- Cursor rules: `.cursor/rules/`
- Code standards: `.claude/rules/code-standards.md`
- Reference implementation: `reference/app/`

When citing a rule in code review or commit messages, use the short code:
`A1`–`A8` for decomposition, `B1`–`B10` for integration. Example: *"split routers/generate.py per A1; image adapter now ACL-typed per B3."*
