'use client'

interface ImageDirectionData {
  framing?: string | null
  light?: string | null
  mood?: string | null
}

interface Props {
  data?: ImageDirectionData | null
}

export default function ImageDirection({ data }: Props) {
  const cells = [
    { label: 'FRAMING', value: data?.framing },
    { label: 'LIGHT', value: data?.light },
    { label: 'MOOD', value: data?.mood },
  ]

  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 8,
      }}>
        Image Direction
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {cells.map(cell => (
          <div
            key={cell.label}
            style={{
              background: '#FFF8F0',
              border: '0.5px solid var(--rule)',
              borderRadius: 4,
              padding: '7px 8px',
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}>
              {cell.label}
            </div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 11,
              color: cell.value ? 'var(--ink-2)' : 'var(--ink-4)',
              fontStyle: cell.value ? 'normal' : 'italic',
            }}>
              {cell.value ?? 'Not specified'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
