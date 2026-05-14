'use client'

import { useState } from 'react'

interface Book {
  id: string
  title: string
}

interface Props {
  projectId: string
  books: Book[]
  onAdd: (review: { id: string; text: string; reviewer: string | null; bookTitle: string | null }) => void
}

const inputStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  color: 'var(--ink)',
  background: 'var(--paper-2)',
  border: '1px solid var(--rule)',
  borderRadius: 4,
  padding: '9px 12px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

export default function ReviewForm({ projectId, books, onAdd }: Props) {
  const [text, setText] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [bookId, setBookId] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedBook = books.find(b => b.id === bookId)

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const res = await fetch(`/api/content/projects/${projectId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          reviewer: reviewer.trim() || null,
          bookTitle: selectedBook?.title ?? null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const { review } = await res.json()
      onAdd(review)
      setText('')
      setReviewer('')
      setBookId('')
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder='"I stayed up until 3am and I regret nothing…"'
        style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input
          type="text"
          value={reviewer}
          onChange={e => setReviewer(e.target.value)}
          placeholder="Sarah M. · Goodreads"
          style={inputStyle}
        />
        <select
          value={bookId}
          onChange={e => setBookId(e.target.value)}
          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
        >
          <option value="">All books</option>
          {books.map(b => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--paper)',
          background: loading || !text.trim() ? 'var(--ink-3)' : 'var(--ink)',
          border: 'none',
          borderRadius: 4,
          padding: '10px 18px',
          cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
          width: '100%',
          transition: 'background 0.12s',
        }}
      >
        {loading ? 'Adding…' : 'Add to Review Bank'}
      </button>
    </div>
  )
}
