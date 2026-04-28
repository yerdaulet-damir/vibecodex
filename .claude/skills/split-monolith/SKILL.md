---
name: split-monolith
description: Safe procedure for decomposing a god file (400+ LOC) into a sub-package without breaking any imports. Load when a file exceeds 400 lines or mixes multiple concerns. Implements vibecodex Principles A1 and A8 — folder-instead-of-file with backward-compatible re-exports.
---

# split-monolith

A file split done wrong breaks every caller. Follow this procedure exactly — it is reversible at every step.

---

## Step 0 — Confirm the file needs splitting

```bash
wc -l app/services/<file>.py
```

| Lines | Action |
|-------|--------|
| < 400 | Do not split — you're solving a non-problem |
| 400–600 | Plan the split now, execute when convenient |
| > 600 | Split immediately (Principle A7 hard cap) |

Also ask: does this file mix multiple concerns? A file that is long but cohesive is better than a premature split.

---

## Step 1 — Identify the domain splits

Do NOT split by size. Split by **type of responsibility**.

Good splits (by domain):
```
wallet_service.py (1200 LOC) →
  wallet/user.py      ← user-facing operations (charge, refund)
  wallet/admin.py     ← admin operations (top-up, override)
  wallet/history.py   ← read-only queries
```

Good splits (by layer):
```
generation_service.py (1000 LOC) →
  generation/orchestrator.py   ← coordinates the flow
  generation/cost.py           ← cost calculation logic
  generation/storage.py        ← result persistence
```

Bad splits (by size only — don't do this):
```
big_service.py →
  big_service_part1.py   ← meaningless
  big_service_part2.py   ← meaningless
```

Write the target structure before touching any file.

---

## Step 2 — Create the package directory

```bash
mkdir app/services/<domain>/
```

Do NOT move any code yet.

---

## Step 3 — Create sub-files one at a time

For each sub-file, copy (not move) the relevant functions:

```bash
# Create the new file with the relevant subset
touch app/services/<domain>/user.py
# Copy relevant classes/functions from the original
```

Each sub-file must:
- Have its own imports (do not rely on `*` imports)
- Be under 200 LOC (you're splitting — keep it lean)
- Contain one cohesive responsibility

---

## Step 4 — Create `__init__.py` with ALL old names re-exported

This is the most important step. Every name that existed in the original file must still be importable from the same path.

```python
# app/services/<domain>/__init__.py

# Principle A8: re-export everything so callers don't change.
from app.services.<domain>.user import CreditsUserService
from app.services.<domain>.admin import CreditsAdminService
from app.services.<domain>.user import get_credits_user_service

# Backward-compat alias if the old class had a different name
CreditsService = CreditsUserService  # old name → new class

__all__ = [
    "CreditsUserService",
    "CreditsAdminService",
    "CreditsService",           # backward compat
    "get_credits_user_service",
]
```

---

## Step 5 — Verify no import breaks

```bash
# Check every file that imported from the old module still works
python3 -c "from app.services.<domain> import <OldClassName>"
python3 -c "from app.services.<domain> import <AnotherClass>"

# Run the full test suite
pytest tests/ -x -q
```

All tests must be GREEN before deleting the original file.

---

## Step 6 — Delete the original file

Only after Step 5 passes:

```bash
rm app/services/<original_file>.py
```

Run tests again:

```bash
pytest tests/ -x -q
bash scripts/lint-architecture.sh
```

Both must pass.

---

## Common mistakes

| Mistake | Consequence | Prevention |
|---------|------------|------------|
| Split before writing `__init__.py` | Import errors everywhere | Always create `__init__.py` first |
| Split by size, not responsibility | Sub-files still coupled | Ask: "what is the single job of this file?" |
| Forget to re-export old names | Callers break silently | List every public name before splitting |
| Move code instead of copy+verify | Can't roll back | Copy first, delete only after tests pass |
| Split and refactor at same time | Impossible to debug | One PR = one split. No logic changes. |

---

## Verification

The split was done correctly when:
- [ ] All sub-files are under 200 LOC
- [ ] `__init__.py` re-exports every name that existed before
- [ ] `python3 -c "from app.services.<domain> import <OldName>"` works
- [ ] `pytest tests/ -x -q` is green
- [ ] `bash scripts/lint-architecture.sh` exits 0
- [ ] Original file is deleted
