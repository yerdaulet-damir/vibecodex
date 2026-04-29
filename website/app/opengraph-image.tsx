import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'vibecodex — 54 production principles for AI-assisted coding'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#080808',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          display: 'flex',
        }} />

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #00d4aa, #00d4aa44, transparent)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          padding: '0 88px', gap: 80,
        }}>
          {/* Left: logo mark */}
          <div style={{
            width: 160, height: 160, flexShrink: 0,
            background: '#0d0d0d',
            border: '1px solid rgba(0,212,170,0.25)',
            borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <svg width="80" height="80" viewBox="0 0 64 64" fill="none">
              <path d="M10 24 L24 32 L10 40" stroke="#00d4aa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="28" y="40" width="18" height="4" rx="2" fill="#00d4aa"/>
            </svg>
          </div>

          {/* Right: text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            {/* Label */}
            <div style={{
              fontSize: 13, color: '#00d4aa', letterSpacing: '0.12em',
              textTransform: 'uppercase', display: 'flex',
            }}>
              // 54 production principles
            </div>

            {/* Title */}
            <div style={{
              fontSize: 64, fontWeight: 600, color: '#ffffff',
              lineHeight: 1.1, letterSpacing: '-0.02em', display: 'flex',
            }}>
              vibecodex
            </div>

            {/* Tagline */}
            <div style={{
              fontSize: 22, color: '#666', lineHeight: 1.5, display: 'flex',
            }}>
              Your AI writes code that breaks in prod.
              <br />
              vibecodex fixes that.
            </div>

            {/* Stack tags */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {[
                { label: 'FastAPI', color: '#3776ab' },
                { label: 'Next.js 15', color: '#e0e0e0' },
                { label: 'Go 1.22+', color: '#00add8' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '6px 16px',
                  background: '#111',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                  fontSize: 14, color: s.color,
                  display: 'flex',
                }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '0 88px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 14, color: '#333', display: 'flex' }}>
            npx @aimyerdaulet/vibecodex init
          </div>
          <div style={{ fontSize: 14, color: '#333', display: 'flex' }}>
            github.com/yerdaulet-damir/vibecodex
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
