---
name: new-feature-nextjs
description: Pre-flight checklist for adding a new feature to a Next.js 15 + TypeScript app. Load when creating a new page, route, server action, or feature module. Forces feature-driven colocation, RSC-first thinking, and the typed cache-tag pattern from line one — prevents the most common AI failures (1500-line page.tsx, 'use client' on the layout, scattered revalidateTag magic strings).
---

# new-feature-nextjs

Do not open any file for editing until all 6 steps are completed.

---

## Step 1 — Define the feature surface

Write the surface in plain text before any code:

```
Feature name: users
Routes: /users (list), /users/[id] (detail)
Mutations: createUser, updateUser, deleteUser
Reads: getUser(id), listUsers()
Cache tags: user(id), userList(), userOrders(userId)
```

If you can't fill all 5 lines in 2 sentences each, the scope is unclear — clarify with the user first.

---

## Step 2 — Pick the folder location (Principle C1)

| Scope | Location |
|-------|----------|
| Reusable everywhere (Button, Input) | `src/components/ui/` |
| Belongs to one business domain | `src/features/<domain>/` |
| Pure helper used in 2+ features | `src/lib/<area>/` |
| Used in exactly one place | colocate next to that place (Principle C6) |

For a new feature, default to `src/features/<domain>/` with this structure:

```
src/features/<domain>/
├── components/         # JSX (server + client)
├── actions.ts          # Server Actions
├── repository.ts       # Drizzle adapter (only file importing drizzle-orm)
├── protocols.ts        # Repository protocol/interface
├── schema.ts           # Zod schemas
└── store.ts            # Zustand (only if genuinely needed)
```

---

## Step 3 — Add cache tags FIRST (Principle D1)

Before writing any Server Action, add the tags to `src/lib/cache/tags.ts`:

```typescript
// src/lib/cache/tags.ts
export const tags = {
  // ... existing tags
  user: (id: string) => `user:${id}` as const,
  userList: () => 'user:list' as const,
} as const;
```

**Rule: zero `revalidateTag('magic-string')` in the new feature.** Every invalidation goes through the typed DSL. Typos must be compile errors.

---

## Step 4 — Build bottom-up (parallel to FastAPI new-feature skill)

```
1. Schema (Zod)         → src/features/<domain>/schema.ts
2. Repository protocol  → src/features/<domain>/protocols.ts
3. Repository impl      → src/features/<domain>/repository.ts (Drizzle)
4. Server Actions       → src/features/<domain>/actions.ts (uses tags + repo via Protocol)
5. Components (server)  → src/features/<domain>/components/<Feature>Page.tsx
6. Components (client)  → src/features/<domain>/components/<Leaf>.tsx ('use client')
7. Route               → src/app/<route>/page.tsx (thin, < 20 lines)
```

**Critical rules during build:**
- `actions.ts` imports `usersRepo` typed as `UsersRepoProtocol` — never imports `drizzle-orm` directly
- Server Components fetch data and pass **Promises** down (Principle D3) — don't `await` and pass values unless you must
- `'use client'` goes on the **leaf** component that needs `useState` / `onClick` / `use()` — never on the page or layout (Principle C4)
- `app/<route>/page.tsx` stays under 20 lines and just imports `<Feature>Page` (Principle C2)

---

## Step 5 — Wire Suspense + PPR (Principles D3, D4)

Streaming setup in the page:

```tsx
// src/app/users/page.tsx
import { UsersPage } from '@/features/users/components/UsersPage';
import { usersRepo } from '@/features/users/repository';

export const experimental_ppr = true;  // D4

export default function Page() {
  const usersPromise = usersRepo.list(50);  // not awaited
  return <UsersPage usersPromise={usersPromise} />;  // streamed via Suspense
}
```

Server feature page wraps async children in `<Suspense>`:

```tsx
// src/features/users/components/UsersPage.tsx
import { Suspense } from 'react';
import { UserList } from './UserList';

export function UsersPage({ usersPromise }: Props) {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UserList usersPromise={usersPromise} />
    </Suspense>
  );
}
```

Client leaf unwraps with `use()`:

```tsx
'use client';
import { use } from 'react';

export function UserList({ usersPromise }: Props) {
  const users = use(usersPromise);
  return <ul>...</ul>;
}
```

---

## Step 6 — Verify principles before committing

Run these grep checks:

```bash
# C2: page is thin (< 20 lines)
wc -l src/app/<route>/page.tsx

# C3: file size cap
find src/features/<domain> -name "*.ts*" | xargs wc -l | sort -rn | head

# C4: no 'use client' on pages or layouts
grep -rn "'use client'" src/app/ | grep -E "(page|layout)\.tsx"

# C5: errors are values, not throws (in Server Actions)
grep -n "throw new" src/features/<domain>/actions.ts

# C8: no `any` and no @ts-ignore
grep -rn ": any\b\| as any\b\|@ts-ignore" src/features/<domain>/

# C10: no inline styles
grep -rn "style=\{\{" src/features/<domain>/

# D1: every revalidateTag goes through tags.X()
grep -n "revalidateTag(['\"]" src/features/<domain>/  # must be empty

# D6: drizzle-orm imported only from repository.ts
grep -rn "from 'drizzle-orm" src/features/<domain>/  # only repository.ts allowed
```

| Check | Expected result |
|-------|----------------|
| `page.tsx` line count | < 20 |
| Any file > 200 LOC | refactor before commit |
| `'use client'` on page/layout | zero hits |
| `throw new` in actions.ts | zero hits (return errors as values) |
| `any` / `@ts-ignore` | zero hits |
| `style={{}}` | zero hits |
| `revalidateTag('...')` magic string | zero hits |
| `drizzle-orm` outside repository.ts | zero hits |

```bash
pnpm typecheck
pnpm lint
```

Both must pass.

---

## Verification checklist

- [ ] Surface defined in writing before any code
- [ ] Folder location follows feature-driven colocation
- [ ] Cache tags added to `lib/cache/tags.ts` before Server Actions
- [ ] Build order followed: schema → protocol → repo → action → component → route
- [ ] Server fetch passes Promise down; client unwraps with `use()`
- [ ] PPR enabled if route has static + dynamic mix
- [ ] All 8 grep checks pass
- [ ] `pnpm typecheck && pnpm lint` exits 0
