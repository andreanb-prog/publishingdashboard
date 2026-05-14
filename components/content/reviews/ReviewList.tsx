'use client'

import ReviewItem from './ReviewItem'

interface Review {
  id: string
  text: string
  reviewer: string | null
  bookTitle: string | null
}

interface Props {
  reviews: Review[]
  onDelete: (id: string) => void
}

export default function ReviewList({ reviews, onDelete }: Props) {
  if (reviews.length === 0) {
    return (
      <div style={{
        padding: '32px 16px',
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 13,
        fontStyle: 'italic',
        color: 'var(--ink-4)',
        lineHeight: 1.6,
      }}>
        No reviews yet — paste your first one above.
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 6, overflow: 'hidden' }}>
      {reviews.map(review => (
        <ReviewItem key={review.id} review={review} onDelete={onDelete} />
      ))}
    </div>
  )
}
