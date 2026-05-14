'use client'

const PILLAR_COLORS = [
  'var(--sage)',
  'var(--ink)',
  'var(--amber)',
  'var(--rose)',
]

const DEFAULT_PILLARS = [
  'Emotional Experience',
  'Reader Identity',
  'World Mood Board',
  'Trope Moment',
]

interface Props {
  pillars: string[]
  onChange: (pillars: string[]) => void
  onBlur: (pillars: string[]) => void
}

export default function PillarEditor({ pillars, onChange, onBlur }: Props) {
  const values = pillars.length === 4 ? pillars : DEFAULT_PILLARS

  const update = (i: number, v: string) => {
    const next = [...values]
    next[i] = v
    onChange(next)
  }

  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 4,
      padding: '24px 32px',
    }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--ink)',
        margin: '0 0 20px',
      }}>
        Content pillars
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {values.map((pillar, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: PILLAR_COLORS[i],
              flexShrink: 0,
            }} />
            <input
              type="text"
              value={pillar}
              onChange={e => update(i, e.target.value)}
              onBlur={e => {
                const next = [...values]; next[i] = e.target.value; onBlur(next)
              }}
              style={{
                flex: 1,
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                color: 'var(--ink)',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = PILLAR_COLORS[i] }}
              onBlurCapture={e => { e.target.style.borderColor = 'var(--rule)' }}
            />
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: 12,
        color: 'var(--ink-4)',
        margin: '14px 0 0',
        lineHeight: 1.6,
      }}>
        Edit any pillar after generating — Claude rewrites affected posts
      </p>
    </div>
  )
}
