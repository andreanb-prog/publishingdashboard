'use client'

interface BoutiqueBarListItem {
  label: string
  value: number
  formatted?: string
}

interface BoutiqueBarListProps {
  items: BoutiqueBarListItem[]
}

export function BoutiqueBarList({ items }: BoutiqueBarListProps) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: '#6B7280',
            width: 128,
            textAlign: 'right',
            flexShrink: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.label}
          </span>
          <div style={{ flex: 1, height: 4, background: '#F3EDE3', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${(item.value / max) * 100}%`,
              background: '#D97706',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 13,
            fontWeight: 600,
            color: '#1E2D3D',
            width: 60,
            textAlign: 'right',
            flexShrink: 0,
          }}>
            {item.formatted ?? item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
