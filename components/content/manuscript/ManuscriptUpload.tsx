'use client'

import { useRef, useState } from 'react'

interface Props {
  onTextReady: (text: string, filename: string) => void
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const NAV_RE = /^(toc|nav|ncx|content\.opf|package\.opf)/i
const CONTENT_EXT = /\.(html|xhtml|htm)$/i

async function parseEpub(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(file)

  const contentFiles = Object.keys(zip.files).filter(name => {
    const base = name.split('/').pop() ?? ''
    return CONTENT_EXT.test(name) && !NAV_RE.test(base)
  })

  const chunks: string[] = []
  for (const name of contentFiles) {
    const html = await zip.files[name].async('string')
    chunks.push(stripHtml(html))
  }

  return chunks.join('\n\n')
}

export default function ManuscriptUpload({ onTextReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setFilename(file.name)
    setParsing(true)

    try {
      let text = ''
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'epub') {
        text = await parseEpub(file)
      } else {
        text = await file.text()
      }

      if (!text.trim()) {
        setError('File appears empty — try a different format.')
        setParsing(false)
        return
      }

      onTextReady(text, file.name)
    } catch {
      setError('Could not read file — try .txt or .md instead.')
      setParsing(false)
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

  const wordCount = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()

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
        accept=".epub,.txt,.md"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
        onChange={handleChange}
        tabIndex={-1}
      />

      {!filename && (
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
            EPUB · TXT · MD
          </div>
        </div>
      )}

      {filename && !parsing && (
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
        </div>
      )}

      {parsing && (
        <div style={{
          padding: '14px 16px',
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          color: 'var(--ink-4)',
          fontStyle: 'italic',
        }}>
          Reading {filename}…
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
