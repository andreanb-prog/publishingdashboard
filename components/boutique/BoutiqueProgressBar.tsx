interface BoutiqueProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  label?: string
  height?: number
  style?: React.CSSProperties
}

export function BoutiqueProgressBar({
  value,
  max = 100,
  showLabel = false,
  label,
  height = 4,
  style,
}: BoutiqueProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const displayLabel = label ?? `${Math.round(pct)}%`

  return (
    <div style={style}>
      {showLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 4,
        }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: '#D97706',
          }}>
            {displayLabel}
          </span>
        </div>
      )}
      <div style={{
        width: '100%',
        height,
        background: '#EEEBE6',
        borderRadius: 99,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: '#D97706',
          borderRadius: 99,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}
