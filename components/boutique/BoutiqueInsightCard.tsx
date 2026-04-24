interface BoutiqueInsightCardProps {
  type: 'watch' | 'nice' | 'info'
  title: string
  body: string
  style?: React.CSSProperties
}

export function BoutiqueInsightCard({ type, title, body, style }: BoutiqueInsightCardProps) {
  const borderColor = type === 'nice' ? '#6EBF8B' : type === 'info' ? '#6D3FD4' : '#D97706'
  const labelColor  = type === 'nice' ? '#6EBF8B' : type === 'info' ? '#6D3FD4' : '#D97706'
  const labelText   = type === 'nice' ? 'NICE WORK' : type === 'info' ? 'NOTE' : 'WATCH THIS'

  return (
    <div style={{
      borderLeft: `3px solid ${borderColor}`,
      paddingLeft: 14,
      paddingTop: 2,
      paddingBottom: 2,
      ...style,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: labelColor,
        marginBottom: 4,
      }}>
        {labelText}
      </div>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontWeight: 600,
        fontSize: 15,
        color: '#1E2D3D',
        marginBottom: 6,
        lineHeight: 1.3,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 1.65,
      }}>
        {body}
      </div>
    </div>
  )
}
