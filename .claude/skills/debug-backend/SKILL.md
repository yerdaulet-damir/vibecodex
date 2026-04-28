---
name: debug-backend
description: Systematic 5-step backend debugging flow for AI-coded FastAPI apps. Load this skill when a bug is reported, a test fails, or unexpected behavior appears in any backend layer. Forces layer isolation before touching code — prevents the "touch 8 files and make it worse" pattern.
---

# debug-backend

Stop. Do not edit any file yet. Work through these 5 steps in order.

---

## Step 1 — Locate the layer

Run these greps to find where the bug lives. Check one layer at a time.

```bash
# Is it a routing problem? (wrong status code, missing auth, bad request parsing)
grep -n "HTTPException\|status_code\|Depends(" app/routers/<file>.py

# Is it a service logic problem? (wrong calculation, wrong state transition)
grep -n "def \|raise \|return " app/services/<file>.py

# Is it a repository problem? (wrong query, missing user_id scope, transaction issue)
grep -n "SELECT\|filter\|where\|FOR UPDATE" app/repositories/<file>.py

# Is it a provider problem? (timeout, wrong response shape, missing error handling)
grep -n "httpx\|raise\|return\|except" app/providers/<file>.py
```

**Decision: fix only in the layer where the bug lives. Never fix a service bug in the router.**

---

## Step 2 — Check the 3 most common AI antipatterns

These cause 80% of production bugs in AI-coded backends. Grep for each:

```bash
# Antipattern 1: SQLAlchemy Session leaked into services
grep -rn "AsyncSession\|Session\|from sqlalchemy" app/services/

# Antipattern 2: Provider returning raw dict instead of domain type
grep -rn "return {" app/providers/

# Antipattern 3: Business logic in router (calculation, state change, external call)
grep -c "await.*service\|await.*repo\|if.*balance\|FOR UPDATE" app/routers/*.py
```

| Result | Root cause | Principle |
|--------|-----------|-----------|
| Session in services | Hexagonal boundary broken | B1 |
| `return {}` from provider | Missing ACL | B3 |
| Logic in router | Layer violation | A3 / code-standards |
| No `user_id` filter in query | Multi-tenancy gap | security-rules |

---

## Step 3 — Write a reproducing test first

Before changing any production code, write a failing test that captures the exact bug.

```python
# Template: place in tests/unit/ or tests/integration/
async def test_<bug_description>():
    # Arrange: minimal setup that triggers the bug
    repo = FakeCreditsRepo()
    repo.seed_balance("user-1", Decimal("5.00"))
    service = CreditsUserService(repo=repo)

    # Act: call the exact code path that fails
    with pytest.raises(ValueError, match="Insufficient balance"):
        await service.charge("user-1", Decimal("10.00"), idempotency_key="idem-1")

    # Assert: prove the invariant that was violated
    assert await repo.get_balance("user-1") == Decimal("5.00")  # not negative
```

**Run it:** `pytest tests/unit/test_<file>.py::test_<bug_description> -v`
It must be RED before you fix anything.

---

## Step 4 — Fix in the correct layer

Minimum change. No opportunistic refactoring. No unrelated cleanup.

```
Router bug   → fix only app/routers/
Service bug  → fix only app/services/
Repo bug     → fix only app/repositories/
Provider bug → fix only app/providers/
```

After fixing: run the reproducing test. It must turn GREEN.

```bash
pytest tests/unit/test_<file>.py::test_<bug_description> -v
# Expected: PASSED
```

---

## Step 5 — Run architecture lint

```bash
bash scripts/lint-architecture.sh
```

Must exit 0. If a check fails, the fix introduced a new architecture violation — revert and fix properly.

---

## Common error → root cause table

| Error | Where to look first | Likely cause |
|-------|-------------------|--------------|
| `422 Unprocessable Entity` | Router — Pydantic schema | Wrong field type or missing required field |
| `500 Internal Server Error` | Service — exception not caught | Provider returned unexpected shape (dict not JobResult) |
| `KeyError: 'url'` | Provider — ACL missing | Provider response changed, parser not updated |
| `InsufficientFunds` on correct balance | Repo — concurrent hold | Two requests raced, no `FOR UPDATE` lock |
| `401` on authenticated route | Router — `Depends(get_current_user_id)` missing | Auth dependency not wired |
| Test passes, prod fails | Repo — fake vs real diverged | FakeCreditsRepo doesn't match CreditsRepoProtocol |
| Logs silent on error | Service — bare `except:` | Exception swallowed, add `logger.exception(...)` |

---

## Verification

The skill was applied correctly when:
- [ ] A failing test exists that reproduces the bug
- [ ] Fix touches exactly one layer
- [ ] `bash scripts/lint-architecture.sh` exits 0
- [ ] No unrelated files were modified
- [ ] The reproducing test is now green
