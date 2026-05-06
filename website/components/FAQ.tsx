'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'What is vibecodex?',
    a: 'vibecodex is a set of 54 production architecture principles for AI-assisted coding. It ships as a single CLAUDE.md file plus Cursor rules and Claude Code skills that any AI coding agent loads automatically. Stacks covered: FastAPI (Python), Next.js 15 (TypeScript), and Go 1.22+.',
  },
  {
    q: 'What problem does vibecodex solve?',
    a: 'AI assistants produce structurally correct, locally optimal code, but they do not enforce architectural consistency at scale: layer boundaries, file size limits, single-writer invariants, bulkhead isolation, idempotency keys. Vibe-coded apps look great on Friday and turn into a 1,400-line router by Sunday. vibecodex encodes the rules so the AI follows them from line one.',
  },
  {
    q: 'How do I install vibecodex in my project?',
    a: 'Run `npx @aimyerdaulet/vibecodex init` in your project root, select your stack (FastAPI, Next.js 15, Go 1.22+, or all), and the CLI copies CLAUDE.md, .cursor/rules/, and .claude/skills/ into the repo. From the next session, Claude Code and Cursor follow the 54 principles automatically.',
  },
  {
    q: 'Which AI coding tools does vibecodex support?',
    a: 'vibecodex works with any AI agent that reads CLAUDE.md or Cursor rule files. Verified support: Claude Code (via CLAUDE.md and .claude/skills/), Cursor (via .cursor/rules/*.mdc). There is also an MCP server (@aimyerdaulet/vibecodex-mcp) that exposes the principles as tools to Claude Desktop.',
  },
  {
    q: 'Which stacks does vibecodex cover?',
    a: 'Three stacks with reference implementations: FastAPI on Python 3.11+ (18 principles across decomposition and integration), Next.js 15 on TypeScript 5 (16 principles including modern RSC patterns), and Go 1.22+ (20 principles for cmd/+internal/ services with bulkhead isolation and graceful shutdown).',
  },
  {
    q: 'Is vibecodex free and open source?',
    a: 'Yes. vibecodex is MIT-licensed and free. Source code is at github.com/yerdaulet-damir/vibe-coding-rules. The CLI is published on npm as @aimyerdaulet/vibecodex and the MCP server as @aimyerdaulet/vibecodex-mcp.',
  },
  {
    q: 'How is vibecodex different from awesome-cursorrules or generic CLAUDE.md templates?',
    a: 'Most cursor-rules and CLAUDE.md templates are unstructured prose lists. vibecodex is 54 numbered, atomic principles (A1–F10) with reference implementations and Claude Code skills attached. Each principle has a name, a one-line summary, an anti-pattern, and a code example you can grep for. The numbering makes it auditable: you can ask the AI "does this follow B3?" and get a yes/no answer.',
  },
]

function FAQItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      style={{
        borderBottom: '1px solid #1a1a1a',
        padding: '20px 0',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          color: '#e0e0e0',
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 15,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#e0e0e0' }}>
          {q}
        </h3>
        <span
          style={{
            color: '#00d4aa',
            fontSize: 18,
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          +
        </span>
      </button>
      {open && (
        <p
          style={{
            margin: '12px 0 0',
            color: '#888',
            fontSize: 14,
            lineHeight: 1.7,
            maxWidth: 760,
          }}
        >
          {a}
        </p>
      )}
    </div>
  )
}

export function FAQ() {
  return (
    <section
      id="faq"
      style={{
        padding: '80px 80px',
        maxWidth: 920,
        margin: '0 auto',
      }}
      className="faq-section"
    >
      <div
        style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 12,
          color: '#00d4aa',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        // questions
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 32,
          fontWeight: 500,
          color: '#fff',
          margin: 0,
          marginBottom: 48,
          letterSpacing: '-0.02em',
        }}
      >
        Frequently asked
      </h2>

      <div>
        {FAQS.map((f, i) => (
          <FAQItem key={i} q={f.q} a={f.a} defaultOpen={i === 0} />
        ))}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .faq-section { padding: 60px 24px !important; }
        }
      `}</style>
    </section>
  )
}
