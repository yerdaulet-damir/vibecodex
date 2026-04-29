'use client'

import { Terminal } from './Terminal'
import { CopyButton } from './CopyButton'

export function Hero() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '64px',
      alignItems: 'center',
      padding: '80px 80px',
      maxWidth: 1280,
      margin: '0 auto',
    }}
    className="hero-section"
    >
      {/* Left: Terminal */}
      <div>
        <Terminal />
        <div style={{
          marginTop: 12,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}>
          <span style={{ color: '#333', fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>
            // before vibecodex → after vibecodex
          </span>
        </div>
      </div>

      {/* Right: Copy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 12,
            color: '#00d4aa',
            letterSpacing: '0.08em',
            marginBottom: 20,
            textTransform: 'uppercase',
          }}>
            // 54 production principles
          </div>

          <h1 style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 'clamp(28px, 3.5vw, 48px)',
            fontWeight: 500,
            lineHeight: 1.2,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Your AI writes code<br />
            that breaks in prod.<br />
            <span style={{ color: '#00d4aa' }}>vibecodex fixes that.</span>
          </h1>
        </div>

        <p style={{
          color: '#666',
          fontSize: 16,
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 380,
        }}>
          Architecture rules your AI follows automatically.
          Copy one file. Every Claude session follows
          54 production principles from line one.
        </p>

        {/* CTA */}
        <div style={{
          background: '#0d0d0d',
          border: '1px solid #1e1e1e',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          maxWidth: 400,
        }}>
          <span style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 14,
            color: '#e0e0e0',
          }}>
            <span style={{ color: '#00d4aa' }}>$</span>{' '}
            npx @aimyerdaulet/vibecodex init
          </span>
          <CopyButton text="npx @aimyerdaulet/vibecodex init" />
        </div>

        {/* Stack tags */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { label: 'FastAPI', color: '#3776ab' },
            { label: 'Next.js 15', color: '#e0e0e0' },
            { label: 'Go 1.22+', color: '#00add8' },
          ].map(s => (
            <span key={s.label} style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 12,
              color: s.color,
              opacity: 0.7,
            }}>{s.label}</span>
          ))}
        </div>

        {/* GitHub link */}
        <div style={{ display: 'flex', gap: 16 }}>
          <a
            href="https://github.com/yerdaulet-damir/vibecodex"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#666',
              fontSize: 13,
              fontFamily: 'var(--font-geist-mono)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.color = '#00d4aa')}
            onMouseOut={e => (e.currentTarget.style.color = '#666')}
          >
            ⭐ github.com/yerdaulet-damir/vibecodex
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-section {
            grid-template-columns: 1fr !important;
            padding: 60px 24px !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  )
}
