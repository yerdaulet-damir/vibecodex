'use client'

export function Author() {
  return (
    <section
      style={{
        padding: '60px 80px',
        maxWidth: 920,
        margin: '0 auto',
      }}
      className="author-section"
    >
      <div
        style={{
          background: '#0d0d0d',
          border: '1px solid #1a1a1a',
          borderRadius: 10,
          padding: 28,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Avatar */}
        <a
          href="https://github.com/yerdaulet-damir"
          target="_blank"
          rel="noopener noreferrer me"
          style={{ flexShrink: 0, lineHeight: 0 }}
        >
          <img
            src="https://github.com/yerdaulet-damir.png?size=120"
            width={64}
            height={64}
            alt="Yerdaulet Damir — vibecodex author"
            style={{
              borderRadius: '50%',
              border: '1px solid #2a2a2a',
              display: 'block',
            }}
          />
        </a>

        {/* Bio */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 11,
              color: '#00d4aa',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            // built by
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 18,
              fontWeight: 500,
              color: '#fff',
              margin: 0,
              marginBottom: 8,
              letterSpacing: '-0.01em',
            }}
          >
            Yerdaulet Damir
          </h3>
          <p
            style={{
              color: '#888',
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              marginBottom: 14,
              maxWidth: 560,
            }}
          >
            Full-stack engineer building production AI products. vibecodex is the
            architecture rulebook I wished existed when my first vibe-coded SaaS
            turned into a 1,400-line router. Distilled from real refactors across
            FastAPI, Next.js 15, and Go services in production.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a
              href="https://github.com/yerdaulet-damir"
              target="_blank"
              rel="noopener noreferrer me"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 12,
                color: '#666',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#00d4aa')}
              onMouseOut={e => (e.currentTarget.style.color = '#666')}
            >
              github.com/yerdaulet-damir
            </a>
            <span style={{ color: '#333', fontSize: 12 }}>·</span>
            <a
              href="https://www.npmjs.com/~aimyerdaulet"
              target="_blank"
              rel="noopener noreferrer me"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 12,
                color: '#666',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#00d4aa')}
              onMouseOut={e => (e.currentTarget.style.color = '#666')}
            >
              npm: aimyerdaulet
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .author-section { padding: 40px 24px !important; }
        }
      `}</style>
    </section>
  )
}
