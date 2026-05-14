'use client'

interface Quote {
  id: string
  text: string
  context?: string | null
  selected: boolean
}

interface Props {
  projectId: string
  quote: Quote
  onToggle: (id: string, selected: boolean) => void
  onDelete: (id: string) => void
}

export default function QuoteItem({ projectId, quote, onToggle, onDelete }: Props) {
  const handleToggle = async () => {
    const next = !quote.selected
    onToggle(quote.id, next)
    await fetch(`/api/content/projects/${projectId}/quotes/${quote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected: next }),
    }).catch(() => {})
  }

  const handleDelete = async () => {
    onDelete(quote.id)
    await fetch(`/api/content/projects/${projectId}/quotes/${quote.id}`, {
      method: 'DELETE',
    }).catch(() => {})
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid var(--rule)',
    }}>
      {/* Custom checkbox */}
      <button
        onClick={handleToggle}
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          border: quote.selected ? 'none' : '1.5px solid var(--rule)',
          background: quote.selected ? 'var(--sage)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: 2,
          transition: 'background 0.12s, border 0.12s',
        }}
        aria-label={quote.selected ? 'Deselect quote' : 'Select quote'}
      >
        {quote.selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Quote text + context */}
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 13,
          fontStyle: 'italic',
          color: quote.selected ? 'var(--ink)' : 'var(--ink-4)',
          lineHeight: 1.6,
          margin: 0,
          transition: 'color 0.12s',
        }}>
          "{quote.text}"
        </p>
        {quote.context && (
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11,
            fontStyle: 'italic',
            color: 'var(--ink-4)',
            lineHeight: 1.5,
            margin: '4px 0 0',
          }}>
            {quote.context}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-4)',
          fontSize: 16,
          lineHeight: 1,
          padding: '2px 4px',
          flexShrink: 0,
          marginTop: 1,
          opacity: 0.5,
          transition: 'opacity 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        aria-label="Remove quote"
      >
        ×
      </button>
    </div>
  )
}
