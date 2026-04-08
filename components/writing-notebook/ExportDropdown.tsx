'use client'
// components/writing-notebook/ExportDropdown.tsx
import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Copy, BookOpen } from 'lucide-react'

interface Props {
  bookId: string
  drawerToggle: 'drafts' | 'final'
}

export function ExportDropdown({ bookId, drawerToggle }: Props) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function exportFile(type: 'manuscript' | 'notes', format: 'docx' | 'text') {
    setOpen(false)
    const res = await fetch('/api/writing-notebook/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        type,
        format,
        source: drawerToggle === 'final' ? 'final' : 'drafts',
      }),
    })

    if (format === 'text') {
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setToast('Copied \u2014 paste into a new Google Doc')
      setTimeout(() => setToast(''), 3000)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const disposition = res.headers.get('content-disposition') ?? ''
    const match = disposition.match(/filename="(.+?)"/)
    a.download = match?.[1] ?? 'export.docx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        style={{ color: '#6B7280' }}
      >
        <Download size={14} />
        Export
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 rounded-lg shadow-md p-2 min-w-52 z-50"
          style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB' }}
        >
          <button
            onClick={() => exportFile('manuscript', 'docx')}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
            style={{ color: '#1E2D3D' }}
          >
            <FileText size={14} style={{ color: '#6B7280' }} />
            Download as Word (.docx)
          </button>
          <button
            onClick={() => exportFile('manuscript', 'text')}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
            style={{ color: '#1E2D3D' }}
          >
            <div className="flex items-center gap-2">
              <Copy size={14} style={{ color: '#6B7280' }} />
              Copy text for Google Docs
            </div>
            <p className="text-[11px] italic mt-0.5 ml-6" style={{ color: '#9CA3AF' }}>
              Open docs.google.com, create a new doc, and paste.
            </p>
          </button>
          <button
            onClick={() => exportFile('notes', 'docx')}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
            style={{ color: '#1E2D3D' }}
          >
            <BookOpen size={14} style={{ color: '#6B7280' }} />
            Export outline & notes (.docx)
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 transition-opacity"
          style={{ background: '#6EBF8B', color: '#FFFFFF' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
