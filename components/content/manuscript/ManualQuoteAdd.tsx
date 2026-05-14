'use client'

import { useState } from 'react'

interface Props {
  projectId: string
  onAdd: (quote: { id: string; text: string; selected: boolean }) => void
}

export default function ManualQuoteAdd({ projectId, onAdd }: Props) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const res = await fetch(`/api/content/projects/${projectId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, source: 'manual' }),
      })
      const data = await res.json()
      if (data?.quote) {
        onAdd(data.quote)
        setText('')
      }
    } catch {
      // silent
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--ink)',
        margin: '0 0 14px',
        letterSpacing: '-0.01em',
      }}>
        Add a line manually
      </h3>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste a line from your book…"
        rows={3}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: "'Playfair Display', serif",
          fontSize: 13,
          fontStyle: 'italic',
          color: 'var(--ink)',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: '12px 14px',
          resize: 'vertical',
          outline: 'none',
          lineHeight: 1.6,
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--rule)')}
      />

      <button
        onClick={handleAdd}
        disabled={!text.trim() || adding}
        style={{
          marginTop: 10,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: text.trim() ? 'var(--ink-2)' : 'var(--ink-4)',
          background: 'none',
          border: '1px solid var(--rule)',
          borderRadius: 4,
          padding: '6px 14px',
          cursor: text.trim() ? 'pointer' : 'default',
          opacity: adding ? 0.6 : 1,
          transition: 'color 0.12s, opacity 0.12s',
        }}
      >
        {adding ? 'Adding…' : 'Add to Quote Bank'}
      </button>
    </div>
  )
}
