# vibecodex / examples / nextjs

Reference Next.js 15 + React 19 + TypeScript app demonstrating all 18 vibecodex principles for the frontend stack ([Part C](../../docs/principles/03-nextjs-decomposition.md) + [Part D](../../docs/principles/04-nextjs-modern.md)).

This is a **deliberately small** example — its job is to show the patterns clearly, not to be a feature-complete starter.

## What's demonstrated

| Principle | File |
|-----------|------|
| C1 — Feature-driven colocation | `src/features/users/` |
| C2 — Thin `app/` orchestrator | `src/app/users/page.tsx` (< 15 lines) |
| C4 — RSC by default, client at leaves | `UsersPage` (server) → `UserList` (client) |
| C5 — Server Actions + errors as values | `src/features/users/actions.ts` |
| C8 — Zod schemas as source of truth | `src/features/users/schema.ts` |
| **D1 — Typed cache-tag DSL** ⭐ | `src/lib/cache/tags.ts` + uses in `actions.ts` |
| D2 — `use()` hook for client async | `src/features/users/components/UserList.tsx` |
| D3 — Streaming Suspense | `UsersPage` wraps `UserList` in `<Suspense>` |
| D4 — Partial Prerendering | `export const experimental_ppr = true` in `page.tsx` |
| D5 — RSC session via `cache()` | `src/lib/auth/session.ts` |
| D6 — Drizzle ORM + repository protocol | `src/features/users/{protocols,repository}.ts` |

## File map

```
src/
├── app/users/page.tsx              # thin orchestrator (C2)
├── features/users/
│   ├── components/
│   │   ├── UsersPage.tsx           # server component (C2, C4)
│   │   ├── UserList.tsx            # client leaf, use() hook (D2)
│   │   └── UserListSkeleton.tsx    # Suspense fallback
│   ├── actions.ts                  # Server Actions + cache tags (C5, D1)
│   ├── repository.ts               # Drizzle adapter (D6)
│   ├── protocols.ts                # UsersRepoProtocol (B1 hexagonal)
│   └── schema.ts                   # Zod schemas (C8)
└── lib/
    ├── cache/tags.ts               # ⭐ typed cache-tag DSL (D1)
    ├── db/{client,schema}.ts       # Drizzle setup (D6)
    ├── auth/session.ts             # cached session reader (D5)
    └── utils.ts                    # cn() helper (C10)
```

## The killer pattern: `lib/cache/tags.ts`

Every other Next.js template scatters `revalidateTag('user-profile-123')` magic strings throughout Server Actions. We don't. **Every cache invalidation goes through one typed function.** Renaming a tag is a refactor. Typos are compile errors.

```typescript
// Read
fetch(url, { next: { tags: [tags.user(id)] } });

// Write
revalidateTag(tags.user(id));
revalidateTag(tags.userList());
```

This is the differentiator. Adopt it on day one of any new Next.js project.

## Running

This example is a reference, not a runnable starter. To make it run, you would:

```bash
pnpm install
# Set DATABASE_URL in .env
pnpm db:generate && pnpm db:migrate
pnpm dev
```

Real apps will add: Better Auth config, Tailwind setup, Shadcn components, ESLint config, environment validation.
