'use client'

interface Book {
  id: string
  title: string
  asin: string | null
  seriesName: string | null
}

interface Props {
  hasLaunch: boolean
  launchDate: string
  launchBookId: string
  books: Book[]
  onChange: (patch: { hasLaunch?: boolean; launchDate?: string; launchBookId?: string }) => void
}

export default function LaunchCard({ hasLaunch, launchDate, launchBookId, books, onChange }: Props) {
  return (
    <div style={{
      background: 'var(--paper-2)',
      border: `1px solid ${hasLaunch ? 'var(--amber)' : 'var(--rule)'}`,
      borderLeft: hasLaunch ? '3px solid var(--amber)' : '1px solid var(--rule)',
      borderRadius: 4,
      padding: '28px 32px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}>
          — A QUESTION BEFORE WE BEGIN
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          STORYBRAND / TRUST FLYWHEEL
        </div>
      </div>

      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22,
        fontWeight: 600,
        color: 'var(--ink)',
        margin: '0 0 20px',
        lineHeight: 1.25,
      }}>
        Do you have a launch this month?
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['Yes', 'No'] as const).map(opt => {
          const active = opt === 'Yes' ? hasLaunch : !hasLaunch
          return (
            <button
              key={opt}
              aria-pressed={active}
              onClick={() => onChange({ hasLaunch: opt === 'Yes' })}
              style={{
                padding: '8px 24px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? 'var(--amber)' : 'var(--rule)',
                background: active ? 'var(--amber)' : 'transparent',
                color: active ? '#fff' : 'var(--ink-3)',
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {hasLaunch && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{
                display: 'block',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}>
                Launch Book
              </label>
              <select
                value={launchBookId}
                onChange={e => onChange({ launchBookId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: 'var(--ink)',
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  borderRadius: 4,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="">Select a book…</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 160 }}>
              <label style={{
                display: 'block',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}>
                Launch Date
              </label>
              <input
                type="date"
                value={launchDate}
                onChange={e => onChange({ launchDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: 'var(--ink)',
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  borderRadius: 4,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-4)',
            margin: 0,
            lineHeight: 1.6,
          }}>
            We'll bake the full Miller arc into your calendar — empathy, anticipation, the origin-story post seven days out, launch week, and post-launch social proof. You won't have to think about it.
          </p>
        </>
      )}
    </div>
  )
}
