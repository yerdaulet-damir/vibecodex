'use client'

import { useState } from 'react'
import { principles, stackColors, stackLabels, type Principle } from '../lib/principles'

function PrincipleCard({ p }: { p: Principle }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={p.href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: hovered ? '#111' : '#0d0d0d',
        border: `1px solid ${hovered ? '#2a2a2a' : '#1a1a1a'}`,
        borderRadius: 6,
        padding: '12px',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 12,
        color: '#00d4aa',
        fontWeight: 600,
        marginBottom: 4,
      }}>
        {p.id}
      </div>
      <div style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 11,
        color: hovered ? '#e0e0e0' : '#999',
        lineHeight: 1.4,
        transition: 'color 0.15s',
      }}>
        {p.name}
      </div>
      {hovered && (
        <div style={{
          marginTop: 6,
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 10,
          color: '#555',
          lineHeight: 1.4,
        }}>
          {p.summary}
        </div>
      )}
      <div style={{
        marginTop: 8,
        display: 'inline-block',
        fontSize: 9,
        fontFamily: 'var(--font-geist-mono)',
        color: stackColors[p.stack],
        opacity: 0.6,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {stackLabels[p.stack]}
      </div>
    </a>
  )
}

const STACK_FILTERS = [
  { value: 'all', label: 'All 54' },
  { value: 'python', label: 'FastAPI (18)' },
  { value: 'typescript', label: 'Next.js (16)' },
  { value: 'go', label: 'Go (20)' },
]

export function Principles() {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all'
    ? principles
    : principles.filter(p => p.stack === filter)

  return (
    <section style={{
      padding: '80px 80px',
      maxWidth: 1280,
      margin: '0 auto',
    }}
    className="principles-section"
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 40,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 12,
          color: '#00d4aa',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          // 54 production principles
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STACK_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '5px 12px',
                borderRadius: 4,
                border: `1px solid ${filter === f.value ? '#2a2a2a' : '#1a1a1a'}`,
                background: filter === f.value ? '#161616' : 'transparent',
                color: filter === f.value ? '#e0e0e0' : '#555',
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8,
      }}
      className="principles-grid"
      >
        {filtered.map(p => (
          <PrincipleCard key={p.id} p={p} />
        ))}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .principles-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .principles-section { padding: 60px 24px !important; }
          .principles-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .principles-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}
