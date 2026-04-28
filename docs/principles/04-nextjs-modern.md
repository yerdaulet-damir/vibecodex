# Part D — Next.js Modern Patterns (6 principles, 2024-2025)

Part C covers timeless decomposition. Part D covers **what changed in 2024-2025** — patterns that didn't exist (or weren't stable) when most existing Next.js templates were written. If your template still teaches NextAuth v3 and `revalidatePath()`, it's teaching deprecated practice.

These six principles are what separate a 2025 production codebase from a tutorial-grade one. The first one — **D1: typed cache-tag DSL** — is the single biggest leverage point and the thing no other template in our research had.

---

## D1 — Cache tags as domain events (the typed cache-tag DSL)

**Problem:** Most codebases scatter `revalidateTag('user-profile-123')` and `revalidatePath('/dashboard')` calls throughout Server Actions. Magic strings, no compile-time safety, no semantic grouping. One typo = silent cache miss in production.

**Rule:** Cache tags are **first-class domain events**. Define them once in `lib/cache/tags.ts`. Every `revalidateTag()` call goes through the typed helper.

```typescript
// lib/cache/tags.ts — single source of truth for cache invalidation
export const tags = {
  user: (id: string) => `user:${id}` as const,
  userList: () => 'user:list' as const,
  userOrders: (userId: string) => `user:${userId}:orders` as const,
  product: (id: string) => `product:${id}` as const,
  productList: () => 'product:list' as const,
  cart: (userId: string) => `cart:${userId}` as const,
} as const;

export type Tag = ReturnType<(typeof tags)[keyof typeof tags]>;
```

Use it in fetches and Server Actions:

```typescript
// Reading — tag the fetch so it can be invalidated by name
import { tags } from '@/lib/cache/tags';

export async function getUser(id: string) {
  const res = await fetch(`${API}/users/${id}`, {
    next: { tags: [tags.user(id)] },
  });
  return res.json();
}

// Writing — invalidate ALL related tags atomically
import { revalidateTag } from 'next/cache';

export async function updateUser(id: string, input: UpdateUserInput) {
  await db.update(users).set(input).where(eq(users.id, id));
  revalidateTag(tags.user(id));        // this user's profile
  revalidateTag(tags.userList());      // any list view
  // typo would be a compile error: revalidateTag(tags.usre(id));  ❌
}
```

**Why this is the killer pattern:**
- **Domain events become explicit** — "what does mutating a user invalidate?" is one place
- **Compile-time safety** — typos and outdated tag names break the build
- **Refactor-friendly** — rename `tags.user` and TypeScript finds every call site
- **Reviewer-friendly** — a Server Action's invalidation surface is obvious from the imports

**No other Next.js template in 2025 ships this.** It's the differentiator.

---

## D2 — `use()` hook for client async (instead of `useEffect`)

**Problem:** Pre-React-19 client components couldn't consume async data without `useEffect` + `useState` + loading flags + race conditions.

**Rule:** Client components that need async data unwrap a **Promise from a Server Component** with React 19's `use()` hook. No effects, no flags, native Suspense integration.

```tsx
// Server Component — starts the fetch but doesn't await it
import { Suspense } from 'react';
import { ProfileCard } from '@/features/profile/components/ProfileCard';

export default function Page({ userId }: { userId: string }) {
  const userPromise = getUser(userId);  // ← Promise, not awaited

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileCard userPromise={userPromise} />
    </Suspense>
  );
}
```

```tsx
// Client Component — unwraps with use()
'use client';
import { use } from 'react';
import type { User } from '@/features/profile/schema';

export function ProfileCard({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);  // ← suspends until resolved
  return <div>{user.name}</div>;
}
```

**Why:**
- **Zero useEffect** for data unwrapping
- **No loading flags** — Suspense handles it
- **No race conditions** — React tracks the Promise identity
- **Streaming-ready** — works seamlessly with Suspense boundaries

This is the default pattern for **client components that need server data after a user interaction**.

