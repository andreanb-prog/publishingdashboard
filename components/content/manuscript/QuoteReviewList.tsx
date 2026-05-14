'use client'

import QuoteItem from './QuoteItem'

interface Quote {
  id: string
  text: string
  selected: boolean
}

interface Props {
  projectId: string
  quotes: Quote[]
  onToggle: (id: string, selected: boolean) => void
  onDelete: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export default function QuoteReviewList({
  projectId,
  quotes,
  onToggle,
  onDelete,
  onSelectAll,
  onClearAll,
}: Props) {
  const selectedCount = quotes.filter(q => q.selected).length

  return (
    <div style={{ marginTop: 40 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 4,
          }}>
            {quotes.length} CANDIDATES · KEEP YOUR BEST 15–20
          </div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            color: 'var(--ink-4)',
            fontStyle: 'italic',
            margin: 0,
          }}>
            More is fine. These are the only lines that will ever appear in your Quote Card posts — Claude never invents them.
          </p>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--ink-3)',
          fontWeight: 600,
          flexShrink: 0,
          marginLeft: 16,
        }}>
          {selectedCount} selected
        </div>
      </div>

      {/* Select all / clear all */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={onSelectAll}
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink-3)',
            background: 'none',
            border: '1px solid var(--rule)',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          Select all
        </button>
        <button
          onClick={onClearAll}
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink-3)',
            background: 'none',
            border: '1px solid var(--rule)',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          Clear all
        </button>
      </div>

      {/* Quote list */}
      <div>
        {quotes.map(quote => (
          <QuoteItem
            key={quote.id}
            projectId={projectId}
            quote={quote}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
