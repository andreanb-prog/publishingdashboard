'use client'

type Tone = 'green' | 'amber' | 'coral' | 'plum'

interface BoutiqueStatusChipProps {
  tone: Tone
  label: string
}

const DOT_COLORS: Record<Tone, string> = {
  green: '#6EBF8B',
  amber: '#D97706',
  coral: '#F97B6B',
  plum: '#6D3FD4',
}

export function BoutiqueStatusChip({ tone, label }: BoutiqueStatusChipProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      fontSize: 13,
      color: 'var(--ink, #1E2D3D)',
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: DOT_COLORS[tone],
        flexShrink: 0,
        display: 'inline-block',
      }} />
      {label}
    </span>
  )
}
