'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewForm from './ReviewForm'
import ReviewList from './ReviewList'

interface Review {
  id: string
  text: string
  reviewer: string | null
  bookTitle: string | null
}

interface Book {
  id: string
  title: string
}

interface Props {
  projectId: string
  initialReviews: Review[]
  books: Book[]
}

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--ink-4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
}

const ghostBtn: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-3)',
  background: 'none',
  border: '1px solid var(--rule)',
  borderRadius: 4,
  padding: '8px 16px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

const primaryBtn: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 4,
  padding: '8px 18px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

export default function ReviewBank({ projectId, initialReviews, books }: Props) {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  const handleAdd = (review: Review) => {
    setReviews(prev => [review, ...prev])
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/content/projects/${projectId}/reviews/${id}`, { method: 'DELETE' })
      setReviews(prev => prev.filter(r => r.id !== id))
    } catch {
      // silent
    }
  }

  const isComplete = reviews.length >= 3

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ ...monoLabel, marginBottom: 12 }}>STEP 03 · REVIEW BANK</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            Let your readers <em style={{ fontStyle: 'italic', fontWeight: 400 }}>do the selling.</em>
          </h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-4)',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 520,
          }}>
            Paste your reader reviews once. Every 7th post slot pulls from here automatically — no decisions needed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24, paddingTop: 8 }}>
          <a href={`/content/${projectId}/manuscript`} style={ghostBtn}>
            Skip for now
          </a>
          <a href={`/content/${projectId}/images`} style={primaryBtn}>
            Continue to Images →
          </a>
        </div>
      </div>

      {/* Status badge */}
      {reviews.length > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 3,
          background: isComplete ? 'rgba(123,132,102,0.12)' : 'rgba(20,33,61,0.06)',
          marginBottom: 28,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: isComplete ? 'var(--sage)' : 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}>
            {isComplete ? `${reviews.length} ON FILE · COMPLETE` : `${reviews.length} ON FILE · ${3 - reviews.length} more to complete`}
          </span>
        </div>
      )}

      {/* Add review section */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 16px',
        }}>
          Add a review
        </h2>
        <ReviewForm projectId={projectId} books={books} onAdd={handleAdd} />
      </section>

      {/* Review list section */}
      <section>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 16px',
        }}>
          Review bank
        </h2>
        <ReviewList reviews={reviews} onDelete={handleDelete} />
      </section>
    </div>
  )
}
