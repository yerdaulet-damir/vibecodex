'use client'

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #1a1a1a',
      padding: '28px 80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}
    className="footer"
    >
      <span style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 12,
        color: '#333',
      }}>
        vibecodex · MIT license
      </span>
      <a
        href="https://github.com/yerdaulet-damir/vibecodex"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 12,
          color: '#333',
          textDecoration: 'none',
          transition: 'color 0.15s',
        }}
        onMouseOver={e => e.currentTarget.style.color = '#666'}
        onMouseOut={e => e.currentTarget.style.color = '#333'}
      >
        github.com/yerdaulet-damir/vibecodex
      </a>
      <style>{`
        @media (max-width: 700px) {
          .footer { padding: 24px !important; }
        }
      `}</style>
    </footer>
  )
}
