#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// ─── Principles data ────────────────────────────────────────────────────────

type Stack = 'fastapi' | 'nextjs' | 'go'

interface Principle {
  id: string
  name: string
  stack: Stack
  summary: string
  category: string
  href: string
}

const PRINCIPLES: Principle[] = [
  // FastAPI — Decomposition (A)
  { id: 'A1', name: 'File Size Limits', stack: 'fastapi', category: 'Decomposition', summary: '0–399 LOC green · 400–599 yellow · 600+ block', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A2', name: 'Static Data Separation', stack: 'fastapi', category: 'Decomposition', summary: 'Pricing, catalogs, configs → app/data/', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A3', name: 'Folder-per-Domain', stack: 'fastapi', category: 'Decomposition', summary: 'routers/generate/ with __init__.py re-exports', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A4', name: 'Provider Decomposition', stack: 'fastapi', category: 'Decomposition', summary: 'falai/ → image.py + video.py + _client.py', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A5', name: 'Service Decomposition', stack: 'fastapi', category: 'Decomposition', summary: 'wallet/ → user.py + admin.py + _writer.py', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A6', name: 'Worker Handler Split', stack: 'fastapi', category: 'Decomposition', summary: 'task_handlers/ separate from routers/', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A7', name: 'Internal File Prefix', stack: 'fastapi', category: 'Decomposition', summary: '_client.py, _writer.py never imported across packages', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },
  { id: 'A8', name: 'Lazy DB Init', stack: 'fastapi', category: 'Decomposition', summary: '@lru_cache engine — never at module top', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/01-safe-decomposition.md' },

  // FastAPI — Integration (B)
  { id: 'B1', name: 'Anti-Corruption Layer', stack: 'fastapi', category: 'Integration', summary: 'Providers return GenerateResult | ProviderError, never dict', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B2', name: 'Bulkhead Isolation', stack: 'fastapi', category: 'Integration', summary: 'One httpx.AsyncClient per provider with explicit Limits', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B3', name: 'Idempotency Keys', stack: 'fastapi', category: 'Integration', summary: 'Every side-effect accepts UUID idempotency_key', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B4', name: 'Structured Logging', stack: 'fastapi', category: 'Integration', summary: 'contextvars thread user_id + provider through async stack', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B5', name: 'Feature Flag Adapters', stack: 'fastapi', category: 'Integration', summary: 'WALLET_REPO_BACKEND=supabase → zero-code rollback', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B6', name: 'Contract Tests', stack: 'fastapi', category: 'Integration', summary: 'tests/contracts/test_falai_image.py with JSON fixture', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B7', name: 'Typed Error Hierarchy', stack: 'fastapi', category: 'Integration', summary: 'ProviderTimeout(retryable=True), ProviderQuotaExceeded', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B8', name: 'Retry with Backoff', stack: 'fastapi', category: 'Integration', summary: 'retryable=True → exponential backoff, quota → fail fast', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B9', name: 'Protocol-based DI', stack: 'fastapi', category: 'Integration', summary: 'Services accept WalletRepoProtocol, not SQLAlchemy Session', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },
  { id: 'B10', name: 'Single-Writer Pattern', stack: 'fastapi', category: 'Integration', summary: 'repo.hold() callable only from services/credits/user.py', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/02-integration-patterns.md' },

  // Next.js — Decomposition (C)
  { id: 'C1', name: 'Repo Protocol Interface', stack: 'nextjs', category: 'Decomposition', summary: 'UsersRepoProtocol as hexagonal boundary in TypeScript', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C2', name: 'Feature Folder Structure', stack: 'nextjs', category: 'Decomposition', summary: 'features/users/ → actions, components, protocols, repo', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C3', name: 'Co-locate by Feature', stack: 'nextjs', category: 'Decomposition', summary: 'Co-locate by feature, not by layer type', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C4', name: 'Thin Page Components', stack: 'nextjs', category: 'Decomposition', summary: 'Pages orchestrate, never contain business logic', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C5', name: 'Schema Validation Layer', stack: 'nextjs', category: 'Decomposition', summary: 'Zod schemas at the Server Action boundary', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C6', name: 'Error Boundary Pattern', stack: 'nextjs', category: 'Decomposition', summary: 'errors-as-values: { success, error } never throw', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C7', name: 'Static Data Extraction', stack: 'nextjs', category: 'Decomposition', summary: 'lib/constants.ts not inlined in components', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C8', name: 'Hook Decomposition', stack: 'nextjs', category: 'Decomposition', summary: 'useUsers() max 80 LOC, one concern per hook', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C9', name: 'Action Isolation', stack: 'nextjs', category: 'Decomposition', summary: 'One Server Action per operation, no action bundles', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },
  { id: 'C10', name: 'DB Client Singleton', stack: 'nextjs', category: 'Decomposition', summary: 'lib/db/client.ts — one Drizzle instance, lazy', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/03-nextjs-decomposition.md' },

  // Next.js — Modern (D)
  { id: 'D1', name: 'Typed Cache-Tag DSL', stack: 'nextjs', category: 'Modern', summary: 'revalidateTag(tags.user(id)) — typo = compile error', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D2', name: 'RSC Leaf use() Pattern', stack: 'nextjs', category: 'Modern', summary: 'Page passes Promise, use() reads it in leaf client', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D3', name: 'Server Actions + Zod', stack: 'nextjs', category: 'Modern', summary: 'parse input, return { success } | { error }, never throw', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D4', name: 'Parallel Data Fetching', stack: 'nextjs', category: 'Modern', summary: 'Promise.all([getUser(), getPosts()]) not sequential await', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D5', name: 'Session cache()', stack: 'nextjs', category: 'Modern', summary: 'getSession = cache(async () => ...) deduplicates per req', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },
  { id: 'D6', name: 'Partial Prerendering', stack: 'nextjs', category: 'Modern', summary: 'experimental_ppr = true on dynamic routes', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/04-nextjs-modern.md' },

  // Go — Decomposition (E)
  { id: 'E1', name: 'Package by Domain', stack: 'go', category: 'Decomposition', summary: 'internal/credits/ not internal/models/ or internal/db/', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E2', name: 'Thin main() Function', stack: 'go', category: 'Decomposition', summary: 'main() calls run(), run() returns error — testable', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E3', name: 'Interface Next to Consumer', stack: 'go', category: 'Decomposition', summary: 'credits/service.go defines Repository interface it needs', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E4', name: 'Sentinel Errors', stack: 'go', category: 'Decomposition', summary: 'var ErrInsufficientFunds = errors.New(...) at package level', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E5', name: 'Table-Driven Tests', stack: 'go', category: 'Decomposition', summary: 'tests := []struct{ name, input, want }{ ... } t.Run()', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E6', name: 'Constructor Injection', stack: 'go', category: 'Decomposition', summary: 'func New(repo Repository, log *slog.Logger) *Service', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E7', name: 'Internal Package Boundary', stack: 'go', category: 'Decomposition', summary: 'internal/ cannot be imported by external modules', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },
  { id: 'E8', name: 'run() Entry Pattern', stack: 'go', category: 'Decomposition', summary: 'Mat Ryer pattern: run() *Server, main() logs fatal', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/05-go-decomposition.md' },

  // Go — Integration (F)
  { id: 'F1', name: 'Tiny Consumer Interface', stack: 'go', category: 'Integration', summary: 'handlers.go defines chargeService with 1 method only', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F2', name: 'errgroup Concurrency', stack: 'go', category: 'Integration', summary: 'errgroup.WithContext for concurrent ops with propagation', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F3', name: 'ACL Typed Results', stack: 'go', category: 'Integration', summary: 'FalAI returns JobResult or ProviderError, never map[string]any', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F4', name: 'Per-Provider HTTP Client', stack: 'go', category: 'Integration', summary: 'httpclient.New(MaxConnsPerHost=50) per provider', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F5', name: 'Idempotency Store', stack: 'go', category: 'Integration', summary: 'Redis-backed idempotency key check before side-effects', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F6', name: 'Context Value Helpers', stack: 'go', category: 'Integration', summary: 'appctx.WithUserID(ctx, id) — type-safe, no bare string keys', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F7', name: 'Graceful Shutdown', stack: 'go', category: 'Integration', summary: 'signal.NotifyContext + srv.Shutdown(30s timeout)', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F8', name: 'Structured slog', stack: 'go', category: 'Integration', summary: 'slog.With(userID, reqID) — JSON in prod, text in dev', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F9', name: 'Feature Flag Interface', stack: 'go', category: 'Integration', summary: 'type Flags interface { IsEnabled(string) bool }', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
  { id: 'F10', name: 'Contract Test Fixture', stack: 'go', category: 'Integration', summary: 'testdata/falai_response.json pinned, parsed in test', href: 'https://github.com/yerdaulet-damir/vibecodex/blob/main/docs/principles/06-go-integration.md' },
]

const SKILLS = [
  'debug-backend',
  'debug-frontend',
  'debug-go',
  'new-feature',
  'new-feature-nextjs',
  'new-feature-go',
  'add-provider',
  'split-monolith',
]

const SKILL_DESCRIPTIONS: Record<string, string> = {
  'debug-backend': 'Systematic FastAPI backend debugging — reproduce, isolate, trace, fix',
  'debug-frontend': 'Next.js frontend debugging — hydration, state, network, rendering',
  'debug-go': 'Go service debugging — goroutine leaks, race conditions, error traces',
  'new-feature': 'Add a FastAPI feature following Router → Service → Repository',
  'new-feature-nextjs': 'Add a Next.js 15 feature following feature-folder structure',
  'new-feature-go': 'Add a Go feature following domain-package structure',
  'add-provider': 'Integrate a new AI/external provider with ACL + typed errors',
  'split-monolith': 'Extract domain from monolith into bounded service module',
}

// ─── Anti-pattern checks (for check_violation) ───────────────────────────────

interface ViolationCheck {
  principleId: string
  name: string
  detect: (code: string) => boolean
  message: string
}

const VIOLATION_CHECKS: ViolationCheck[] = [
  {
    principleId: 'B1',
    name: 'Anti-Corruption Layer',
    detect: (code) => /return\s+\{/.test(code) && /httpx|aiohttp|requests/.test(code),
    message: 'Provider appears to return raw dict instead of typed result (GenerateResult | ProviderError)',
  },
  {
    principleId: 'B2',
    name: 'Bulkhead Isolation',
    detect: (code) => /httpx\.get\(|httpx\.post\(|requests\.get\(|requests\.post\(/.test(code),
    message: 'Using global httpx calls — each provider should have its own AsyncClient with Limits',
  },
  {
    principleId: 'B3',
    name: 'Idempotency Keys',
    detect: (code) => /async def (create|generate|process|submit|charge)/.test(code) && !/idempotency_key/.test(code),
    message: 'Side-effect function missing idempotency_key parameter',
  },
  {
    principleId: 'B4',
    name: 'Structured Logging',
    detect: (code) => /print\(/.test(code),
    message: 'Using print() — use logging.getLogger(__name__) with contextvars for user_id/provider',
  },
  {
    principleId: 'A8',
    name: 'Lazy DB Init',
    detect: (code) => /^engine\s*=\s*create_engine|^async_engine\s*=/m.test(code),
    message: 'DB engine created at module top-level — wrap in @lru_cache function for lazy init',
  },
  {
    principleId: 'C4',
    name: 'Thin Page Components',
    detect: (code) => /export default function \w+Page/.test(code) && /useState|useEffect|fetch\(/.test(code),
    message: 'Page component contains state/effects/fetching — extract to feature components/hooks',
  },
  {
    principleId: 'C6',
    name: 'Error Boundary Pattern',
    detect: (code) => /throw new Error|throw Error/.test(code) && /async function|Server Action/.test(code),
    message: 'Server Action throws errors — return { success: false, error } instead',
  },
  {
    principleId: 'D4',
    name: 'Parallel Data Fetching',
    detect: (code) => /(await get\w+\(\)[\s\S]{1,50}){2,}/.test(code) && !/Promise\.all/.test(code),
    message: 'Sequential awaits for independent data fetches — use Promise.all() for parallelism',
  },
  {
    principleId: 'E2',
    name: 'Thin main() Function',
    detect: (code) => /func main\(\)/.test(code) && /http\.ListenAndServe|sql\.Open|os\.Getenv/.test(code),
    message: 'main() contains app logic — extract to run() function that returns error',
  },
  {
    principleId: 'F3',
    name: 'ACL Typed Results',
    detect: (code) => /map\[string\]interface\{\}|map\[string\]any/.test(code),
    message: 'Using map[string]any — define typed structs for provider results (JobResult, ProviderError)',
  },
]

// ─── GitHub raw URL helper ────────────────────────────────────────────────────

const GITHUB_RAW = 'https://raw.githubusercontent.com/yerdaulet-damir/vibecodex/main'

async function fetchSkillContent(name: string): Promise<string> {
  const url = `${GITHUB_RAW}/.claude/skills/${name}/SKILL.md`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Skill "${name}" not found (HTTP ${res.status}). Available: ${SKILLS.join(', ')}`)
  }
  return res.text()
}

async function fetchPrincipleDoc(filename: string): Promise<string> {
  const url = `${GITHUB_RAW}/docs/principles/${filename}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch principle doc: ${filename}`)
  return res.text()
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'vibecodex',
  version: '1.0.0',
})

// ── Tool: list_principles ────────────────────────────────────────────────────
server.tool(
  'list_principles',
  'List vibecodex production principles, optionally filtered by stack (fastapi, nextjs, go)',
  {
    stack: z
      .enum(['fastapi', 'nextjs', 'go'])
      .optional()
      .describe('Filter by stack. Omit to list all 54 principles.'),
  },
  async ({ stack }) => {
    const filtered = stack
      ? PRINCIPLES.filter((p) => p.stack === stack)
      : PRINCIPLES

    const lines = filtered.map(
      (p) => `**${p.id}** — ${p.name} (${p.stack})\n  ${p.summary}\n  → ${p.href}`
    )

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `## vibecodex principles${stack ? ` — ${stack}` : ''} (${filtered.length} total)`,
            '',
            ...lines,
            '',
            `Full docs: https://github.com/yerdaulet-damir/vibecodex/tree/main/docs/principles`,
          ].join('\n'),
        },
      ],
    }
  }
)

// ── Tool: get_principle ──────────────────────────────────────────────────────
server.tool(
  'get_principle',
  'Get full details for a specific vibecodex principle by ID (e.g. "B3", "A1", "D4")',
  {
    id: z.string().describe('Principle ID, e.g. "B3" for Idempotency Keys'),
  },
  async ({ id }) => {
    const principle = PRINCIPLES.find(
      (p) => p.id.toLowerCase() === id.toLowerCase()
    )

    if (!principle) {
      const available = PRINCIPLES.map((p) => p.id).join(', ')
      return {
        content: [
          {
            type: 'text' as const,
            text: `Principle "${id}" not found.\n\nAvailable IDs: ${available}`,
          },
        ],
      }
    }

    // Map principle ID to doc filename
    const docMap: Record<string, string> = {
      A: '01-safe-decomposition.md',
      B: '02-integration-patterns.md',
      C: '03-nextjs-decomposition.md',
      D: '04-nextjs-modern.md',
      E: '05-go-decomposition.md',
      F: '06-go-integration.md',
    }
    const docFile = docMap[principle.id[0]]

    let docExcerpt = ''
    if (docFile) {
      try {
        const content = await fetchPrincipleDoc(docFile)
        // Extract section for this principle (find heading with principle name)
        const lines = content.split('\n')
        const startIdx = lines.findIndex(
          (l) => l.toLowerCase().includes(principle.name.toLowerCase()) ||
                 l.toLowerCase().includes(principle.id.toLowerCase())
        )
        if (startIdx !== -1) {
          docExcerpt = lines.slice(startIdx, startIdx + 30).join('\n')
        }
      } catch {
        // gracefully skip if GitHub is unreachable
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `## ${principle.id} — ${principle.name}`,
            `**Stack:** ${principle.stack}`,
            `**Category:** ${principle.category}`,
            `**Summary:** ${principle.summary}`,
            '',
            docExcerpt || '(Full doc available at the link below)',
            '',
            `**Full docs:** ${principle.href}`,
          ].join('\n'),
        },
      ],
    }
  }
)

// ── Tool: search_principles ──────────────────────────────────────────────────
server.tool(
  'search_principles',
  'Search vibecodex principles by keyword (name, summary, category)',
  {
    query: z.string().describe('Search query, e.g. "idempotency", "retry", "file size"'),
    stack: z
      .enum(['fastapi', 'nextjs', 'go'])
      .optional()
      .describe('Optionally limit search to one stack'),
  },
  async ({ query, stack }) => {
    const q = query.toLowerCase()
    const pool = stack ? PRINCIPLES.filter((p) => p.stack === stack) : PRINCIPLES

    const matches = pool.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    )

    if (matches.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No principles matched "${query}". Try: "idempotency", "retry", "logging", "decomposition", "file size", "error".`,
          },
        ],
      }
    }

    const lines = matches.map(
      (p) => `**${p.id}** — ${p.name} (${p.stack} / ${p.category})\n  ${p.summary}`
    )

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `## Search: "${query}" — ${matches.length} match${matches.length !== 1 ? 'es' : ''}`,
            '',
            ...lines,
          ].join('\n'),
        },
      ],
    }
  }
)

// ── Tool: get_skill ──────────────────────────────────────────────────────────
server.tool(
  'get_skill',
  'Get the full content of a vibecodex skill checklist (fetched live from GitHub)',
  {
    name: z
      .string()
      .describe(
        `Skill name. Available: ${SKILLS.join(', ')}`
      ),
  },
  async ({ name }) => {
    if (!SKILLS.includes(name)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `Skill "${name}" not found.`,
              '',
              `Available skills:`,
              ...SKILLS.map((s) => `  - **${s}**: ${SKILL_DESCRIPTIONS[s] || ''}`),
            ].join('\n'),
          },
        ],
      }
    }

    try {
      const content = await fetchSkillContent(name)
      return {
        content: [
          {
            type: 'text' as const,
            text: content,
          },
        ],
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error fetching skill "${name}": ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      }
    }
  }
)

