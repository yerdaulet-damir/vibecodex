---
name: new-feature
description: Pre-flight checklist that must complete before writing the first line of code for any new feature. Load this skill when starting a new endpoint, service method, or integration. Prevents the most common AI-coding failure mode — writing code before defining layer boundaries, which leads to features that work today and break in 3 months.
---

# new-feature

Do not open any file for editing until all 5 steps below are completed.

---

## Step 1 — Define the API contract

Write the contract in plain text before any code. Answer these 4 questions:

```
Endpoint:   POST /generate/image
Request:    { prompt: str, model_id: str, width: int, height: int }
Response:   { task_id: str, status: "queued" }
Side effect: creates a task, holds credits
```

If you cannot answer all 4 in 2 sentences, the feature scope is unclear. Stop and clarify with the user.

---

## Step 2 — Identify layers touched

Use this decision matrix to know which files you will create or modify:

| What the feature needs | Layers touched | Files |
|----------------------|----------------|-------|
| New HTTP endpoint only | Router | `routers/<domain>.py` |
| Endpoint + business logic | Router + Service | + `services/<domain>/` |
| Logic + database | Router + Service + Repo | + `repositories/protocols.py`, `repositories/sqlalchemy/<domain>.py` |
| Logic + external API | Router + Service + Provider | + `providers/<name>.py` |
| Logic + credits charge | All of the above + Credits | + `services/credits/user.py` (read-only — single writer!) |

**Write the list:** "This feature touches: Router, Service, Repo."

Do not touch more layers than listed. If you discover you need more, stop and re-plan.

---

## Step 3 — Define the test scenario

Write the test scenario before code. Two scenarios minimum:

```python
# Scenario 1: happy path
# Given: user has 10.00 credits, valid prompt
# When:  POST /generate/image with correct payload
# Then:  202 response, task_id returned, credits held

# Scenario 2: edge case
# Given: user has 0.00 credits
# When:  POST /generate/image
# Then:  402 response, no task created, no credits touched
```

These become your actual pytest tests in `tests/unit/` or `tests/integration/`.

---

## Step 4 — Build bottom-up

Always build in this order. Never start from the router.

```
1. Repository (if new data access needed)
   └── Add method to CreditsRepoProtocol
   └── Implement in SQLAlchemyCreditsRepo
   └── Implement in FakeCreditsRepo (tests/conftest.py)

2. Service
   └── Accepts repo via Protocol (never imports SQLAlchemy)
   └── Contains all business logic
   └── Raises domain exceptions (ValueError, not HTTPException)

3. Router
   └── Thin: validate schema → call service → return response
   └── Maps domain exceptions to HTTP codes
   └── No logic beyond 10 lines per endpoint handler

4. Schema
   └── Request and response Pydantic models
   └── Goes in schemas/<domain>.py, never inside routers/
```

Code template for a new router endpoint:

```python
@router.post("/<resource>", response_model=ResourceResponse, status_code=202)
async def create_resource(
    body: ResourceRequest,
    user_id: str = Depends(get_current_user_id),
    service: ResourceService = Depends(get_resource_service),
) -> ResourceResponse:
    try:
        result = await service.create(user_id=user_id, **body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ResourceResponse.model_validate(result)
```

---

## Step 5 — Verify principles before committing

Run through this checklist before calling the feature done:

```bash
# Architecture lint — must exit 0
bash scripts/lint-architecture.sh

# No SQLAlchemy in service layer
grep -rn "AsyncSession\|from sqlalchemy" app/services/<new-service>/

# Auth on every new endpoint
grep -n "get_current_user_id" app/routers/<new-router>.py

# user_id scoping in every new query
grep -n "user_id" app/repositories/sqlalchemy/<new-repo>.py
```

| Principle | Check |
|-----------|-------|
| A1 — folder if 3+ endpoints in domain | `ls app/routers/<domain>/` |
| A7 — file under 400 LOC | `wc -l app/services/<file>.py` |
| B1 — no SQLAlchemy in service | grep above |
| B2 — service via Protocol, not concrete | constructor accepts `Protocol` type |
| B10 — credits only via CreditsUserService | no direct `repo.hold()` calls |

---

## Verification

The skill was applied correctly when:
- [ ] API contract written before code
- [ ] Layers listed and respected during implementation
- [ ] Test scenarios written, tests are green
- [ ] Built bottom-up (repo → service → router)
- [ ] `bash scripts/lint-architecture.sh` exits 0
- [ ] No new file exceeds 200 LOC (it's a new file — keep it small)
