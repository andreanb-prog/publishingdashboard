'use client'

import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'

interface Props {
  projectId: string
}

const FORMATS = [
  { key: 'hootsuite', label: 'Hootsuite', desc: 'One row per post, all platforms' },
  { key: 'later',     label: 'Later',     desc: 'One row per platform, with media URL' },
  { key: 'tailwind',  label: 'Tailwind',  desc: 'Pinterest only, board-ready' },
  { key: 'buffer',    label: 'Buffer',    desc: 'One row per platform, profile names' },
]

export default function ExportMenu({ projectId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchCSV(format: string): Promise<string> {
    const res = await fetch(`/api/content/projects/${projectId}/export?format=${format}`)
    return res.text()
  }

  function triggerDownload(content: string | Blob, filename: string) {
    const url = typeof content === 'string'
      ? URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
      : URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleExport(format: string) {
    setLoading(format)
    try {
      const csv = await fetchCSV(format)
      triggerDownload(csv, `storypost-${format}.csv`)
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  async function handleZip() {
    setLoading('zip')
    try {
      const zip = new JSZip()
      await Promise.all(
        FORMATS.map(async fmt => {
          const csv = await fetchCSV(fmt.key)
          zip.file(`storypost-${fmt.key}.csv`, csv)
        })
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const today = new Date().toISOString().slice(0, 10)
      triggerDownload(blob, `storypost-export-${today}.zip`)
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const isLoading = loading !== null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isLoading}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink)',
          background: 'transparent',
          border: '1px solid var(--rule)',
          borderRadius: 4,
          padding: '7px 14px',
          cursor: isLoading ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Preparing your CSV…' : '↓ Export'}
      </button>

      {open && !isLoading && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          background: 'white',
          border: '1px solid var(--rule)',
          borderRadius: 4,
          boxShadow: '0 4px 16px rgba(20,33,61,0.12)',
          overflow: 'hidden',
          zIndex: 100,
          minWidth: 240,
        }}>
          {FORMATS.map(fmt => (
            <button
              key={fmt.key}
              onClick={() => handleExport(fmt.key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: 'none',
                border: 'none',
                borderBottom: '0.5px solid var(--rule)',
                padding: '10px 16px',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{fmt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{fmt.desc}</div>
            </button>
          ))}
          <button
            onClick={handleZip}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: 'none',
              border: 'none',
              padding: '10px 16px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>All formats (zip)</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Download all four CSVs as a zip</div>
          </button>
        </div>
      )}
    </div>
  )
}
