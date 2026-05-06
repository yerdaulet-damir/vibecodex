# vibecodex — vibe coding rules for production

> 54 production architecture principles your AI coding agent (Claude Code, Cursor) follows automatically. Drop-in `CLAUDE.md`, `.cursor/rules/`, and `.claude/skills/` for **FastAPI**, **Next.js 15**, and **Go 1.22+**. MIT.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8.svg?logo=go&logoColor=white)](https://go.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/yerdaulet-damir/vibe-coding-rules?color=yellow)](https://github.com/yerdaulet-damir/vibe-coding-rules/stargazers)
[![npm](https://img.shields.io/npm/v/@aimyerdaulet/vibecodex?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@aimyerdaulet/vibecodex)

```bash
npx @aimyerdaulet/vibecodex init
```

**[📘 Principles](docs/principles/01-safe-decomposition.md)** · **[🐍 FastAPI example](reference/app/)** · **[⚡ Next.js example](examples/nextjs/)** · **[🐹 Go example](examples/go/)** · **[🤖 Claude skills](.claude/skills/)** · **[🌐 vibecodex.dev](https://vibecodex-omega.vercel.app)**

---

## What is vibecodex?

vibecodex is the **clean-code bible for vibe coding** — 54 numbered architecture principles (A1–F10) that turn AI coding agents from fast juniors into disciplined seniors. You drop one `CLAUDE.md` plus a folder of Cursor rules into your repo, and from the next prompt every Claude Code or Cursor session follows production patterns: file size limits, anti-corruption layers, idempotency keys, bulkhead isolation, single-writer invariants, hexagonal boundaries.

It's built for **vibe coders, solo devs, and indie hackers** who ship fast with AI but don't want their Friday-night SaaS to become an unmaintainable 1,400-line router by Sunday.

**Three stacks. One ruleset. Zero dependencies on a specific agent.**

---

<details>
<summary><b>📖 Table of Contents</b></summary>

- [🚀 Quick Start](#-quick-start)
- [🚨 The problem](#-the-problem)
- [🛠️ 54 Production Principles](#️-54-production-principles)
  - [🐍 FastAPI — Part A: Safe Decomposition (8)](#-part-a--safe-decomposition-8-principles)
  - [🐍 FastAPI — Part B: Integration Patterns (10)](#-part-b--integration-patterns-10-principles)
  - [⚡ Next.js — Part C: Decomposition (10)](#-part-c--nextjs--typescript-decomposition-10-principles)
  - [⚡ Next.js — Part D: Modern Patterns (6)](#-part-d--nextjs-modern-patterns-6-principles-2024-2025)
  - [🐹 Go — Part E: Decomposition (8)](#-part-e--go-decomposition-8-principles)
  - [🐹 Go — Part F: Integration Patterns (10)](#-part-f--go-integration-patterns-10-principles)
- [📂 Directory Structure](#-directory-structure)
- [🚀 Reference Implementations](#-reference-implementations)
- [🤖 Claude Code Skills](#claude-code-skills)
- [🛠️ Copy-Paste AI Config](#-copy-paste-ai-config)
- [📊 vs Other Templates](#-vs-other-templates)
- [❓ FAQ](#-faq)
- [🎯 When to use this blueprint](#-when-to-use-this-blueprint)
- [🤝 Contributing](#-contributing)
- [📜 Citations](#-citations)

</details>

---

## 🚀 Quick Start

```bash
# Add vibecodex rules to your project (any stack)
git clone https://github.com/yerdaulet-damir/vibe-coding-rules.git /tmp/vibecodex

# 1. Drop CLAUDE.md into your repo root — Claude reads it on every session
cp /tmp/vibecodex/CLAUDE.md ./

# 2. Copy Cursor rules
cp -r /tmp/vibecodex/.cursor/rules/ .cursor/rules/

# 3. Copy Claude Code skills (debug-backend, new-feature, split-monolith, etc.)
cp -r /tmp/vibecodex/.claude/skills/ .claude/skills/
```

That's it. Your AI agent now follows 54 production principles from line one.

**For new projects**, start from one of the reference apps:

| Stack | Command | What you get |
|-------|---------|--------------|
| **FastAPI** | `cp -r /tmp/vibecodex/reference/app/ ./backend/app/` | Hexagonal Python with credits, providers, async jobs |
| **Next.js 15** | `cp -r /tmp/vibecodex/examples/nextjs/ ./frontend/` | RSC + typed cache-tag DSL + Drizzle + Better Auth |
| **Go 1.22+** | `cp -r /tmp/vibecodex/examples/go/ ./service/` | `cmd/`+`internal/` + bulkhead clients + graceful shutdown |

---

## 🚨 The problem

You start a project on Friday. By Sunday you have 14 endpoints, a working LLM integration, OAuth, Stripe, and a deploy pipeline. The AI is moving fast. So are you. Everything works.

Six weeks later, `routers/generate.py` is 1400 lines, `services/ai_router.py` ships a `dict` from OpenAI directly into your billing logic, the SQLAlchemy `Session` reaches into every layer including the JWT decoder, and a single hung `httpx` call to one provider exhausts your file descriptors and takes down image, video, and audio at once. The AI is still moving fast — but now every change touches eight files, breaks two of them, and your test suite mocks `Session` 47 different ways.

This isn't an AI failure. AI assistants produce **structurally correct, locally optimal** code. What they don't enforce — and what no template enforces by default — is **architectural consistency at scale**: layer boundaries, file size, ports & adapters, single-writer invariants, bulkhead isolation, typed cache-tag DSLs, hexagonal domain boundaries, idempotency keys, graceful shutdown rituals.

This repo codifies all of it into **54 rules** that fit on a few pages, ship as `CLAUDE.md` + `.cursor/rules/` + `.claude/skills/`, and turn your AI partner from a fast junior into a disciplined senior — across **FastAPI**, **Next.js 15**, and **Go 1.22+**.

---

## 🛠️ 54 Production Principles

The vibecodex blueprint covers **6 parts** spanning Python, TypeScript, and Go — each one solving a recurring failure mode of vibe-coded apps:

| # | Stack | Part | Focus | Principles |
|---|-------|------|-------|-----------|
| A | 🐍 FastAPI | Decomposition | folder/file boundaries, single-writer | 8 |
| B | 🐍 FastAPI | Integration | hexagonal, ACL, bulkhead, idempotency, observability | 10 |
| C | ⚡ Next.js | Decomposition | feature-driven colocation, RSC defaults | 10 |
| D | ⚡ Next.js | Modern (2024-25) | typed cache-tag DSL, `use()`, PPR, Better Auth, Drizzle | 6 |
| E | 🐹 Go | Decomposition | `internal/`, consumer-side interfaces, no `utils` | 8 |
| F | 🐹 Go | Integration | `context.Context` first, errgroup, bulkhead, graceful shutdown | 10 |
| **Σ** | | | | **54** |

### 🧩 Part A — Safe Decomposition (8 principles)

How to split files and folders **without breaking imports** and **without losing the thread of the codebase**.

1. **Folder-instead-of-file when domain splits by type.** If `routers/generate.py` is starting to handle `image`, `video`, `audio`, convert it to a package `routers/generate/{image.py,video.py,audio.py,__init__.py}` and re-export the combined router. `main.py` doesn't change.

   <details><summary>before / after</summary>

   ```python
   # BEFORE — routers/generate.py (820 lines, three domains tangled)
   @router.post("/image")
   async def generate_image(...): ...
   @router.post("/video")
   async def generate_video(...): ...
   @router.post("/audio")
   async def generate_audio(...): ...
   ```

   ```python
   # AFTER — routers/generate/__init__.py
   from fastapi import APIRouter
   from .image import router as image_router
   from .video import router as video_router
   from .audio import router as audio_router

   router = APIRouter(prefix="/generate", tags=["generate"])
   router.include_router(image_router)
   router.include_router(video_router)
   router.include_router(audio_router)
   ```
   `main.py` keeps `from app.routers.generate import router` — **zero caller changes**.
   </details>

2. **Static data ≠ runtime logic.** Pricing tables, model registries, prompt templates go into `data/` (or `<domain>/registry.py`), never inline in a service file. Updating a price = a one-line PR, not a refactor.

   <details><summary>before / after</summary>

   ```python
   # BEFORE — services/ai_service.py
   PRICING = {"gpt-4o": 0.005, "claude-3-5": 0.003, ...}  # 80 lines of constants
   class AIService: ...
   ```

   ```python
   # AFTER — data/model_pricing.py
   from decimal import Decimal
   PRICING: dict[str, Decimal] = {
       "gpt-4o":     Decimal("0.005"),
       "claude-3-5": Decimal("0.003"),
   }

   # services/ai_service.py
   from app.data.model_pricing import PRICING
   ```
   </details>

3. **Auth and schemas don't live with endpoints.** A bloated `routers/admin.py` becomes `routers/admin/{wallet,users}.py` with auth in `core/admin_auth.py` and Pydantic schemas in `schemas/admin/`. Each file has one reason to change.

   <details><summary>before / after</summary>

   ```python
   # BEFORE — routers/admin.py (520 lines)
   def require_admin(user_id: str = Depends(get_current_user_id)): ...
   class AdjustWalletRequest(BaseModel): ...
   class ListUsersResponse(BaseModel): ...
   @router.post("/admin/wallet/adjust"): ...
   @router.get("/admin/users"): ...
   ```

   ```
   # AFTER
   core/admin_auth.py        # require_admin dep
   schemas/admin/wallet.py   # AdjustWalletRequest
   schemas/admin/users.py    # ListUsersResponse
   routers/admin/wallet.py   # only HTTP for wallet ops
   routers/admin/users.py    # only HTTP for user ops
   routers/admin/__init__.py # combines and re-exports
   ```
   </details>

4. **Provider with N format APIs → file per format.** A single Fal.ai client that does both image and video generation becomes `providers/falai/{image.py,video.py,_client.py}`. The HTTP plumbing (auth, retries, base URL) sits in `_client.py`; each format file owns its request/response shape.

   <details><summary>before / after</summary>

   ```python
   # BEFORE — providers/falai.py (640 lines, image+video request models tangled)
   class FalAiAdapter:
       async def generate_image(self, ...): ...
       async def generate_video(self, ...): ...
   ```

   ```python
   # AFTER — providers/falai/_client.py
   class FalClient:
       def __init__(self, *, api_key: str, http: httpx.AsyncClient): ...
       async def request(self, path: str, payload: dict) -> dict: ...

   # providers/falai/image.py
   from ._client import FalClient
   class FalImageAdapter:
       def __init__(self, client: FalClient): self._c = client
       async def generate(self, req: ImageRequest) -> GenerateResult | ProviderError: ...
   ```
   </details>

5. **Worker-handlers do NOT live in the router.** `routers/tasks.py` stays HTTP-only (enqueue, list, cancel). Background processing goes to `services/task_handlers/{image,video,audio}.py`. The router becomes a thin entry point you can read in 30 seconds.

6. **User-API ≠ Admin-API in the same service file.** `wallet_service.py` (500 lines) becomes `services/wallet/{user.py,admin.py,history.py,debt.py}` with a shared `services/wallet/_repo.py`. User code can't accidentally import admin-only methods.

7. **Soft cap 400 LOC, hard cap 600 LOC per file.** At 400 lines you plan the split. At 600 lines you split now — no exceptions. Enforced by `scripts/check_loc.py` in CI.

8. **Refactor without breaking changes.** `__init__.py` re-exports the old public names, so callers (and your AI assistant's stale memory of the codebase) don't break. Decomposition is invisible from the outside.

   <details><summary>example</summary>

   ```python
   # services/wallet/__init__.py
   from .user import WalletUserService
   from .admin import WalletAdminService

   # Backwards-compat: old code did `from app.services.wallet_service import WalletService`
   WalletService = WalletUserService  # alias keeps imports working during migration

   __all__ = ["WalletUserService", "WalletAdminService", "WalletService"]
   ```
   </details>

### 🔌 Part B — Integration Patterns (10 principles)

How services talk to **databases, external APIs, and each other** without coupling rotting in.

1. **Hexagonal / Ports & Adapters.** Services never import `sqlalchemy`, `httpx`, or `boto3` directly. The outside world enters via `Protocol` interfaces. Swap Postgres for DynamoDB by writing one new adapter — services don't change.

   ```python
   # services/wallet/user.py — domain layer
   class WalletUserService:
       def __init__(self, repo: WalletRepoProtocol):  # not Session!
           self._repo = repo
   ```

2. **Dependency Inversion via `typing.Protocol` (no DI containers).** FastAPI's `Depends()` plus a factory function is enough. No `dependency-injector`, no `punq`, no service locators.

   ```python
   def get_wallet_service(db: Session = Depends(get_db)) -> WalletUserService:
       return WalletUserService(repo=SQLAlchemyWalletRepo(db))
   ```
   Tests pass `WalletUserService(repo=FakeWalletRepo())`. No mocking framework.

3. **Anti-Corruption Layer (ACL).** Every provider adapter MUST return `GenerateResult | ProviderError` — never a raw `dict`. Provider API shape never leaks into business logic.

   ```python
   @dataclass(frozen=True)
   class GenerateResult:
       url: str
       cost_usd: Decimal
       latency_ms: int
       provider_request_id: str

   class ProviderError(Exception):
       retryable: bool
   ```

4. **Strategy Pattern for provider routing.** Replace a god `ai_router.py` (1000+ lines of `if/elif`) with composable strategies: `RegistryRoutingStrategy`, `FallbackStrategy`, `CostOptimizationStrategy`, `ModalityRoutingStrategy`. Each is ~80 lines and unit-testable in isolation.

5. **Bulkhead isolation.** Each external provider gets its **own** `httpx.AsyncClient` with explicit `Limits(max_connections=...)`. One stuck Fal.ai call cannot consume the connection pool used by OpenAI.

   ```python
   FAL_HTTP    = httpx.AsyncClient(timeout=60, limits=httpx.Limits(max_connections=20))
   OPENAI_HTTP = httpx.AsyncClient(timeout=30, limits=httpx.Limits(max_connections=50))
   ```

6. **Idempotency keys.** Every side-effect operation carries a UUID key. If the provider supports it, send as a header; if not, persist the key in `provider_logs` and look it up before retrying. Result: client retries are safe by construction.

7. **Per-integration observability context.** `contextvars.ContextVar` for `provider`, `user_id`, `request_id`. JSON log formatter reads them. You filter logs in production with `gcloud logs read 'jsonPayload.provider="fal"'` instead of grepping unstructured strings.

8. **Versioned adapters / feature flags.** Keep the old and new implementation simultaneously, flip with one env var:

   ```python
   if settings.WALLET_REPO_BACKEND == "supabase":
       return SupabaseWalletRepo(...)
   return SQLAlchemyWalletRepo(db)
   ```
   Rollback = env change, no redeploy, no rebuild.

9. **Contract tests (pact-style).** For each external provider, snapshot a real response shape and write a parser test against it. CI breaks the day the provider changes their API — not three days later when a user reports a 500.

10. **Single-Writer Principle.** For any critical resource (wallet balance, quota, idempotent task state), exactly **ONE** function writes. One test covers it. One point for the security audit. All reads can be many; writes are funneled.

    ```python
    # services/wallet/_writer.py — the ONE writer
    async def apply_ledger_entry(repo: WalletRepoProtocol, entry: LedgerEntry) -> Wallet:
        async with repo.lock(entry.user_id):  # FOR UPDATE
            wallet = await repo.get(entry.user_id)
            new = wallet.apply(entry)         # pure function
            await repo.persist(new, entry)
            return new
    ```

---

### 🎨 Part C — Next.js + TypeScript Decomposition (10 principles)

The frontend half. Same intent as Part A but for **Next.js 15 + React 19 + TypeScript** apps. See [docs/principles/03-nextjs-decomposition.md](docs/principles/03-nextjs-decomposition.md).

| # | Principle | One-liner |
|---|-----------|-----------|
| C1 | Feature-driven colocation | Group by business domain (`features/users/`), not by tech (`hooks/`, `utils/`) |
| C2 | `app/` is an orchestrator only | Page files under 100 LOC — UI lives in features |
| C3 | 200/400 LOC caps | Split when you can't describe it without "and" |
| C4 | RSC by default, `'use client'` at leaves | Push the directive to a button, not a page |
| C5 | Server Actions + errors as values | Return `{ success: false, error: ... }` — don't throw business errors |
| C6 | Code lives with its only caller | Promote to `lib/` only when a 2nd feature imports it |
| C7 | Zustand per domain | One store per business area; server is stateless |
| C8 | Strict TS — schemas as source of truth | Zod first, types via `z.infer<...>` |
| C9 | `useEffect` is a last resort | RSC for fetching, `useActionState` for mutations |
| C10 | Tailwind + Shadcn only | Zero `style={{}}`, use `cn()` helper |

### ⚡ Part D — Next.js Modern Patterns (6 principles, 2024-2025)

What changed in 2024-25 — patterns most existing templates don't yet teach. See [docs/principles/04-nextjs-modern.md](docs/principles/04-nextjs-modern.md).

| # | Principle | One-liner |
|---|-----------|-----------|
| **D1** ⭐ | **Cache tags as typed domain events** | Single `lib/cache/tags.ts` — every `revalidateTag` typo = compile error |
| D2 | `use()` hook for client async | React 19 — unwrap server Promises in client components, no `useEffect` |
| D3 | Streaming Suspense | Independent fetches in parallel; one Suspense per dynamic block |
| D4 | Partial Prerendering | Static shell + streamed dynamic islands — `<100ms` initial HTML |
| D5 | Better Auth + RSC session | Read session in Server Components via `cache()`, not middleware |
| D6 | Drizzle ORM + repository protocol | Types inferred from schema; hexagonal boundary in TypeScript |

> **D1 is the differentiator.** No other Next.js template ships a typed cache-tag DSL. See [examples/nextjs/src/lib/cache/tags.ts](examples/nextjs/src/lib/cache/tags.ts).

### 🐹 Part E — Go Decomposition (8 principles)

The Go half of structural rules. Different idioms — small consumer-side interfaces, `internal/` for private code, no `utils` packages. See [docs/principles/05-go-decomposition.md](docs/principles/05-go-decomposition.md).

| # | Principle | One-liner |
|---|-----------|-----------|
| E1 | `cmd/`, `internal/`, `pkg/` — but stay flat | Use `internal/` aggressively; `pkg/` only for published libraries |
| E2 | Package per responsibility, no `utils` | `format/`, `retry/`, `validate/` — never `utils/` |
| E3 | Small interfaces at the consumer side | "Accept interfaces, return structs" — interfaces live where they're used |
| E4 | 500 LOC soft / 800 hard cap | Same package, multiple files — splits don't break imports |
| E5 | `_test.go` next to code, table-driven | `t.Run` subtests + `t.Parallel()` |
| E6 | Generated code in its own file/folder | Never edit by hand; clearly labeled |
| E7 | Domain types stay in domain package | No `types/` or `models/` graveyard |
| E8 | Thin `main.go`, real logic in `run()` | Mat Ryer pattern — testable wiring |

### 🔧 Part F — Go Integration Patterns (10 principles)

What separates a Go service that survives a year from one that crumbles the first time a downstream provider hangs. See [docs/principles/06-go-integration.md](docs/principles/06-go-integration.md).

| # | Principle | One-liner |
|---|-----------|-----------|
| F1 | Accept interfaces, return structs | Service constructors return `*Service` (concrete); handlers accept tiny interfaces |
| F2 | `context.Context` first, always | Every I/O method takes `ctx` as first parameter |
| F3 | Errors as values, `%w` wrap, `errors.Is/As` | Sentinels for stable conditions; typed errors for rich info |
| F4 | One `*http.Client` per provider | `httpclient.Get("falai")` — bulkhead in Go style |
| F5 | Idempotency keys via header + DB | `Idempotency-Key` header + unique index + `ON CONFLICT` |
| F6 | `log/slog` structured + request context | JSON logs with `request_id`/`user_id` from context |
| F7 | Graceful shutdown ritual | `signal.NotifyContext` + `srv.Shutdown(timeout)` |
| F8 | `errgroup` for concurrent ops | Replaces raw goroutines + channels for fan-out |
| F9 | Single-writer for critical resources | `repo.Hold()` only callable from `service.Charge()` — lint-enforced |
| F10 | Contract tests with `httptest` | Saved real responses; CI breaks when provider changes API |

---

## 📂 Directory Structure

**Before** (typical monolithic vibe-coded layout, ~3 months in):

```
app/
├── main.py
├── database.py
├── models.py                # 900 LOC, all tables in one file
├── routers/
│   ├── auth.py
│   ├── generate.py          # 1400 LOC, image+video+audio tangled
│   ├── admin.py             # 520 LOC, schemas+auth+routes mixed
│   └── tasks.py             # HTTP + worker handlers in same file
├── services/
│   ├── ai_service.py        # 1100 LOC, pricing + routing + adapters
│   ├── wallet_service.py    # 720 LOC, user + admin + history
│   └── auth_service.py
├── providers/
│   └── falai.py             # 640 LOC, image+video request models tangled
└── schemas.py               # 800 LOC, every schema in the project
```

**After** (this blueprint):

```
app/
├── main.py
├── core/
│   ├── config.py            # pydantic-settings
│   ├── deps.py              # get_db, get_current_user_id, factories
│   ├── admin_auth.py
│   ├── logging.py           # JSON formatter, contextvars
│   └── http.py              # per-provider httpx clients (bulkhead)
├── data/                    # static data only
│   ├── model_pricing.py
│   └── model_registry.py
├── models/                  # SQLAlchemy ORM, one file per aggregate
│   ├── user.py
│   ├── wallet.py
│   └── task.py
├── schemas/                 # Pydantic, mirror domain layout
│   ├── wallet/
│   ├── admin/
│   └── generate/
├── repositories/
│   ├── protocols.py         # WalletRepoProtocol, TaskRepoProtocol
│   ├── sqlalchemy/
│   │   ├── wallet.py
│   │   └── task.py
│   └── fakes.py             # for tests
├── services/
│   ├── wallet/
│   │   ├── user.py
│   │   ├── admin.py
│   │   ├── history.py
│   │   └── _writer.py       # SINGLE WRITER
│   ├── task_handlers/       # worker code, not HTTP
│   │   ├── image.py
│   │   └── video.py
│   └── ai/
│       ├── routing/         # strategies (one file each)
│       │   ├── registry.py
│       │   ├── fallback.py
│       │   └── cost.py
│       └── orchestrator.py
├── providers/
│   ├── _types.py            # GenerateResult, ProviderError
│   ├── falai/
│   │   ├── _client.py
│   │   ├── image.py
│   │   └── video.py
│   └── openai/
│       └── chat.py
└── routers/
    ├── auth.py
    ├── generate/
    │   ├── image.py
    │   ├── video.py
    │   └── audio.py
    ├── admin/
    │   ├── wallet.py
    │   └── users.py
    └── tasks.py
```

Same project. Same features. Every file under 400 lines. Every layer testable in isolation.

---

## 🚀 Reference Implementation

`reference/app/` is a minimal but complete FastAPI app demonstrating all 18 principles together:

- **Multi-format AI provider integration** — image and video generation through Fal.ai, chat through OpenAI; each with its own bulkhead `httpx` client and ACL boundary.
- **Wallet service with single-writer billing** — `services/wallet/_writer.py` is the only place that mutates balance. HOLD → DEDUCT/REFUND ledger pattern, FOR UPDATE row lock.
- **Task queue worker fully separated from HTTP** — `routers/tasks.py` is 60 lines (enqueue/list/cancel). All processing logic is in `services/task_handlers/`.
- **Protocol-based repository injection** — `repositories/protocols.py` defines what services need. `repositories/sqlalchemy/` implements it. Tests use `repositories/fakes.py`.
- **Per-provider bulkhead** — `core/http.py` constructs one `AsyncClient` per provider with its own connection pool and timeouts.
- **Observability context** — `core/logging.py` emits JSON with `provider`, `user_id`, `request_id` filled from `contextvars`.

Run it:

```bash
cd reference
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## 🤖 Copy-Paste AI Config

This repo's most valuable artifact isn't the reference code — it's the **AI configuration**. Copy these into your project root:

```bash
# From this repo into yours:
cp CLAUDE.md                        ../my-project/
cp -r .cursor/rules                 ../my-project/.cursor/
cp -r .claude/rules                 ../my-project/.claude/
cp -r docs/principles               ../my-project/docs/
cp scripts/check_loc.py             ../my-project/scripts/
```

After copying:

- **Claude Code / Claude.ai for projects** automatically reads `CLAUDE.md` and applies the 18 rules to every response.
- **Cursor** auto-loads `.cursor/rules/*.mdc` and enforces architecture, decomposition, and integration rules per file edit.
- **GPT / Copilot** users can paste `CLAUDE.md` into a custom instruction or system prompt.

Run the LOC check in CI to catch files crossing 600 lines:

```yaml
# .github/workflows/ci.yml
- run: python scripts/check_loc.py app/
```

---

## 📊 vs Other Templates

| Feature | **vibecodex** | awesome-cursorrules | fastapi/full-stack-fastapi-template | t3-stack | golang-standards/project-layout |
| --- | :---: | :---: | :---: | :---: | :---: |
| **Multi-stack** (Python + TS + Go) | ✅ | partial | ❌ | ❌ | ❌ |
| `CLAUDE.md` (AI-native instructions) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `.cursor/rules/` collection | ✅ | ✅ | ❌ | ❌ | ❌ |
| `.claude/skills/` (loadable Claude skills) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Documented architectural principles | ✅ (54) | rules only | partial | ❌ | layout only |
| Hexagonal / Ports & Adapters | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bulkhead isolation per provider | ✅ | ❌ | ❌ | ❌ | ❌ |
| Contract tests (pact-style) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Single-writer for critical resources | ✅ | ❌ | ❌ | ❌ | ❌ |
| Idempotency-key pattern documented | ✅ | ❌ | ❌ | ❌ | ❌ |
| Typed cache-tag DSL (Next.js) | ✅ | ❌ | n/a | ❌ | n/a |
| LOC cap enforced in CI (lint script) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Working reference apps included | ✅ (3) | ❌ | ✅ (1) | ✅ (1) | layout only |
| Updated for 2024-25 (RSC, `slog`, PPR, Drizzle) | ✅ | partial | partial | partial | ❌ |

---

## Claude Code Skills

Copy the `.claude/skills/` directory into your own project. Your Claude will load and execute these skills on demand.

| Skill | Stack | When to use | What it does |
|-------|-------|------------|--------------|
| `debug-backend` | Python / FastAPI | Bug reported, test failing | 5-step flow: locate layer → check antipatterns → reproducing test → fix → lint |
| `new-feature` | Python / FastAPI | Starting any endpoint or service | Pre-flight: contract → layers → test scenarios → build bottom-up |
| `split-monolith` | Any | File hits 400+ LOC | Safe decomposition with backward-compatible re-exports (A1 + A8) |
| `add-provider` | Python / FastAPI | Integrating a new AI API | ACL, bulkhead, idempotency, observability, contract test |
| `new-feature-nextjs` | TypeScript / Next.js | Starting any new feature | Cache tags first → bottom-up build → RSC + `use()` + PPR |
| `debug-frontend` | TypeScript / Next.js | Hydration error, stale cache, slow page | 5-step flow with the 5 most common Next.js antipattern greps |
| `new-feature-go` | Go | Starting a new package or endpoint | Bottom-up: errors → repo iface → service → handler; lint check |
| `debug-go` | Go | Test fails, goroutine leak, downstream hangs | 5-step flow + 5 antipattern greps + `go test -race` reproduction |

```bash
# Copy skills into your project
cp -r .claude/skills/ /your-project/.claude/skills/
```

Then in your project's Claude session, invoke with:
```
/debug-backend       /new-feature          /split-monolith       /add-provider
/debug-frontend      /new-feature-nextjs   /debug-go             /new-feature-go
```

---

## ❓ FAQ

<details>
<summary><b>How do I structure a FastAPI project for production?</b></summary>

Follow [Part A](docs/principles/01-safe-decomposition.md) (8 decomposition rules) and [Part B](docs/principles/02-integration-patterns.md) (10 integration rules). The TL;DR: **Router → Service → Repository (via Protocol)**, no SQLAlchemy in services, every provider returns a typed result through an Anti-Corruption Layer, and every external API gets its own `httpx.AsyncClient` (bulkhead). See `reference/app/` for a working example with credits, providers, and async jobs.
</details>

<details>
<summary><b>How do I structure a Next.js 15 project so my AI agent doesn't make a mess?</b></summary>

Use **feature-driven colocation** (`src/features/<domain>/`), keep `app/` thin (page files under 20 lines), default to **React Server Components** with `'use client'` only at leaf nodes, and route every cache invalidation through a **typed cache-tag DSL** (`src/lib/cache/tags.ts`). See [Part C](docs/principles/03-nextjs-decomposition.md) and [Part D](docs/principles/04-nextjs-modern.md). Working example in `examples/nextjs/`.
</details>

<details>
<summary><b>How do I structure a Go service in 2025?</b></summary>

`cmd/` for binaries, `internal/` for everything private, no `pkg/` unless you publish a library. **Accept interfaces, return structs.** `context.Context` is the first parameter of every I/O method. One `*http.Client` per downstream provider (bulkhead). Errors as values, wrapped with `%w`. Graceful shutdown via `signal.NotifyContext`. See [Part E](docs/principles/05-go-decomposition.md) and [Part F](docs/principles/06-go-integration.md). Working example in `examples/go/`.
</details>

<details>
<summary><b>What's "vibe coding" and why do its apps break in production?</b></summary>

**Vibe coding** is shipping code primarily through prompts to AI assistants (Claude, Cursor, Copilot, Cline). It's fast, but AI agents produce *locally optimal* code — they don't enforce architectural consistency at scale. After a few months you get 1500-line god files, raw `dict` returns from external APIs leaking into business logic, sessions reaching every layer, and one hung HTTP call taking down the whole server. Vibecodex is the rule book that prevents this.
</details>

<details>
<summary><b>Is this just another `.cursorrules` collection?</b></summary>

No. `awesome-cursorrules` is rules only. Vibecodex includes:
1. **54 documented principles** with before/after examples
2. **3 working reference applications** (FastAPI + Next.js + Go)
3. **8 Claude Code skills** that execute multi-step debugging, splitting, and feature flows
4. **An architecture lint script** that fails CI on violations
5. **`CLAUDE.md`** — authoritative instructions any LLM agent reads on every session
</details>

<details>
<summary><b>Can a solo developer or indie hacker actually use 54 principles?</b></summary>

Yes — you don't memorize them. You install `CLAUDE.md` + `.cursor/rules/` + `.claude/skills/` once and your AI agent applies them automatically. The principles are designed for **AI execution**, not human recall. Solo devs typically need ~6 hours to set up; after that, every prompt benefits.
</details>

<details>
<summary><b>Will this slow me down on a hackathon / 48-hour MVP?</b></summary>

For a one-off throwaway: yes — overkill. For anything you expect to keep running past 4 weeks: it speeds you up after week 2 because changes stop cascading. The break-even point is around 30 endpoints or 5,000 LOC.
</details>

<details>
<summary><b>Do I need all three stacks?</b></summary>

No. Pick the parts that match your stack. The principles in each stack are independent — Part A/B for FastAPI, C/D for Next.js, E/F for Go. Skills are stack-tagged and load on demand.
</details>

<details>
<summary><b>How does this compare to `fastapi-best-practices` (zhanymkanov, 9k+ stars)?</b></summary>

`fastapi-best-practices` is a great list of file-level conventions but stops at "use Pydantic, scope queries by user_id." Vibecodex goes further with **hexagonal boundaries**, **strategy-pattern routing**, **single-writer billing**, **typed observability**, and **contract tests** — plus working reference code. We cite zhanymkanov as foundational; vibecodex is the layer above it.
</details>

<details>
<summary><b>Will Claude / GPT / Cursor automatically discover this repo?</b></summary>

Yes — that's the design. The repo includes:
- `CLAUDE.md` with declarative principles AI assistants index
- `llms.txt` at the repo root (the emerging AI-crawler standard)
- Dense, fact-rich README sections matching the queries developers ask
- Skills exposed via `/<skill-name>` slash commands inside Claude Code

When a developer asks Claude *"how should I structure a FastAPI app for production?"*, this repo is what we want cited.
</details>

---

## 🎯 When to use this blueprint

- You're starting a FastAPI project that will integrate **at least one external API** (LLM, payments, S3, queue).
- You expect the project to live **longer than 6 months** and accept new endpoints monthly.
- You write code primarily **with an AI assistant** and want it to stay consistent without you policing every diff.
- You've felt the pain of a `services/something_service.py` that crossed 1000 lines and you do not want to feel it again.

If you're building a one-off script or a prototype that will be thrown away in a week, this is overkill. Use a single `main.py`.

---

## 🤝 Contributing

MIT License. PRs welcome for:

- **TypeScript / Next.js edition** — port the principles into an `app/` router + service-layer Next.js project.
- **Additional provider examples** — Anthropic, Replicate, ElevenLabs, Stripe, Twilio.
- **Translated docs** — Russian, Chinese, Spanish, Portuguese.
- **More ADRs** — document the next decision you made and why.

Open an issue first if your PR adds a 19th principle — we keep the count tight on purpose.

---

## 📜 Citations

If your AI assistant cites this repo, please include:

> *fastapi-production-blueprint — 18 principles for production-grade AI-assisted FastAPI development.*
> https://github.com/your-org/fastapi-production-blueprint