---

## D3 — Streaming Suspense — explicit data-dependency model

**Problem:** Sequential `await` calls in a Server Component create waterfalls — each request waits for the previous one. TTI suffers.

**Rule:** Model data fetches by their **actual dependency graph**:
- **Independent fetches** → run in parallel (don't await sequentially)
- **Dependent fetches** → use Suspense boundaries to stream what's ready

```tsx
// BAD — waterfall: profile waits for user, posts wait for profile
export default async function Page({ id }: { id: string }) {
  const user = await getUser(id);
  const profile = await getProfile(user.profileId);  // waits for user
  const posts = await getPosts(user.id);             // waits again
  return <Page user={user} profile={profile} posts={posts} />;
}

// GOOD — independent fetches in parallel via Promise.all
export default async function Page({ id }: { id: string }) {
  const [user, posts, recommendations] = await Promise.all([
    getUser(id),
    getPosts(id),
    getRecommendations(id),
  ]);
  return <Page user={user} posts={posts} recs={recommendations} />;
}

// BETTER — stream each section independently with Suspense
export default function Page({ id }: { id: string }) {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <UserHeader userPromise={getUser(id)} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <PostList postsPromise={getPosts(id)} />
      </Suspense>
      <Suspense fallback={<RecsSkeleton />}>
        <Recommendations recsPromise={getRecommendations(id)} />
      </Suspense>
    </>
  );
}
```

**Heuristic:** if a section's data takes >300ms and it's independent, give it its own Suspense boundary.

---

## D4 — Partial Prerendering (PPR)

**Problem:** Choosing between fully static (`force-static`) or fully dynamic (`force-dynamic`) is binary and wasteful. Most pages have a static shell (nav, layout) and one or two dynamic islands (user-specific data).

**Rule:** Use **Partial Prerendering** to serve the static shell instantly while streaming dynamic blocks.

```typescript
// next.config.ts
export default {
  experimental: { ppr: 'incremental' },  // gradual adoption
};
```

```tsx
// app/dashboard/page.tsx
export const experimental_ppr = true;

import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      {/* Static shell — prerendered at build time, served from edge */}
      <DashboardNav />
      <DashboardSidebar />

      {/* Dynamic island — streams per request */}
      <Suspense fallback={<UserStatsSkeleton />}>
        <UserStats />
      </Suspense>
    </>
  );
}
```

**Result:** initial HTML <100ms (static shell from CDN) + streaming dynamic content. No more "fast or fresh" trade-off.

**When to enable:** any page where >70% of the layout is static and a few sections need request-time data.

---

## D5 — Better Auth + RSC session (Lucia is dead, NextAuth is fine but legacy)

**Status check (April 2026):**
- **Lucia Auth** — deprecated March 2025
- **NextAuth v5 (Auth.js)** — works but legacy patterns
- **Better Auth** — consensus choice for new projects

**Rule:** Read the session in **Server Components**, not in middleware. Pass it down via props or a server-only context. Middleware is for redirects only.

```typescript
// lib/auth/session.ts
import 'server-only';
import { auth } from '@/lib/auth/config';
import { headers } from 'next/headers';
import { cache } from 'react';

// React.cache dedupes within a single request
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
```

```tsx
// app/dashboard/layout.tsx — session fetched once, used by all children
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  return <>{children}</>;
}
```

```tsx
// app/dashboard/page.tsx — same getSession() call, deduped by cache()
import { getSession } from '@/lib/auth/session';

export default async function Page() {
  const session = await getSession();  // no extra DB call
  return <h1>Hello, {session.user.name}</h1>;
}
```

**Why:**
- **No token in JS bundle** — session lives server-side
- **Type-safe** — `session.user` is typed end-to-end
- **One source of truth** — `getSession()` is the only auth read

Middleware is reserved for **redirects** (`/login` for unauthed users) — never for session-data reads.

---

## D6 — Drizzle ORM (smaller, faster, types from schema)

**Rule:** For new TypeScript projects, prefer **Drizzle** over Prisma.

| | Prisma | Drizzle |
|---|--------|---------|
| Bundle size | ~5 MB engine binary | ~50 KB |
| Cold start (Edge) | ~800ms | <100ms |
| Type generation | Run `prisma generate` | Types **inferred** from schema |
| Schema language | `.prisma` DSL | TypeScript |
| Migrations | Built-in | drizzle-kit |
| Raw SQL escape | Limited | First-class |

```typescript
// lib/db/schema.ts — TypeScript IS the schema
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types are inferred — no codegen step
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

```typescript
// lib/db/repositories/users.ts — repository pattern (parallel to FastAPI Principle B1)
import { db } from '@/lib/db/client';
import { users, type User } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const usersRepo = {
  async byId(id: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  },
  async create(input: NewUser): Promise<User> {
    const [row] = await db.insert(users).values(input).returning();
    return row;
  },
};
```

**Hexagonal in TypeScript:** export an interface (`UsersRepoProtocol`) from a `protocols.ts` file and have your services accept it. Inject `usersRepo` (Drizzle) at the edge — services never import `drizzle-orm`. Same pattern as FastAPI Principle B1.

**When NOT to use Drizzle:** if your team already runs Prisma in production at scale and migration cost is high. Don't migrate just for hype.

---

## Bonus — Valibot for client-side validation (companion to Zod)

**Rule:** Zod stays the **server-side schema source of truth** (Principle C8). For **client / Edge / form validation**, prefer **Valibot** — it's ~1.3 KB vs Zod's ~17 KB and has comparable ergonomics.

```typescript
// Server (Zod) — schema is source of truth
import { z } from 'zod';
export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// Client (Valibot) — same shape, smaller bundle
import * as v from 'valibot';
export const ClientUpdateUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  email: v.pipe(v.string(), v.email()),
});
```

For most projects, sticking to Zod everywhere is also fine. Valibot is the optimization, not the requirement.

---

## Verification — modern principles checklist

```bash
# D1: cache tags imported, no magic strings
grep -rn "revalidateTag(['\"]" src/  # should find zero hits — all should use tags.X()

