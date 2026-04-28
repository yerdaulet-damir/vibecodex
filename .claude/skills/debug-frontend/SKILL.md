---
name: debug-frontend
description: Systematic 5-step debugging flow for Next.js 15 + React 19 + TypeScript apps. Load when a UI bug is reported, hydration error appears, Server Action returns wrong data, or cache invalidation fails. Forces layer isolation (server vs client, action vs component, cache vs render) before touching code — prevents "fix here, break there" cascades.
---

# debug-frontend

Stop. Do not edit any file yet. Work through these 5 steps in order.

---

## Step 1 — Locate the layer

Next.js bugs almost always live in one of 5 layers. Identify which one before touching code.

| Symptom | Likely layer | First grep |
|---------|------------|-----------|
| 500 / runtime error in browser | Client component | `grep -rn "'use client'" src/features/<domain>/components/` |
| Hydration mismatch | Server vs client divergence | `grep -rn "Date()\|Math.random\|window\." src/features/<domain>/` |
| Wrong data after mutation | Cache invalidation | `grep -rn "revalidateTag\|revalidatePath" src/features/<domain>/actions.ts` |
| Server Action returns `{ error: ... }` unexpectedly | Validation or repo | `grep -n "safeParse\|throw" src/features/<domain>/actions.ts` |
| Type error / weird `undefined` | Schema / types | `grep -rn "z\.infer\|as any\|@ts-ignore" src/features/<domain>/` |
| Slow page / waterfall | Data fetch shape | `grep -n "await " src/app/<route>/page.tsx` (count sequential awaits) |

Pick **one** layer. Do not touch any other layer in this debug pass.

---

## Step 2 — Check the 5 most common Next.js antipatterns

These cause the majority of vibe-coded bugs. Grep for each:

```bash
# Antipattern 1: 'use client' on a page or layout (forces 100% client tree)
grep -rn "'use client'" src/app/ | grep -E "(page|layout)\.tsx"

# Antipattern 2: useEffect for data fetching (race conditions, no Suspense)
grep -rn "useEffect.*fetch\|useEffect.*async" src/features/

# Antipattern 3: revalidateTag with magic string (typo = silent miss)
grep -rn "revalidateTag(['\"]" src/  # should find nothing — all should use tags.X()

# Antipattern 4: throw for business errors (breaks errors-as-values)
grep -rn "throw new Error" src/features/*/actions.ts

# Antipattern 5: drizzle-orm leaked outside repository.ts
grep -rn "from 'drizzle-orm" src/features/*/components/ src/features/*/actions.ts
```

| Result | Root cause | Principle |
|--------|-----------|-----------|
| `'use client'` on page/layout | Whole tree client-rendered, no RSC benefits | C4 |
| `useEffect` + `fetch` | Race conditions, waterfall, hydration mismatch | C9 / D2 |
| Magic-string `revalidateTag` | Cache miss in production due to typo | D1 |
| `throw` in Server Action | Client gets generic error, can't show field hint | C5 |
| `drizzle-orm` in component | Hexagonal boundary broken | B1 / D6 |

---

## Step 3 — Reproduce the bug deterministically

Before changing code, prove you can trigger it on demand.

**For a UI bug:** narrow the user flow:
```
1. Visit /users
2. Click "Edit" on user 'alice@x.com'
3. Submit form with empty name
4. EXPECTED: error shown next to Name field
5. ACTUAL: page reloads with stale data
```

**For a Server Action bug:** call the action in isolation:
```typescript
// scratch test
const result = await createUser({ email: '', name: '' });
console.log(result);  // expected: { success: false, error: 'Invalid input' }
```

**For a cache invalidation bug:** check both sides:
```bash
# 1. Is the read tagged?
grep -A2 "fetch.*users" src/features/users/  # look for next: { tags: [...] }

# 2. Is the write invalidating the same tag?
grep -A3 "revalidateTag" src/features/users/actions.ts
```

If the read uses `tags.user(id)` but the write only invalidates `tags.userList()` — there's your bug.

---

## Step 4 — Fix in the correct layer

Minimum change. Do not refactor unrelated code.

| Layer | Where to fix |
|-------|------------|
| Server Component bug | `src/features/<domain>/components/<Feature>Page.tsx` |
| Client Component bug | `src/features/<domain>/components/<Leaf>.tsx` |
| Mutation bug | `src/features/<domain>/actions.ts` |
| Validation bug | `src/features/<domain>/schema.ts` |
| Data access bug | `src/features/<domain>/repository.ts` |
| Cache miss | `src/lib/cache/tags.ts` + relevant action |

**Hydration mismatches** specifically: add `suppressHydrationWarning` only as a last resort — first try moving the non-deterministic code (Date, random, window) to a client `useEffect` for initial render or to a server-only computation.

---

## Step 5 — Verify

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Run the failing scenario again — must succeed now
pnpm dev
# (manually walk through the reproduction steps from Step 3)
```

Then run the antipattern greps from Step 2 again. You must not have introduced any new violation while fixing.

---

## Common error → root cause table

| Error / Symptom | Where to look first | Likely cause |
|----------------|-------------------|--------------|
| `Hydration failed because the initial UI does not match` | Client component | `Date()` or `Math.random()` in render |
| `useActionState is undefined` | Imports | Missing `'use client'` directive |
| Form submits but data doesn't refresh | Server Action | Missing `revalidateTag` or wrong tag |
| `Cannot read properties of undefined (reading 'X')` after fetch | Schema | API response doesn't match Zod schema; `safeParse` returned error and was ignored |
| 500 on Server Action | actions.ts | `throw` for a business error instead of returning `{ success: false }` |
| Page is slow but data loads fast in isolation | Page structure | Sequential `await`s creating waterfall (Principle D3) |
| Shows stale data after `router.refresh()` | Cache | Tag mismatch between fetch and invalidate |
| `dynamic = 'force-dynamic' but PPR enabled` warning | next.config | Either remove force-dynamic or remove PPR for that route |
| Bundle size grew | Component tree | `'use client'` on a page pulled the whole tree client-side |

---

## Verification

The skill was applied correctly when:
- [ ] A reproducible scenario exists (Step 3)
- [ ] Fix touches exactly one layer
- [ ] All 5 antipattern greps still come up clean
- [ ] `pnpm typecheck && pnpm lint` exits 0
- [ ] The reproduction scenario now passes
