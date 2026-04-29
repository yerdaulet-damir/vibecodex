export type Stack = 'python' | 'typescript' | 'go'

export interface Principle {
  id: string
  name: string
  stack: Stack
  summary: string
  href: string
}

export const principles: Principle[] = [
  // FastAPI — Decomposition (A)
  { id: 'A1', name: 'File Size Limits', stack: 'python', summary: '0–399 green · 400–599 yellow · 600+ block', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A2', name: 'Static Data Separation', stack: 'python', summary: 'Pricing, catalogs, configs → app/data/', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A3', name: 'Folder-per-Domain', stack: 'python', summary: 'routers/generate/ with __init__.py re-exports', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A4', name: 'Provider Decomposition', stack: 'python', summary: 'falai/ → image.py + video.py + _client.py', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A5', name: 'Service Decomposition', stack: 'python', summary: 'wallet/ → user.py + admin.py + _writer.py', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A6', name: 'Worker Handler Split', stack: 'python', summary: 'task_handlers/ separate from routers/', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A7', name: 'Internal File Prefix', stack: 'python', summary: '_client.py, _writer.py never imported across packages', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A8', name: 'Lazy DB Init', stack: 'python', summary: '@lru_cache engine — never at module top', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },

  // FastAPI — Integration (B)
  { id: 'B1', name: 'Anti-Corruption Layer', stack: 'python', summary: 'Providers return GenerateResult | ProviderError, never dict', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B2', name: 'Bulkhead Isolation', stack: 'python', summary: 'One httpx.AsyncClient per provider with explicit Limits', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B3', name: 'Idempotency Keys', stack: 'python', summary: 'Every side-effect accepts UUID idempotency_key', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B4', name: 'Structured Logging', stack: 'python', summary: 'contextvars thread user_id + provider through async stack', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B5', name: 'Feature Flag Adapters', stack: 'python', summary: 'WALLET_REPO_BACKEND=supabase → zero-code rollback', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B6', name: 'Contract Tests', stack: 'python', summary: 'tests/contracts/test_falai_image.py with JSON fixture', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B7', name: 'Typed Error Hierarchy', stack: 'python', summary: 'ProviderTimeout(retryable=True), ProviderQuotaExceeded', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B8', name: 'Retry with Backoff', stack: 'python', summary: 'retryable=True → exponential backoff, quota → fail fast', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B9', name: 'Protocol-based DI', stack: 'python', summary: 'Services accept WalletRepoProtocol, not SQLAlchemy Session', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B10', name: 'Single-Writer Pattern', stack: 'python', summary: 'repo.hold() callable only from services/credits/user.py', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },

  // Next.js — Decomposition (C)
  { id: 'C1', name: 'Repo Protocol Interface', stack: 'typescript', summary: 'UsersRepoProtocol as hexagonal boundary in TypeScript', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C2', name: 'Feature Folder Structure', stack: 'typescript', summary: 'features/users/ → actions, components, protocols, repo', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C3', name: 'Co-locate by Feature', stack: 'typescript', summary: 'Co-locate by feature, not by layer type', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C4', name: 'Thin Page Components', stack: 'typescript', summary: 'Pages orchestrate, never contain business logic', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C5', name: 'Schema Validation Layer', stack: 'typescript', summary: 'Zod schemas at the Server Action boundary', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C6', name: 'Error Boundary Pattern', stack: 'typescript', summary: 'errors-as-values: { success, error } never throw', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C7', name: 'Static Data Extraction', stack: 'typescript', summary: 'lib/constants.ts not inlined in components', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C8', name: 'Hook Decomposition', stack: 'typescript', summary: 'useUsers() max 80 LOC, one concern per hook', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C9', name: 'Action Isolation', stack: 'typescript', summary: 'One Server Action per operation, no action bundles', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C10', name: 'DB Client Singleton', stack: 'typescript', summary: 'lib/db/client.ts — one Drizzle instance, lazy', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },

  // Next.js — Modern (D)
  { id: 'D1', name: 'Typed Cache-Tag DSL', stack: 'typescript', summary: 'revalidateTag(tags.user(id)) — typo = compile error', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D2', name: 'RSC Leaf use() Pattern', stack: 'typescript', summary: 'Page passes Promise, use() reads it in leaf client', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D3', name: 'Server Actions + Zod', stack: 'typescript', summary: 'parse input, return { success } | { error }, never throw', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D4', name: 'Parallel Data Fetching', stack: 'typescript', summary: 'Promise.all([getUser(), getPosts()]) not sequential await', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D5', name: 'Session cache()', stack: 'typescript', summary: 'getSession = cache(async () => ...) deduplicates per req', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D6', name: 'Partial Prerendering', stack: 'typescript', summary: 'experimental_ppr = true on dynamic routes', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },

  // Go — Decomposition (E)
  { id: 'E1', name: 'Package by Domain', stack: 'go', summary: 'internal/credits/ not internal/models/ or internal/db/', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E2', name: 'Thin main() Function', stack: 'go', summary: 'main() calls run(), run() returns error — testable', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E3', name: 'Interface Next to Consumer', stack: 'go', summary: 'credits/service.go defines Repository interface it needs', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E4', name: 'Sentinel Errors', stack: 'go', summary: 'var ErrInsufficientFunds = errors.New(...) at package level', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E5', name: 'Table-Driven Tests', stack: 'go', summary: 'tests := []struct{ name, input, want }{ ... } t.Run()', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E6', name: 'Constructor Injection', stack: 'go', summary: 'func New(repo Repository, log *slog.Logger) *Service', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E7', name: 'Internal Package Boundary', stack: 'go', summary: 'internal/ cannot be imported by external modules', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E8', name: 'run() Entry Pattern', stack: 'go', summary: 'Mat Ryer pattern: run() *Server, main() logs fatal', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },

  // Go — Integration (F)
  { id: 'F1', name: 'Tiny Consumer Interface', stack: 'go', summary: 'handlers.go defines chargeService with 1 method only', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F2', name: 'errgroup Concurrency', stack: 'go', summary: 'errgroup.WithContext for concurrent ops with propagation', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F3', name: 'ACL Typed Results', stack: 'go', summary: 'FalAI returns JobResult or ProviderError, never map[string]any', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F4', name: 'Per-Provider HTTP Client', stack: 'go', summary: 'httpclient.New(MaxConnsPerHost=50) per provider', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F5', name: 'Idempotency Store', stack: 'go', summary: 'Redis-backed idempotency key check before side-effects', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F6', name: 'Context Value Helpers', stack: 'go', summary: 'appctx.WithUserID(ctx, id) — type-safe, no bare string keys', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F7', name: 'Graceful Shutdown', stack: 'go', summary: 'signal.NotifyContext + srv.Shutdown(30s timeout)', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F8', name: 'Structured slog', stack: 'go', summary: 'slog.With(userID, reqID) — JSON in prod, text in dev', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F9', name: 'Feature Flag Interface', stack: 'go', summary: 'type Flags interface { IsEnabled(string) bool }', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F10', name: 'Contract Test Fixture', stack: 'go', summary: 'testdata/falai_response.json pinned, parsed in test', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
]

export const stackColors: Record<Stack, string> = {
  python: '#3776ab',
  typescript: '#3178c6',
  go: '#00add8',
}

export const stackLabels: Record<Stack, string> = {
  python: 'Python',
  typescript: 'TypeScript',
  go: 'Go',
}
