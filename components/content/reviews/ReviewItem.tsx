'use client'

interface Review {
  id: string
  text: string
  reviewer: string | null
  bookTitle: string | null
}

interface Props {
  review: Review
  onDelete: (id: string) => void
}

export default function ReviewItem({ review, onDelete }: Props) {
  return (
    <div style={{
      position: 'relative',
      padding: '14px 40px 14px 16px',
      borderBottom: '1px solid var(--rule)',
    }}>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 13,
        fontStyle: 'italic',
        color: 'var(--ink)',
        lineHeight: 1.6,
        margin: '0 0 6px',
      }}>
        &ldquo;{review.text}&rdquo;
      </p>
      {(review.reviewer || review.bookTitle) && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}>
          {[review.reviewer, review.bookTitle].filter(Boolean).join(' · ')}
        </div>
      )}
      <button
        onClick={() => onDelete(review.id)}
        aria-label="Delete review"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-4)',
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
          borderRadius: 2,
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}
      >
        ×
      </button>
    </div>
  )
}
