# Part C — Next.js + TypeScript Decomposition (10 principles)

Production patterns for vibe-coded Next.js 15 + React 19 + TypeScript apps. Same intent as Part A (FastAPI decomposition): keep the codebase debuggable after 6 months of LLM-driven changes. These rules act as guardrails for Cursor / Copilot / Claude / Cline so the AI partner doesn't ship 1500-line `page.tsx` files or scatter business logic across `src/lib/`, `src/components/`, `src/hooks/`.

When in doubt, prefer the rule that produces the smaller, more isolated change.

---

## C1 — Feature-driven colocation, not technical layers

**Problem:** A flat `src/components/` folder where `Button.tsx` lives next to `PaymentScreen.tsx`, and `hooks/`, `utils/`, `types/` swell in parallel. After 30 features it's impossible to delete a feature cleanly because its files are everywhere.

**Rule:** Group files **by business domain**, not by technical kind. Industry term: **Feature-Driven** (FSD-lite).

```text
# BEFORE (technical layers — bad)
src/
├── components/     # 80 mixed files
├── hooks/          # 40 hooks, half unused
├── utils/          # garbage drawer
└── types/          # all types in one place

# AFTER (feature-driven — good)
src/
├── app/                       # routing only
├── components/ui/             # dumb visuals (Button, Input — Shadcn)
├── features/
│   ├── video-player/
│   │   ├── components/        # PlayerScreen.tsx, Controls.tsx
│   │   ├── actions.ts         # Server Actions
│   │   ├── store.ts           # Zustand
│   │   └── schema.ts          # Zod schemas + types
│   └── auth/
└── lib/                       # truly global utilities only
```

**Why:** When the user says *"fix the player"*, the LLM looks at exactly one folder — not nine. Deleting a feature means deleting one folder.

For smaller projects, "smart components folder" is fine: `src/components/player/{PlayerScreen.tsx, usePlayer.ts, actions.ts}`. Pick one and stay consistent.

---

## C2 — `app/` is an orchestrator, never a kitchen

**Rule:** Files in `app/` (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`) stay **thin**.

**Allowed in `app/`:**
- Server-side data fetching for the page
- Session/auth checks
- Passing data as props to feature components

**Forbidden in `app/`:**
- Business logic (calculations, state machines, validation)
- 500-line JSX trees
- Direct database calls beyond a single fetch

If a `page.tsx` exceeds **100 lines**, extract its content to `features/<feature>/components/<Feature>Page.tsx` and import that.

```typescript
// app/users/page.tsx — 8 lines, oriented
import { UsersPage } from '@/features/users/components/UsersPage';
import { listUsers } from '@/features/users/actions';

export default async function Page() {
  const users = await listUsers();
  return <UsersPage users={users} />;
}
```

---

## C3 — God-component limits (200 soft / 400 hard)

**Problem:** LLMs love writing 1500-line components. They lose context — start breaking one piece of logic while fixing another, and hallucinate.

**Rule:**
- **Soft cap:** 200 lines per `.tsx` / `.ts` file
- **Hard cap:** 400 lines

**Heuristic:** if you can't describe what a component does in one sentence without using the word "and", it does too much.

**Splitting strategy** (parallel to FastAPI Principle A1): when you cross 200 lines, split by responsibility:

```text
PlayerScreen.tsx (450 LOC) →
PlayerScreen.tsx          (orchestrator, ~100 LOC)
├── PlayerControls.tsx    (transport buttons)
├── PlayerProgress.tsx    (progress bar, chapter list)
└── PlayerSettings.tsx    (modal, quality picker)
```

---

## C4 — Server Components by default, `'use client'` at the leaves

**Rule:** Everything is a **Server Component (RSC)** by default. The `'use client'` directive goes **as deep into the tree as possible** — on a button, a modal, a single form — never on a page or layout.

**Why:**
- Smaller JS bundle → faster TTI
- Server data fetching, no API roundtrips
- Server-only secrets stay server-only

```tsx
// BAD: 'use client' on the page makes 100% of children client-side
'use client';
export default function Page() { ... }

// GOOD: server page with one tiny client island
// app/profile/page.tsx (RSC)
import { EditButton } from '@/features/profile/components/EditButton'; // 'use client' inside
export default async function Page() {
  const user = await getUser();
  return <div>{user.name}<EditButton userId={user.id} /></div>;
}
```

---

## C5 — Server Actions over API Routes for mutations

**Rule:** Use Server Actions (`'use server'`) for data mutations. API Routes (`app/api/`) are reserved for **third-party webhooks** and **non-Next clients** only.

**The "errors as values" pattern** — never `throw` for expected business errors:

```typescript
// features/auth/actions.ts
'use server';

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function login(input: LoginInput): Promise<Result<User>> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  const user = await db.users.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { success: false, error: 'User not found' };

  return { success: true, data: user };
}
```

The client uses `useActionState` (React 19) — no `try/catch` for business errors:

```tsx
'use client';
import { useActionState } from 'react';
import { login } from '@/features/auth/actions';