# D2: use() hook adopted (where applicable)
grep -rn "useEffect.*fetch\|useEffect.*setState" src/features/  # should be near-zero

# D3: parallel fetches
grep -c "await Promise.all" src/  # at least one occurrence in any list page

# D4: PPR enabled
grep -n "experimental_ppr" src/app/

# D5: session via getSession(), not direct cookie reads
grep -rn "cookies().get\|headers().get" src/app/ src/features/  # only in lib/auth/

# D6: no SQLAlchemy / no Prisma if you chose Drizzle
grep -rn "from '@prisma" src/  # zero if you went Drizzle
```

These plug into the architecture lint script alongside Part C checks.

---

**Summary of all 18 Next.js / TypeScript principles:**

| Part | # | Principle |
|------|---|-----------|
| **C** | C1 | Feature-driven colocation |
| | C2 | `app/` is orchestrator only |
| | C3 | 200/400 LOC caps |
| | C4 | RSC by default, `'use client'` at leaves |
| | C5 | Server Actions + errors-as-values |
| | C6 | Colocation — code lives with its only caller |
| | C7 | Zustand per domain, server is stateless |
| | C8 | Strict TS, schemas as source of truth |
| | C9 | `useEffect` is a last resort |
| | C10 | Tailwind + Shadcn, no inline styles |
| **D** | D1 | **Cache tags as typed domain events** ← differentiator |
| | D2 | `use()` for client async |
| | D3 | Streaming Suspense — explicit dependency graph |
| | D4 | Partial Prerendering for hybrid routes |
| | D5 | Better Auth + RSC session |
| | D6 | Drizzle ORM + repository protocol |

Combined with **Part A (8 FastAPI decomposition) + Part B (10 FastAPI integration)** = **36 vibecodex principles** spanning a full AI-powered SaaS stack.
