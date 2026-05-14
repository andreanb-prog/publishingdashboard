'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ManuscriptUpload from './ManuscriptUpload'
import QuoteReviewList from './QuoteReviewList'
import ManualQuoteAdd from './ManualQuoteAdd'

interface Quote {
  id: string
  text: string
  context?: string | null
  selected: boolean
}

interface Props {
  projectId: string
  initialQuotes: Quote[]
}

type Stage = 'upload' | 'review'

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

export default function ManuscriptPage({ projectId, initialQuotes }: Props) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>(initialQuotes.length > 0 ? 'review' : 'upload')
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [extractionError, setExtractionError] = useState(false)

  const handleQuotesReady = useCallback((extracted: Quote[]) => {
    setQuotes(extracted)
    setExtractionError(false)
    setStage('review')
  }, [])

  const handleExtractionError = useCallback((message?: string) => {
    if (message) {
      // error shown inside ManuscriptUpload — stay on upload stage
    } else {
      setExtractionError(true)
      setStage('review')
    }
  }, [])

  const handleToggle = (id: string, selected: boolean) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, selected } : q))
  }

  const handleDelete = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id))
  }

  const handleSelectAll = async () => {
    setQuotes(prev => prev.map(q => ({ ...q, selected: true })))
    await Promise.allSettled(
      quotes.filter(q => !q.selected).map(q =>
        fetch(`/api/content/projects/${projectId}/quotes/${q.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected: true }),
        })
      )
    )
  }

  const handleClearAll = async () => {
    setQuotes(prev => prev.map(q => ({ ...q, selected: false })))
    await Promise.allSettled(
      quotes.filter(q => q.selected).map(q =>
        fetch(`/api/content/projects/${projectId}/quotes/${q.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected: false }),
        })
      )
    )
  }

  const handleManualAdd = (quote: Quote) => {
    setQuotes(prev => [quote, ...prev])
    if (stage === 'upload') setStage('review')
  }

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>
      {/* Step label */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 12,
      }}>
        STEP 02 · MANUSCRIPT & QUOTES
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 36 }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
          }}>
            Find the lines that{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400 }}>stop her.</em>
          </h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-4)',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 520,
          }}>
            Upload your manuscript and we'll surface the 30 most quotable lines — the ones she'll screenshot and send to someone. You review, keep what feels right, cut the rest.
          </p>
        </div>

        {/* Top-right actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 4 }}>
          <a
            href={`/content/${projectId}/reviews`}
            style={ghostBtn}
          >
            Skip for now
          </a>
          <a
            href={`/content/${projectId}/reviews`}
            style={primaryBtn}
          >
            Continue to Reviews →
          </a>
        </div>
      </div>

      {/* Upload section */}
      {stage === 'upload' && (
        <ManuscriptUpload
          projectId={projectId}
          onQuotesReady={handleQuotesReady}
          onError={handleExtractionError}
        />
      )}

      {/* Extraction error banner */}
      {extractionError && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(168,110,94,0.08)',
          border: '1px solid rgba(168,110,94,0.2)',
          borderRadius: 6,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          color: 'var(--rose)',
          marginBottom: 24,
        }}>
          Extraction ran into trouble — add quotes manually below.
        </div>
      )}

      {/* Quote review list */}
      {stage === 'review' && quotes.length > 0 && (
        <QuoteReviewList
          projectId={projectId}
          quotes={quotes}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
        />
      )}

      {/* Upload again link when in review mode */}
      {stage === 'review' && (
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => setStage('upload')}
            style={{
              ...ghostBtn,
              fontSize: 12,
              padding: '5px 12px',
            }}
          >
            ↑ Upload a different manuscript
          </button>
        </div>
      )}

      {/* Manual add — always visible */}
      <ManualQuoteAdd projectId={projectId} onAdd={handleManualAdd} />
    </div>
  )
}
