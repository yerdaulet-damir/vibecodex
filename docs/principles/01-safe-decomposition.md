# Part A — Safe Decomposition

> 8 structural principles for splitting files and folders **without breaking imports** and **without losing the thread of the codebase**.

These rules answer one question: *"how do I keep this growing FastAPI project navigable past month 6?"* They are mechanical — you can apply them without judgment calls, and the diff stays small.

Each principle includes:
- The **problem** (a real "before" snippet from a typical vibe-coded codebase)
- The **solution** (the "after" — what you do instead)
- The **trigger** (the concrete signal that says "do it now")
- The **impact** (what breaks if you don't)

---

## A1 — Folder-instead-of-file when domain splits by type

**Summary:** when a single router/service file grows to handle multiple disjoint formats (image / video / audio; user / admin), convert the `.py` file into a package and move each format into its own sub-file. `__init__.py` re-exports the combined symbol so callers don't change.

### Problem (BEFORE)

```python
# app/routers/generate.py — 820 LOC and growing
from fastapi import APIRouter, Depends, Header
from uuid import UUID, uuid4
from app.core.deps import get_current_user_id, get_image_svc, get_video_svc, get_audio_svc
from app.schemas.generate import (
    ImageRequest, ImageResponse,
    VideoRequest, VideoResponse,
    AudioRequest, AudioResponse,
)

router = APIRouter(prefix="/generate", tags=["generate"])

@router.post("/image", response_model=ImageResponse)
async def generate_image(req: ImageRequest, user_id: str = Depends(get_current_user_id),
                          key: UUID = Header(default_factory=uuid4, alias="Idempotency-Key"),
                          svc=Depends(get_image_svc)) -> ImageResponse:
    # ... 80 lines of image-specific logic ...

@router.post("/video", response_model=VideoResponse)
async def generate_video(req: VideoRequest, user_id: str = Depends(get_current_user_id),
                          key: UUID = Header(default_factory=uuid4, alias="Idempotency-Key"),
                          svc=Depends(get_video_svc)) -> VideoResponse:
    # ... 110 lines of video-specific logic, including a polling loop ...

@router.post("/audio", response_model=AudioResponse)
async def generate_audio(req: AudioRequest, user_id: str = Depends(get_current_user_id),
                          key: UUID = Header(default_factory=uuid4, alias="Idempotency-Key"),
                          svc=Depends(get_audio_svc)) -> AudioResponse:
    # ... 70 lines of audio-specific logic ...

# ... three more endpoints, each with its own helpers ...
```

Why this hurts:
- The file mixes three independent domains. Touching video logic forces a re-read of image logic.
- Tests have to import the entire router for each domain.
- `git blame` becomes unreadable; PRs touch unrelated lines.
- The next AI prompt to "add audio retry logic" produces a diff that touches lines near the image handler.

### Solution (AFTER)

```
app/routers/generate/
    __init__.py          # combines and re-exports `router`
    image.py             # ~150 LOC
    video.py             # ~180 LOC
    audio.py             # ~120 LOC
```

```python
# app/routers/generate/__init__.py
from fastapi import APIRouter
from .image import router as image_router
from .video import router as video_router
from .audio import router as audio_router

router = APIRouter(prefix="/generate", tags=["generate"])
router.include_router(image_router)
router.include_router(video_router)
router.include_router(audio_router)

__all__ = ["router"]
```

```python
# app/routers/generate/image.py
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, Header
from app.core.deps import get_current_user_id, get_image_svc
from app.schemas.generate.image import ImageRequest, ImageResponse
from app.services.ai import ImageGenerationService

router = APIRouter()

@router.post("/image", response_model=ImageResponse, status_code=201)
async def generate_image(
    req: ImageRequest,
    user_id: str = Depends(get_current_user_id),
    key: UUID = Header(default_factory=uuid4, alias="Idempotency-Key"),
    svc: ImageGenerationService = Depends(get_image_svc),
) -> ImageResponse:
    result = await svc.generate(user_id=user_id, request=req, idempotency_key=key)
    return ImageResponse.from_domain(result)
```

`main.py` keeps `from app.routers.generate import router` — **zero caller changes**.

### Trigger

Apply A1 when **any** is true:
- The `.py` file has 2+ disjoint sub-domains and crosses 400 LOC.
- The file has 3+ endpoints and is approaching 500 LOC.
- A diff to one endpoint regularly touches lines near another endpoint.

### Impact if you don't

After 12 months, you have a 1400-line `generate.py`. Every PR has merge conflicts. Adding a new format (3D? Music?) requires reading the whole file. Tests run slow because the test module has to import every dependency for every format.

---

## A2 — Static data ≠ runtime logic

**Summary:** pricing tables, model registries, prompt templates, country lists belong in their own data modules — not inline at the top of a service file.

### Problem (BEFORE)

```python
# app/services/ai_service.py — 1100 LOC
from decimal import Decimal

PRICING = {
    "gpt-4o":           Decimal("0.005"),
    "gpt-4o-mini":      Decimal("0.0005"),
    "claude-3-5-sonnet":Decimal("0.003"),
    "claude-3-haiku":   Decimal("0.00025"),
    "gemini-1.5-pro":   Decimal("0.0035"),
    # ... 80 more entries ...
}

MODEL_CAPABILITIES = {
    "gpt-4o":             {"vision": True,  "tools": True,  "context": 128_000},
    "claude-3-5-sonnet":  {"vision": True,  "tools": True,  "context": 200_000},
    # ... 60 more entries ...
}

DEFAULT_PROMPTS = {
    "image_v1": "Render a high-quality...",
    "image_v2": "...",
    # ...
}

class AIService:
    # ... 800 lines of logic that uses these dicts ...
```

Updating one price = a PR that touches `ai_service.py`. The service file is now an SCM hotspot; `git log -p` is unreadable.

### Solution (AFTER)

```
app/data/
    model_pricing.py
    model_capabilities.py
    prompts.py
```

```python
# app/data/model_pricing.py
"""Per-1k-token output pricing in USD. SSOT for billing."""
from decimal import Decimal

PRICING: dict[str, Decimal] = {
    "gpt-4o":            Decimal("0.005"),
    "gpt-4o-mini":       Decimal("0.0005"),
    "claude-3-5-sonnet": Decimal("0.003"),
    "claude-3-haiku":    Decimal("0.00025"),
    "gemini-1.5-pro":    Decimal("0.0035"),
}

def price_per_1k(model_id: str) -> Decimal:
    if model_id not in PRICING:
        raise KeyError(f"unknown model: {model_id}")
    return PRICING[model_id]
```

```python
# app/services/ai/orchestrator.py
from app.data.model_pricing import price_per_1k

class AIOrchestrator:
    def cost_estimate(self, model_id: str, output_tokens: int) -> Decimal:
        return price_per_1k(model_id) * Decimal(output_tokens) / Decimal(1000)
```

### Trigger

Apply A2 when **any** is true:
- A literal dict/list in your service file exceeds 30 lines.
- The same constant is needed by a second module.
- Updating the data is a frequent operation (>1/month) and the service file is itself getting commits.

### Impact if you don't

Pricing updates collide with logic changes in PRs. Two developers updating different prices stomp each other. Tests for the service mock `PRICING` and forget to mock newly-added entries.

---

## A3 — Auth and schemas don't live with endpoints

**Summary:** a router file should contain **only HTTP handlers**. Auth dependencies, Pydantic schemas, and helper utilities belong elsewhere.

### Problem (BEFORE)

```python
# app/routers/admin.py — 520 LOC
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user_id
from app.models.user import User

# --- auth (lives here for some reason) ---
async def require_admin(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:
    u = db.query(User).filter(User.id == user_id).first()
    if not u or not u.is_admin:
        raise HTTPException(403, "admin required")
    return user_id

# --- schemas (also live here) ---
class AdjustWalletRequest(BaseModel):
    user_id: str
    amount: Decimal
    reason: str = Field(min_length=3, max_length=200)

class ListUsersResponse(BaseModel):
    users: list[dict]
    total: int

# --- routes ---
router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/wallet/adjust")
async def adjust_wallet(req: AdjustWalletRequest, admin_id: str = Depends(require_admin),
                         db: Session = Depends(get_db)):
    # ... 60 lines of logic ...

@router.get("/users", response_model=ListUsersResponse)
async def list_users(admin_id: str = Depends(require_admin), db: Session = Depends(get_db)):
    # ... 40 lines ...
```

Why this hurts:
- The file has **three reasons to change**: routes, auth, schemas.
- `require_admin` cannot be reused by another router without circular-import gymnastics.
- The file violates A1 (mixes wallet ops, user ops in one place).

### Solution (AFTER)

```
app/core/admin_auth.py           # require_admin dep
app/schemas/admin/
    wallet.py                    # AdjustWalletRequest, AdjustWalletResponse
    users.py                     # ListUsersResponse
app/routers/admin/
    __init__.py                  # combines and re-exports
    wallet.py                    # only HTTP for wallet ops
    users.py                     # only HTTP for user ops
```

```python
# app/core/admin_auth.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user_id
from app.models.user import User

async def require_admin(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:
    u = db.query(User).filter(User.id == user_id).first()
    if not u or not u.is_admin:
        raise HTTPException(403, detail="admin required")
    return user_id
```

```python
# app/schemas/admin/wallet.py
from decimal import Decimal
from pydantic import BaseModel, Field

class AdjustWalletRequest(BaseModel):
    user_id: str
    amount: Decimal
    reason: str = Field(min_length=3, max_length=200)

class AdjustWalletResponse(BaseModel):
    user_id: str
    new_balance: Decimal
```

```python
# app/routers/admin/wallet.py
from fastapi import APIRouter, Depends
from app.core.admin_auth import require_admin
from app.core.deps import get_admin_wallet_svc
from app.schemas.admin.wallet import AdjustWalletRequest, AdjustWalletResponse
from app.services.wallet.admin import WalletAdminService

router = APIRouter(prefix="/admin/wallet", tags=["admin"])

@router.post("/adjust", response_model=AdjustWalletResponse)
async def adjust(
    req: AdjustWalletRequest,
    admin_id: str = Depends(require_admin),
    svc: WalletAdminService = Depends(get_admin_wallet_svc),
) -> AdjustWalletResponse:
    wallet = await svc.credit_compensation(
        user_id=req.user_id, amount=req.amount, reason=req.reason, key=req.idempotency_key,
    )
    return AdjustWalletResponse(user_id=wallet.user_id, new_balance=wallet.balance)
```

### Trigger

Apply A3 when:
- A router file defines its own auth dep used by 2+ endpoints in the file (refactor candidate).
- A router file declares 3+ Pydantic models inline.
- An auth dep is needed by a second router (move to `core/`).

### Impact if you don't

Schema changes force re-deploy of the whole router file. Auth logic forks: `require_admin` in `routers/admin.py` and a copy in `routers/billing.py`. They drift. One day the billing version forgets to check `is_active` and an offboarded admin still has access.

---

## A4 — Provider with N format APIs → file per format

**Summary:** a vendor that exposes multiple format APIs (image + video + audio) becomes a **package**, not a file. Shared HTTP plumbing lives in `_client.py`. Each format has its own adapter file.

### Problem (BEFORE)

```python
# app/providers/falai.py — 640 LOC
import httpx
from app.providers._types import GenerateResult, ProviderError

class FalAiAdapter:
    def __init__(self, api_key: str):
        self._http = httpx.AsyncClient(
            base_url="https://fal.run", headers={"Authorization": f"Key {api_key}"},
        )

    async def generate_image(self, prompt: str, model: str, n: int = 1) -> GenerateResult | ProviderError:
        # ... 80 lines, image-specific request shape ...

    async def generate_video(self, prompt: str, model: str, duration: int = 5) -> GenerateResult | ProviderError:
        # ... 140 lines, polling loop, video-specific shape ...

    async def generate_audio(self, prompt: str, model: str, length_s: int = 30) -> GenerateResult | ProviderError:
        # ... 90 lines ...

    # ... shared helpers, retries, ACL mapping for each format ...
```

The image and video request schemas have nothing in common, but they live in the same file. Fal.ai introduces a 4th format → file is now 800+ LOC.

### Solution (AFTER)

```
app/providers/falai/
    __init__.py                  # exports FalImageAdapter, FalVideoAdapter, FalAudioAdapter
    _client.py                   # FalClient — auth, retries, base URL (shared)
    image.py                     # FalImageAdapter
    video.py                     # FalVideoAdapter
    audio.py                     # FalAudioAdapter
```

```python
# app/providers/falai/_client.py
import httpx

class FalClient:
    def __init__(self, *, http: httpx.AsyncClient):
        self._http = http

    async def request(self, path: str, payload: dict) -> dict:
        resp = await self._http.post(path, json=payload)
        resp.raise_for_status()
        return resp.json()
```

```python
# app/providers/falai/image.py
from decimal import Decimal
from app.providers._types import GenerateResult, ProviderError, ProviderTimeout, ProviderQuotaExceeded
from app.domain.generate import ImageRequest
import httpx
from ._client import FalClient

class FalImageAdapter:
    def __init__(self, client: FalClient):
        self._c = client

    async def generate(self, req: ImageRequest) -> GenerateResult | ProviderError:
        try:
            data = await self._c.request("/v1/image", {
                "prompt": req.prompt, "model": req.model_id, "n": req.n,
            })
        except httpx.TimeoutException as e:
            return ProviderTimeout(str(e))
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                return ProviderQuotaExceeded(e.response.text)
            return ProviderError(e.response.text, retryable=False, code=str(e.response.status_code))

        return GenerateResult(
            url=data["images"][0]["url"],
            cost_usd=Decimal(str(data["billing"]["cost_usd"])),
            latency_ms=int(data["meta"]["latency_ms"]),
            provider_request_id=data["request_id"],
        )
```

### Trigger

Apply A4 the **first time** you add a second format to a vendor adapter. Doing it later is more painful than doing it now.

### Impact if you don't

Six months in, the file is 1100 LOC. The video request model has 14 optional fields; the image one has 4. Updating image retry logic accidentally breaks the video polling loop because they share a helper that drifted.

---

## A5 — Worker handlers do NOT live in the router

**Summary:** `routers/tasks.py` is HTTP-only — enqueue, list, cancel. Background processing logic belongs in `services/task_handlers/`, invoked by the queue worker, not by FastAPI.

### Problem (BEFORE)

```python
# app/routers/tasks.py — 800 LOC
from fastapi import APIRouter
from app.queue import queue

router = APIRouter()

@router.post("/tasks")
async def enqueue_task(req: EnqueueTaskRequest, user_id: str = Depends(get_current_user_id)):
    return await queue.send(req.payload)

# --- and right next to it, the worker code: ---
async def process_image_task(payload: dict) -> None:
    # ... 200 lines: load model, call provider, upload to S3, update DB, charge wallet ...

async def process_video_task(payload: dict) -> None:
    # ... 250 lines: same shape, video-specific ...
```

Why this hurts:
- The router file has both HTTP handlers and worker logic. The deploy unit doesn't matter — the **mental** unit does.
- The worker loop has to `from app.routers.tasks import process_image_task`, dragging FastAPI imports into a non-HTTP context.
- Testing the worker requires booting a `TestClient`.

### Solution (AFTER)

```
app/routers/tasks.py             # HTTP only — ~60 LOC
app/services/task_handlers/
    __init__.py
    image.py                     # process_image_task
    video.py                     # process_video_task
    audio.py                     # process_audio_task
    _common.py                   # shared helpers (e.g. result persistence)
```

```python
# app/routers/tasks.py
from fastapi import APIRouter, Depends
from app.core.deps import get_current_user_id, get_task_svc
from app.schemas.tasks import EnqueueTaskRequest, TaskResponse
from app.services.tasks import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", response_model=TaskResponse, status_code=202)
async def enqueue(req: EnqueueTaskRequest, user_id: str = Depends(get_current_user_id),
                  svc: TaskService = Depends(get_task_svc)) -> TaskResponse:
    task = await svc.enqueue(user_id=user_id, kind=req.kind, payload=req.payload)
    return TaskResponse.from_domain(task)

@router.get("", response_model=list[TaskResponse])
async def list_tasks(user_id: str = Depends(get_current_user_id),
                     svc: TaskService = Depends(get_task_svc)) -> list[TaskResponse]:
    return [TaskResponse.from_domain(t) for t in await svc.list_for(user_id)]

@router.delete("/{task_id}", status_code=204)
async def cancel(task_id: str, user_id: str = Depends(get_current_user_id),
                 svc: TaskService = Depends(get_task_svc)) -> None:
    await svc.cancel(user_id=user_id, task_id=task_id)
```

```python
# app/services/task_handlers/image.py
from app.domain.tasks import TaskPayload
from app.providers.falai.image import FalImageAdapter
from app.services.wallet.user import WalletUserService

async def process_image_task(
    payload: TaskPayload, *,
    image_adapter: FalImageAdapter,
    wallet_svc: WalletUserService,
) -> None:
    # 1. HOLD funds
    await wallet_svc.hold(user_id=payload.user_id, amount=payload.budget, key=payload.key)
    # 2. call provider
    result = await image_adapter.generate(payload.to_image_request())
    # 3. DEDUCT or REFUND based on outcome
    if isinstance(result, ProviderError):
        await wallet_svc.refund(user_id=payload.user_id, amount=payload.budget, key=payload.key)
        raise
    await wallet_svc.deduct(user_id=payload.user_id, amount=result.cost_usd, key=payload.key)
    # 4. persist result, mark task done
    # ...
```

The queue worker (separate process) imports from `services/task_handlers`, never touches FastAPI.

### Trigger

Apply A5 the **first time** you add a worker function to a router file. Even one. Worker code in HTTP modules is a smell that grows fast.

### Impact if you don't

The router file becomes 1500 LOC. Hot-reload during dev imports the worker code on every request. Testing the worker forces booting `TestClient`. The worker process imports half of FastAPI's dependency tree at startup, doubling memory.

---

## A6 — User-API ≠ Admin-API in the same service file

**Summary:** when a service file mixes end-user methods and admin methods, split them. User code can't reach admin functions by accident; admin tools are isolated for audit.

### Problem (BEFORE)

```python
# app/services/wallet_service.py — 720 LOC
class WalletService:
    async def get_balance(self, user_id: str) -> Decimal: ...
    async def hold(self, user_id: str, amount: Decimal, key: UUID) -> Wallet: ...
    async def deduct(self, user_id: str, amount: Decimal, key: UUID) -> Wallet: ...
    async def refund(self, user_id: str, amount: Decimal, key: UUID) -> Wallet: ...
    async def list_history(self, user_id: str, limit: int) -> list[LedgerEntry]: ...

    # admin-only — DANGEROUS if reachable from user paths
    async def credit_compensation(self, user_id: str, amount: Decimal, reason: str, key: UUID): ...
    async def force_zero_balance(self, user_id: str, reason: str): ...
    async def reverse_entry(self, entry_id: UUID, reason: str): ...
    async def export_all_history(self) -> list[LedgerEntry]: ...      # leaks all users
    async def adjust_debt(self, user_id: str, new_debt: Decimal): ...
```

Why this hurts:
- A junior dev (or AI assistant) wires `WalletService` into a user route, then calls `force_zero_balance` because "it was right there."
- Audits have to read 720 lines to confirm no admin method is reachable from user paths.
- Permissions check is duplicated: each method has its own admin guard, easy to forget.

### Solution (AFTER)

```
app/services/wallet/
    __init__.py
    user.py                      # WalletUserService — end-user methods
    admin.py                     # WalletAdminService — admin tools
    history.py                   # WalletHistoryService — read-only history
    _writer.py                   # apply_ledger_entry — single writer (B10)
    exceptions.py                # InsufficientFundsError, etc.
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

    async def get_balance(self, user_id: str) -> Decimal:
        return (await self._repo.get(user_id)).balance

    async def hold(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(self._repo, LedgerEntry.hold(user_id, amount, key))

    async def deduct(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(self._repo, LedgerEntry.deduct(user_id, amount, key))

    async def refund(self, *, user_id: str, amount: Decimal, key: UUID) -> Wallet:
        return await apply_ledger_entry(self._repo, LedgerEntry.refund(user_id, amount, key))
```

```python
# app/services/wallet/admin.py
from decimal import Decimal
from uuid import UUID
from app.repositories.protocols import WalletRepoProtocol
from app.domain.wallet import LedgerEntry
from ._writer import apply_ledger_entry

class WalletAdminService:
    def __init__(self, repo: WalletRepoProtocol):
        self._repo = repo

    async def credit_compensation(self, *, user_id: str, amount: Decimal, reason: str, key: UUID):
        return await apply_ledger_entry(
            self._repo, LedgerEntry.admin_credit(user_id, amount, reason, key),
        )

    async def reverse_entry(self, *, entry_id: UUID, reason: str, key: UUID):
        # ... explicit reversal logic ...
```

User routers depend on `WalletUserService`; admin routers depend on `WalletAdminService`. Type system prevents accidents.

### Trigger

Apply A6 when:
- A service has methods only callable by admins **and** methods callable by users.
- Audits regularly worry about whether route X can reach method Y.

### Impact if you don't

Eventually a fast-shipping PR exposes `force_zero_balance` to the user-facing `/wallet/me` endpoint because of a copy-paste. Customer balances zero out. You learn about it from Twitter.

---

## A7 — Soft cap 400 LOC, hard cap 600 LOC per file

**Summary:** at 400 lines you must plan a split. At 600 lines you must split before merging. This is mechanical and enforced by CI.

### Why these numbers

- **400 LOC** is the threshold beyond which most developers cannot hold the file in their head while editing.
- **600 LOC** is the threshold beyond which `git diff` PRs become unreviewable and merge conflicts compound.
- These numbers come from empirical research on code review (Cohen, Cisco study) and from common style guides (Google, LinkedIn).

### Enforcement

```python
# scripts/check_loc.py
import sys, pathlib

HARD = 600
SOFT = 400

def main(roots: list[str]) -> int:
    fail = False
    for root in roots:
        for p in pathlib.Path(root).rglob("*.py"):
            if p.name == "__init__.py":
                continue
            n = sum(1 for _ in p.open(encoding="utf-8"))
            if n > HARD:
                print(f"HARD-FAIL {p}: {n} LOC > {HARD}")
                fail = True
            elif n > SOFT:
                print(f"WARN      {p}: {n} LOC > {SOFT}")
    return 1 if fail else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["app"]))
```

CI step:

```yaml
- name: file size check
  run: python scripts/check_loc.py app/
```

### Yellow zone (400–600) — what to do

Add a header comment:

```python
# TODO(decompose): A1 — split this file by {image, video, audio} before next change.
```

The next PR touching the file must include the split or be rejected.

### Impact if you don't

You ship the file at 1400 LOC. The next dev grep the wrong line, edits the image handler thinking it's video, and pushes a regression to prod.

---

## A8 — Refactor without breaking changes

**Summary:** when you split a file, the old public names must keep resolving via `__init__.py` re-exports until callers migrate. Decomposition is invisible from the outside.

### Pattern

```python
# Before split: from app.services.wallet_service import WalletService

# After split, services/wallet/__init__.py:
from .user import WalletUserService
from .admin import WalletAdminService

# Backwards-compat alias — keep until callers migrate
WalletService = WalletUserService

__all__ = ["WalletUserService", "WalletAdminService", "WalletService"]
```

Old code keeps working:

```python
from app.services.wallet import WalletService   # still works
```

After the migration PR moves all callers to `WalletUserService`, remove the alias in a separate PR.

### Why two PRs

- **PR 1 (split + alias):** mechanical, low-risk, tests still pass with no changes.
- **PR 2 (remove alias):** all caller updates in one place. Easy to review. Easy to revert.

If you do both in one PR, you get a 40-file diff and reviewers approve it on faith.

### When the AI assistant has stale memory

LLMs trained or instructed on an older snapshot of the repo will sometimes try `from app.services.wallet_service import WalletService`. The alias keeps that working. They get the new structure on the next session refresh; meanwhile their generated code still imports.

### Impact if you don't

Every refactor PR breaks half the codebase. PR sizes balloon to 30+ files. Reviewers stop reading carefully. Bugs slip in.

---

## Decomposition Checklist (before any PR)

```
□ Each file ≤ 400 LOC (or has a TODO(decompose) header if 400–600).
□ No file > 600 LOC.
□ No router file contains business logic, schemas, or auth deps inline.
□ No service file contains worker handlers.
□ No service file mixes user + admin methods.
□ No provider file mixes 2+ format APIs.
□ Static data is in app/data/ or <domain>/registry.py, not inlined.
□ Refactors that move public symbols include backwards-compat aliases in __init__.py.
```

If every box is checked, the codebase will still be readable in 18 months.
