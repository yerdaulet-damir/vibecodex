const STEPS = [
  {
    cmd: '$ npx vibecodex init',
    lines: [
      { text: '  ? Select your stack:', color: '#e0e0e0' },
      { text: '  ❯ FastAPI (Python)', color: '#00d4aa' },
      { text: '    Next.js 15 (TypeScript)', color: '#666' },
      { text: '    Go 1.22+', color: '#666' },
      { text: '', color: '' },
      { text: '  ✓ Copied CLAUDE.md', color: '#00d4aa' },
      { text: '  ✓ Copied .cursor/rules/', color: '#00d4aa' },
      { text: '  ✓ Copied .claude/skills/', color: '#00d4aa' },
    ],
    label: '01',
    title: 'One command',
    desc: 'CLAUDE.md and rules land in your repo root',
  },
  {
    cmd: '# CLAUDE.md loaded',
    lines: [
      { text: '  Router → Service → Repository', color: '#00d4aa' },
      { text: '  No business logic in routers', color: '#666' },
      { text: '  No sqlalchemy in services', color: '#666' },
      { text: '', color: '' },
      { text: '  ACL: providers return typed results', color: '#00d4aa' },
      { text: '  Bulkhead: one AsyncClient per provider', color: '#666' },
      { text: '  Idempotency keys on every side-effect', color: '#666' },
      { text: '  Single-writer for critical resources', color: '#666' },
    ],
    label: '02',
    title: '54 rules active',
    desc: 'Claude reads CLAUDE.md on every session start',
  },
  {
    cmd: '$ claude "add /generate endpoint"',
    lines: [
      { text: '  → Creating routers/generate.py (8 lines)', color: '#00d4aa' },
      { text: '  → Creating services/generate.py', color: '#00d4aa' },
      { text: '  → Creating repositories/protocols.py', color: '#00d4aa' },
      { text: '', color: '' },
      { text: '  ✓ Layer boundaries respected', color: '#00d4aa' },
      { text: '  ✓ No sqlalchemy in service layer', color: '#00d4aa' },
      { text: '  ✓ Idempotency key in router', color: '#00d4aa' },
      { text: '  ✓ lint-architecture.sh passes', color: '#00d4aa' },
    ],
    label: '03',
    title: 'Clean code, first try',
    desc: 'No layer violations, no antipatterns',
  },
]

export function HowItWorks() {
  return (
    <section style={{
      padding: '80px 80px',
      maxWidth: 1280,
      margin: '0 auto',
    }}
    className="how-section"
    >
      <div style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 12,
        color: '#00d4aa',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 48,
      }}>
        // how it works
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
      }}
      className="steps-grid"
      >
        {STEPS.map((step) => (
          <div key={step.label} style={{
            background: '#0d0d0d',
            border: '1px solid #1e1e1e',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Terminal header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid #1e1e1e',
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#333', display: 'block' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#333', display: 'block' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#333', display: 'block' }} />
              </div>
            </div>

            {/* Terminal body */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 12,
                marginBottom: 10,
                color: '#e0e0e0',
              }}>
                {step.cmd}
              </div>
              {step.lines.map((line, i) => (
                <div key={i} style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 11,
                  color: line.color || 'transparent',
                  lineHeight: 1.6,
                  minHeight: '1.6em',
                }}>
                  {line.text}
                </div>
              ))}
            </div>

            {/* Label */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #1a1a1a',
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
            }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 11,
                color: '#00d4aa',
                opacity: 0.5,
              }}>{step.label}</span>
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 13,
                color: '#e0e0e0',
              }}>{step.title}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .how-section { padding: 60px 24px !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