// ── Tool: check_violation ────────────────────────────────────────────────────
server.tool(
  'check_violation',
  'Analyze code snippet for vibecodex principle violations. Returns which principles are violated and why.',
  {
    code: z.string().describe('Code snippet to analyze (Python, TypeScript, or Go)'),
    stack: z
      .enum(['fastapi', 'nextjs', 'go'])
      .optional()
      .describe('Stack hint to focus checks. Auto-detected if omitted.'),
  },
  async ({ code, stack }) => {
    // Auto-detect stack if not provided
    const detectedStack: Stack | null = stack
      ?? (code.includes('FastAPI') || code.includes('async def') || code.includes('import httpx')
        ? 'fastapi'
        : code.includes('func ') && code.includes('package ')
        ? 'go'
        : code.includes('export default') || code.includes('import React') || /\.tsx?/.test(code)
        ? 'nextjs'
        : null)

    const relevantChecks = VIOLATION_CHECKS.filter((c) => {
      if (!detectedStack) return true
      const principle = PRINCIPLES.find((p) => p.id === c.principleId)
      return !principle || principle.stack === detectedStack
    })

    const violations = relevantChecks.filter((c) => c.detect(code))

    if (violations.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `## vibecodex check — no violations detected`,
              detectedStack ? `Stack: ${detectedStack}` : 'Stack: auto-detect',
              '',
              `Checked ${relevantChecks.length} patterns. Code appears compliant.`,
              '',
              'Note: this is a static pattern scan — review full principles at https://github.com/yerdaulet-damir/vibecodex',
            ].join('\n'),
          },
        ],
      }
    }

    const lines = violations.map(
      (v) => `**${v.principleId} — ${v.name}**\n  ${v.message}`
    )

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `## vibecodex check — ${violations.length} violation${violations.length !== 1 ? 's' : ''} found`,
            detectedStack ? `Stack: ${detectedStack}` : '',
            '',
            ...lines,
            '',
            `Fix these by running: npx vibecodex init --stack ${detectedStack ?? 'fastapi'}`,
            `Docs: https://github.com/yerdaulet-damir/vibecodex`,
          ].join('\n'),
        },
      ],
    }
  }
)

// ── Tool: list_skills ────────────────────────────────────────────────────────
server.tool(
  'list_skills',
  'List all available vibecodex skill checklists',
  {},
  async () => {
    const lines = SKILLS.map(
      (s) => `**${s}**\n  ${SKILL_DESCRIPTIONS[s] || ''}`
    )
    return {
      content: [
        {
          type: 'text' as const,
          text: [
            '## vibecodex skills',
            '',
            ...lines,
            '',
            'Use get_skill to fetch the full checklist for any skill.',
            'Install locally: npx vibecodex init',
          ].join('\n'),
        },
      ],
    }
  }
)

// ─── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
