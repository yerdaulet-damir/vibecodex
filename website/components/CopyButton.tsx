'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      style={{
        background: copied ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? '#00d4aa40' : '#2a2a2a'}`,
        color: copied ? '#00d4aa' : '#999',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'var(--font-geist-mono)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ copied' : label}
    </button>
  )
}
