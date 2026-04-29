import { codeToHtml } from 'shiki'

const BEFORE = `# routers/generate.py  (1,400 lines)
@router.post("/generate")
async def generate(req: dict, db=Depends(get_db)):
    result = await httpx.post(OPENAI_URL, json=req)
    data = result.json()
    wallet = db.query(Wallet).filter(...).one()
    wallet.balance -= data["usage"]["cost_usd"]
    db.commit()
    return data  # vendor shape leaks into response`

const AFTER = `# routers/generate.py  (8 lines)
@router.post("/generate", response_model=GenerateResponse)
async def generate(
    req: GenerateRequest,
    user_id: str = Depends(get_current_user_id),
    svc: GenerateService = Depends(get_generate_service),
) -> GenerateResponse:
    return await svc.generate(user_id, req)`

export async function Problem() {
  const [beforeHtml, afterHtml] = await Promise.all([
    codeToHtml(BEFORE, { lang: 'python', theme: 'github-dark' }),
    codeToHtml(AFTER, { lang: 'python', theme: 'github-dark' }),
  ])

  return (
    <section style={{
      padding: '80px 80px',
      maxWidth: 1280,
      margin: '0 auto',
    }}
    className="problem-section"
    >
      <div style={{
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 12,
        color: '#00d4aa',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 48,
      }}>
        // the problem
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
      }}
      className="diff-grid"
      >
        {/* Before */}
        <div style={{
          background: '#0d0d0d',
          border: '1px solid #1e1e1e',
          borderLeft: '3px solid #ff4d4d',
          borderRadius: '0 8px 8px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid #1e1e1e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4d', display: 'block' }} />
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: '#ff4d4d' }}>
              WITHOUT vibecodex
            </span>
          </div>
          <div
            style={{ padding: '16px', overflowX: 'auto' }}
            dangerouslySetInnerHTML={{ __html: beforeHtml }}
          />
        </div>

        {/* After */}
        <div style={{
          background: '#0d0d0d',
          border: '1px solid #1e1e1e',
          borderLeft: '3px solid #00d4aa',
          borderRadius: '0 8px 8px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid #1e1e1e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa', display: 'block' }} />
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: '#00d4aa' }}>
              WITH vibecodex
            </span>
          </div>
          <div
            style={{ padding: '16px', overflowX: 'auto' }}
            dangerouslySetInnerHTML={{ __html: afterHtml }}
          />
        </div>
      </div>

      <div style={{
        marginTop: 40,
        padding: '20px 24px',
        background: '#0d0d0d',
        border: '1px solid #1e1e1e',
        borderRadius: 8,
        maxWidth: 720,
      }}>
        <p style={{
          margin: 0,
          color: '#999',
          fontSize: 14,
          lineHeight: 1.7,
          fontFamily: 'var(--font-geist-mono)',
        }}>
          <span style={{ color: '#00d4aa' }}>// </span>
          AI assistants produce structurally correct, locally optimal code.
          What they don&apos;t enforce is architectural consistency:
          layer boundaries, single-writer invariants, bulkhead isolation,
          idempotency keys.
          <span style={{ color: '#fff' }}> vibecodex does.</span>
        </p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .problem-section { padding: 60px 24px !important; }
          .diff-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