export function LoginForm() {
  const [state, formAction] = useActionState(login, null);
  return <form action={formAction}>{state?.error && <p>{state.error}</p>}...</form>;
}
```

`throw` is reserved for truly unexpected errors (DB down, third-party 500) — those bubble up to `error.tsx` and Sentry.

---

## C6 — Colocation: code lives with the only place that uses it

**Rule:** A component, type, or utility used in **exactly one place** lives next to that place. Not in a global `src/lib/` or `src/components/` dump.

```text
# BAD
src/lib/format-price.ts          # used only by billing
src/components/PaymentRow.tsx     # used only by billing

# GOOD
src/features/billing/utils.ts
src/features/billing/components/PaymentRow.tsx
```

Promote to `src/lib/` or `src/components/ui/` **only when a second feature imports it**. Premature promotion creates global coupling.

---

## C7 — Zustand for client state, one store per domain

**Rule:** When you genuinely need **client-side global state**, use Zustand. Not Redux. Not Context for state (Context for DI/theme is fine).

- One store = one domain. `useAuthStore`, `useCartStore`, `usePlayerStore`.
- Each store lives in its feature folder: `features/cart/store.ts`.
- **Server Components never touch Zustand** — server is stateless.

```typescript
// features/cart/store.ts
import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));
```

Most "global state" you think you need is actually **server state** — fetch it on the server, pass props.

---

## C8 — Strict TypeScript: no `any`, no `@ts-ignore`, schemas are the source of truth

**Rule:**
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`
- Zero `any` in production code (use `unknown` + type guards)
- Zero `@ts-ignore` (use `@ts-expect-error <reason>` if absolutely necessary, with a comment)

**Validation pattern:** Zod (or Valibot, see Part D) is the **single source of truth** — schemas come first, TS types are derived:

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export type User = z.infer<typeof UserSchema>;   // ← derived, not duplicated
```

Use `safeParse` at every boundary — form input, third-party API response, Server Action input.

For LLM agents this is critical: **types are the rails**. With `any` everywhere, the agent hallucinates because it can't see the data shape.

---

## C9 — `useEffect` is a last resort

**Rule:** If you can solve the problem without `useEffect`, do.

| Need | Use this, not useEffect |
|------|------------------------|
| Fetch data | Server Component or `use()` hook (Part D) |
| Mutation on click | Server Action via `useActionState` |
| Derived value | Compute in render |
| Sync with localStorage | Custom hook with `useSyncExternalStore` |
| Animation on mount | CSS or Framer Motion |

`useEffect` is reserved for genuine **synchronization with non-React systems**: WebSockets, IntersectionObserver, third-party DOM libraries, Analytics.

```tsx
// BAD — derived state via useEffect (causes extra render + race conditions)
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${first} ${last}`); }, [first, last]);

// GOOD — compute in render
const fullName = `${first} ${last}`;
```

---

## C10 — Tailwind + Shadcn only, no inline styles

**Rule:**
- **No `style={{}}`** for spacing, colors, fonts, or any design-system value
- Tailwind utility classes only (`className="mt-5 text-text-primary"`)
- Use `cn()` (clsx + tailwind-merge) for conditional class composition
- UI primitives (Button, Input, Dialog) come from **Shadcn UI** — don't reinvent them

```tsx
// BAD
<div style={{ marginTop: 20, color: '#333' }}>...</div>

// GOOD
import { cn } from '@/lib/utils';
<div className={cn('mt-5 text-text-primary', isError && 'text-destructive')}>...</div>
```

**Why:** inline styles break dark mode, ignore the design system, and bloat the bundle. They're the most common LLM laziness pattern.

---

## Decomposition checklist (run before commit)

```bash
# File size — same as backend
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head

# No 'use client' on pages or layouts
grep -rn "'use client'" src/app/ | grep -E "(page|layout)\.tsx"

# No inline styles
grep -rn "style=\{\{" src/

# No any
grep -rn ": any\b\| as any\b" src/
```

These plug into the architecture lint script (Part D adds the modern checks).

---

**Next:** [Part D — Next.js modern patterns 2024-25](04-nextjs-modern.md) — cache tags, `use()`, PPR, Better Auth, Drizzle, Valibot.
