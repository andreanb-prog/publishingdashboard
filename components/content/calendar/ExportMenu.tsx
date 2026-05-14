'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  projectId: string
}

const FORMATS = [
  { key: 'hootsuite', label: 'Hootsuite' },
  { key: 'buffer', label: 'Buffer' },
  { key: 'later', label: 'Later' },
  { key: 'tailwind', label: 'Tailwind (Pinterest)' },
]

export default function ExportMenu({ projectId }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleExport(format: string) {
    const url = `/api/content/projects/${projectId}/export?format=${format}`
    const a = document.createElement('a')
    a.href = url
    a.download = `storypost-${format}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink)',
          background: 'transparent',
          border: '1px solid var(--rule)',
          borderRadius: 4,
          padding: '7px 14px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ↓ Export
      </button>

      {open && (
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
          minWidth: 160,
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
                fontSize: 13,
                color: 'var(--ink)',
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
