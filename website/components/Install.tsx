'use client'

import { CopyButton } from './CopyButton'

const INSTALL_LINES = [
  { text: '$ npx @aimyerdaulet/vibecodex init', color: '#e0e0e0' },
  { text: '', color: '' },
  { text: '  ? Select your stack:', color: '#999' },
  { text: '  ❯ FastAPI (Python)', color: '#00d4aa' },
  { text: '    Next.js 15 (TypeScript)', color: '#555' },
  { text: '    Go 1.22+', color: '#555' },
  { text: '    All stacks', color: '#555' },
  { text: '', color: '' },
  { text: '  ✓ Copied CLAUDE.md', color: '#00d4aa' },
  { text: '  ✓ Copied .cursor/rules/architecture.mdc', color: '#00d4aa' },
  { text: '  ✓ Copied .cursor/rules/decomposition.mdc', color: '#00d4aa' },
  { text: '  ✓ Copied .cursor/rules/integrations.mdc', color: '#00d4aa' },
  { text: '  ✓ Copied .claude/skills/debug-backend/SKILL.md', color: '#00d4aa' },
  { text: '  ✓ Copied .claude/skills/new-feature/SKILL.md', color: '#00d4aa' },
  { text: '  ✓ Copied .claude/skills/add-provider/SKILL.md', color: '#00d4aa' },
  { text: '  ✓ Copied .claude/skills/split-monolith/SKILL.md', color: '#00d4aa' },
  { text: '', color: '' },
  { text: '  Done. Your AI now follows 54 production principles.', color: '#fff' },
]

export function Install() {
  return (
    <section style={{
      padding: '80px 80px',
      maxWidth: 1280,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}
    className="install-section"
    >
      <div style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 12,
        color: '#00d4aa',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 48,
      }}>
        // get started
      </div>

      {/* Big terminal */}
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: '#0d0d0d',
        border: '1px solid #1e1e1e',
        borderRadius: 10,
        overflow: 'hidden',
        textAlign: 'left',
      }}>
        {/* Window chrome */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #1e1e1e',
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'block' }} />
          </div>
          <CopyButton text="npx @aimyerdaulet/vibecodex init" label="copy" />
        </div>

        {/* Output */}
        <div style={{ padding: '20px 20px' }}>
          {INSTALL_LINES.map((line, i) => (
            <div key={i} style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 13,
              color: line.color || 'transparent',
              lineHeight: 1.65,
              minHeight: '1.65em',
            }}>
              {line.text}
            </div>
          ))}
        </div>
      </div>

      {/* Links below */}
      <div style={{
        marginTop: 40,
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <a
          href="https://github.com/yerdaulet-damir/vibe-coding-rules"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            color: '#e0e0e0',
            textDecoration: 'none',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 13,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = '#00d4aa40'
            e.currentTarget.style.color = '#00d4aa'
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = '#2a2a2a'
            e.currentTarget.style.color = '#e0e0e0'
          }}
        >
          ⭐ Star on GitHub
        </a>
        <a
          href="https://github.com/yerdaulet-damir/vibe-coding-rules/tree/main/docs/principles"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#666',
            textDecoration: 'none',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 13,
            transition: 'color 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.color = '#999'}
          onMouseOut={e => e.currentTarget.style.color = '#666'}
        >
          Read the principles →
        </a>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .install-section { padding: 60px 24px !important; }
        }
      `}</style>
    </section>
  )
}
