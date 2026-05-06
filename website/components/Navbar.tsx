'use client'

export function Navbar() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 80px',
        height: 56,
        background: 'rgba(8, 8, 8, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #111',
      }}
      className="navbar"
    >
      {/* Logo mark + wordmark */}
      <a
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
        }}
      >
        {/* SVG mark */}
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="10" fill="#0d0d0d"/>
          <rect x="0.5" y="0.5" width="63" height="63" rx="9.5" stroke="#00d4aa" strokeOpacity="0.3"/>
          <path d="M14 26 L24 32 L14 38" stroke="#00d4aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="27" y="38" width="12" height="3" rx="1.5" fill="#00d4aa"/>
        </svg>

        {/* Wordmark */}
        <span style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 15,
          fontWeight: 500,
          color: '#e0e0e0',
          letterSpacing: '-0.01em',
        }}>
          vibecodex
        </span>
      </a>

      {/* Right links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <a
          href="#principles"
          className="nav-link"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 12,
            color: '#555',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = '#999')}
          onMouseOut={e => (e.currentTarget.style.color = '#555')}
        >
          54 principles
        </a>
        <a
          href="#faq"
          className="nav-link"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 12,
            color: '#555',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = '#999')}
          onMouseOut={e => (e.currentTarget.style.color = '#555')}
        >
          FAQ
        </a>
        <a
          href="https://github.com/yerdaulet-damir/vibecodex"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 12,
            color: '#e0e0e0',
            textDecoration: 'none',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = '#00d4aa40'
            e.currentTarget.style.color = '#00d4aa'
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = '#1e1e1e'
            e.currentTarget.style.color = '#e0e0e0'
          }}
        >
          ⭐ GitHub
        </a>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .navbar { padding: 0 20px !important; }
          .navbar .nav-link { display: none; }
        }
      `}</style>
    </nav>
  )
}
