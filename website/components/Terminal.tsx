'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BEFORE_LINES = [
  { text: '# routers/generate.py  (1,400 lines)', color: '#666' },
  { text: '@router.post("/generate")', color: '#ff4d4d' },
  { text: 'async def generate(req: dict, db=Depends(get_db)):', color: '#ff4d4d' },
  { text: '    result = await httpx.post(OPENAI_URL, json=req)', color: '#ff4d4d' },
  { text: '    data = result.json()', color: '#ff4d4d' },
  { text: '    wallet = db.query(Wallet).filter(...).one()', color: '#ff4d4d' },
  { text: '    wallet.balance -= data["usage"]["cost_usd"]', color: '#ff4d4d' },
  { text: '    db.commit()', color: '#ff4d4d' },
  { text: '    return data  # vendor shape leaks', color: '#ff4d4d' },
]

const CMD_LINE = '$ cp /tmp/vibecodex/CLAUDE.md ./'

const AFTER_LINES = [
  { text: '# routers/generate.py  (8 lines)', color: '#666' },
  { text: '@router.post("/generate", response_model=GenerateResponse)', color: '#00d4aa' },
  { text: 'async def generate(', color: '#00d4aa' },
  { text: '    req: GenerateRequest,', color: '#00d4aa' },
  { text: '    user_id: str = Depends(get_current_user_id),', color: '#00d4aa' },
  { text: '    svc: GenerateService = Depends(get_generate_service),', color: '#00d4aa' },
  { text: ') -> GenerateResponse:', color: '#00d4aa' },
  { text: '    return await svc.generate(user_id, req)', color: '#00d4aa' },
]

type Phase = 'before' | 'command' | 'after'

export function Terminal() {
  const [phase, setPhase] = useState<Phase>('before')
  const [visibleLines, setVisibleLines] = useState(0)
  const [cmdChars, setCmdChars] = useState(0)
  const [cursor, setCursor] = useState(true)

  // Cursor blink
  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  // Phase machine
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    if (phase === 'before') {
      if (visibleLines < BEFORE_LINES.length) {
        timeout = setTimeout(() => setVisibleLines(v => v + 1), 80)
      } else {
        timeout = setTimeout(() => { setPhase('command'); setCmdChars(0) }, 900)
      }
    }

    if (phase === 'command') {
      if (cmdChars < CMD_LINE.length) {
        timeout = setTimeout(() => setCmdChars(c => c + 1), 40)
      } else {
        timeout = setTimeout(() => { setPhase('after'); setVisibleLines(0) }, 600)
      }
    }

    if (phase === 'after') {
      if (visibleLines < AFTER_LINES.length) {
        timeout = setTimeout(() => setVisibleLines(v => v + 1), 90)
      } else {
        timeout = setTimeout(() => {
          setPhase('before')
          setVisibleLines(0)
          setCmdChars(0)
        }, 4000)
      }
    }

    return () => clearTimeout(timeout)
  }, [phase, visibleLines, cmdChars])

  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid #1e1e1e',
      borderRadius: '8px',
      overflow: 'hidden',
      fontFamily: 'var(--font-geist-mono)',
      fontSize: '13px',
      lineHeight: '1.65',
    }}>
      {/* Window chrome */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 14px',
        borderBottom: '1px solid #1e1e1e',
        background: '#111',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'block' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'block' }} />
        <span style={{ marginLeft: 8, color: '#444', fontSize: 11 }}>generate.py</span>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', minHeight: 220 }}>
        <AnimatePresence mode="wait">
          {phase === 'before' && (
            <motion.div key="before" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {BEFORE_LINES.slice(0, visibleLines).map((line, i) => (
                <div key={i} style={{ color: line.color }}>{line.text}</div>
              ))}
              {visibleLines < BEFORE_LINES.length && (
                <span style={{ color: '#ff4d4d', opacity: cursor ? 1 : 0 }}>█</span>
              )}
            </motion.div>
          )}

          {phase === 'command' && (
            <motion.div key="cmd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {BEFORE_LINES.map((line, i) => (
                <div key={i} style={{ color: '#333' }}>{line.text}</div>
              ))}
              <div style={{ marginTop: 12, color: '#00d4aa' }}>
                {CMD_LINE.slice(0, cmdChars)}
                <span style={{ opacity: cursor ? 1 : 0 }}>█</span>
              </div>
            </motion.div>
          )}

          {phase === 'after' && (
            <motion.div key="after" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {AFTER_LINES.slice(0, visibleLines).map((line, i) => (
                <div key={i} style={{ color: line.color }}>{line.text}</div>
              ))}
              {visibleLines < AFTER_LINES.length && (
                <span style={{ color: '#00d4aa', opacity: cursor ? 1 : 0 }}>█</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
