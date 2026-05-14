'use client'

const OPTIONS = [
  { value: 3, label: '3×', sublabel: 'per week', note: '~13 posts / month' },
  { value: 5, label: '5×', sublabel: 'per week', note: '~22 posts / month' },
  { value: 7, label: 'Daily', sublabel: 'every day', note: '30 posts / month' },
]

interface Props {
  value: number
  onChange: (v: number) => void
}

export default function FrequencyPicker({ value, onChange }: Props) {
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
        Cadence
      </h3>

      <div style={{ display: 'flex', gap: 10 }}>
        {OPTIONS.map(opt => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1,
                padding: '16px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? 'var(--amber)' : 'var(--rule)',
                background: active ? 'var(--ink)' : 'var(--paper)',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22,
                fontWeight: 700,
                color: active ? 'var(--paper)' : 'var(--ink)',
                lineHeight: 1,
                marginBottom: 4,
              }}>
                {opt.label}
              </div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11,
                color: active ? 'rgba(241,232,212,0.7)' : 'var(--ink-3)',
                marginBottom: 6,
              }}>
                {opt.sublabel}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: active ? 'var(--amber)' : 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {opt.note}
              </div>
            </button>
          )
        })}
      </div>

      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: 12,
        color: 'var(--ink-4)',
        margin: '14px 0 0',
        lineHeight: 1.6,
      }}>
        Every 7th post slot is reserved for a reader review
      </p>
    </div>
  )
}
