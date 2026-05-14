'use client'

interface Props {
  quote: string
  attribution?: string | null
}

export default function QuoteCardPreview({ quote, attribution }: Props) {
  return (
    <div style={{
      background: 'var(--ink)',
      borderRadius: 4,
      padding: '16px 18px',
      marginTop: 10,
      position: 'relative',
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--amber)',
        marginBottom: 10,
      }} />
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 13,
        fontStyle: 'italic',
        fontWeight: 400,
        color: 'var(--paper)',
        lineHeight: 1.6,
        margin: '0 0 10px',
      }}>
        &ldquo;{quote}&rdquo;
      </p>
      {attribution && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: 'var(--amber)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          — {attribution}
        </div>
      )}
    </div>
  )
}
