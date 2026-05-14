'use client'

import { useRef, useState } from 'react'

interface Quote {
  id: string
  text: string
  selected: boolean
}

interface Props {
  projectId: string
  onQuotesReady: (quotes: Quote[]) => void
  onError: (message?: string) => void
}

const STEPS = [
  'Parsing your manuscript…',
  'Reading the pages…',
  'Finding your best lines…',
  'Almost there…',
]

const SIZE_LIMIT = 50 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ManuscriptUpload({ projectId, onQuotesReady, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number>(0)
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setFilename(file.name)
    setFileSize(file.size)

    if (file.size > SIZE_LIMIT) {
      setError('File too large. Export just the manuscript text without images.')
      return
    }

    setExtracting(true)
    setProgress(0)
    setStepIdx(0)

    let p = 0
    const tick = setInterval(() => {
      p = Math.min(p + 2, 88)
      setProgress(p)
      setStepIdx(Math.floor((p / 88) * (STEPS.length - 1)))
    }, 400)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/content/projects/${projectId}/quotes/extract`, {
        method: 'POST',
        body: formData,
      })

      clearInterval(tick)

      const data = await res.json()

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : undefined
        setError(msg ?? 'Could not extract quotes — try a different format.')
        setExtracting(false)
        onError(msg)
        return
      }

      setProgress(100)
      setStepIdx(STEPS.length - 1)
      setTimeout(() => {
        setExtracting(false)
        onQuotesReady(data?.quotes ?? [])
      }, 400)
    } catch {
      clearInterval(tick)
      setError('Something went wrong — please try again.')
      setExtracting(false)
      onError()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22,
        fontWeight: 700,
        color: 'var(--ink)',
        margin: '0 0 20px',
        letterSpacing: '-0.01em',
      }}>
        <em style={{ fontStyle: 'italic', fontWeight: 400 }}>Your</em> manuscript
      </h2>

      {/* Hidden file input — always in DOM per convention */}
      <input
        ref={inputRef}
        type="file"
        accept=".epub,.txt,.md,.pdf,.docx"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
        onChange={handleChange}
        tabIndex={-1}
      />

      {!filename && !extracting && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `1.5px dashed ${dragging ? 'var(--amber)' : 'var(--rule)'}`,
            borderRadius: 6,
            padding: '40px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(176,122,42,0.04)' : 'var(--paper-2)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--ink-4)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink-2)',
            marginBottom: 6,
          }}>
            Drop your manuscript here, or click to browse
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}>
            EPUB · PDF · DOCX · TXT · MD
          </div>
        </div>
      )}

      {filename && !extracting && !error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--sage)', flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            color: 'var(--ink-2)',
            flex: 1,
          }}>
            {filename}
          </span>
          {fileSize > 0 && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-4)',
            }}>
              {formatSize(fileSize)}
            </span>
          )}
        </div>
      )}

      {extracting && (
        <div style={{ padding: '32px 0' }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-3)',
            fontStyle: 'italic',
            marginBottom: 20,
          }}>
            {STEPS[stepIdx]}
          </div>

          <div style={{
            height: 3,
            background: 'var(--rule)',
            borderRadius: 2,
            overflow: 'hidden',
            maxWidth: 480,
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--amber)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>

          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: 10,
          }}>
            {progress < 100 ? `${progress}%` : 'DONE'}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 10,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          color: 'var(--rose)',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
