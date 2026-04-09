'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Plus, Upload } from 'lucide-react'
import { BookDropdown } from './BookDropdown'
import { ExportDropdown } from './ExportDropdown'
import type { BookRecord } from '@/hooks/useBooks'

interface Props {
  books: BookRecord[]
  selectedBookId: string
  onBookChange: (id: string) => void
  onNewBook?: () => void
  wordCount: number
  saving: Record<string, boolean>
  lastSavedAt: Date | null
  bookId: string
  onAddChapter: () => void
  onFileImport?: (file: File) => void
}

// ── Save status indicator ──────────────────────────────────────────────────

function formatSavedAgo(savedAt: Date): string {
  const secs = Math.floor((Date.now() - savedAt.getTime()) / 1000)
  if (secs < 30) return 'Saved just now'
  if (secs < 90) return 'Saved 30s ago'
  const mins = Math.floor(secs / 60)
  if (mins < 2) return 'Saved 1 min ago'
  return `Saved ${mins} mins ago`
}

function SaveStatusIndicator({
  saving, lastSavedAt,
}: {
  saving: Record<string, boolean>
  lastSavedAt: Date | null
}) {
  const [label, setLabel] = useState('Saved just now')
  const isAnySaving = Object.values(saving).some(Boolean)

  // Tick every 5s while in "saved" state
  useEffect(() => {
    if (isAnySaving || !lastSavedAt) return
    setLabel(formatSavedAgo(lastSavedAt))
    const interval = setInterval(() => {
      setLabel(formatSavedAgo(lastSavedAt))
    }, 5000)
    return () => clearInterval(interval)
  }, [isAnySaving, lastSavedAt])

  if (!lastSavedAt && !isAnySaving) return null

  return (
    <div className="flex items-center gap-1.5">
      {isAnySaving ? (
        <>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#E9A020' }}
          />
          <span className="text-[12px] font-medium" style={{ color: '#E9A020' }}>
            Saving…
          </span>
        </>
      ) : (
        <>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#6EBF8B' }}
          />
          <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
            {label}
          </span>
        </>
      )}
    </div>
  )
}

// ── Top bar ────────────────────────────────────────────────────────────────

export function WritingNotebookTopBar({
  books, selectedBookId, onBookChange, onNewBook,
  wordCount, saving, lastSavedAt,
  bookId, onAddChapter, onFileImport,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && onFileImport) onFileImport(file)
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="h-12 flex items-center px-4 shrink-0 gap-4"
      style={{ background: '#FFFFFF', borderBottom: '0.5px solid #E5E7EB' }}
    >
      {/* Hidden file input — always in DOM */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* ── Left ─────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0" style={{ flex: '0 0 auto' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 transition-opacity hover:opacity-70 shrink-0"
          style={{ color: '#9CA3AF', fontSize: 12 }}
        >
          <ChevronLeft size={14} />
          Dashboard
        </Link>

        <div className="w-px h-4 shrink-0" style={{ background: '#E5E7EB' }} />

        <BookDropdown
          books={books}
          selectedBookId={selectedBookId}
          onBookChange={onBookChange}
          onNewBook={onNewBook}
        />
      </div>

      {/* ── Center ───────────────────────────── */}
      <div className="flex-1 flex justify-center">
        <SaveStatusIndicator saving={saving} lastSavedAt={lastSavedAt} />
      </div>

      {/* ── Right ────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {wordCount > 0 && (
          <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
            {wordCount.toLocaleString()} words
          </span>
        )}

        {/* Import button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:opacity-80"
          style={{ color: '#6B7280', border: '0.5px solid #E5E7EB' }}
        >
          <Upload size={13} />
          Import
        </button>

        <ExportDropdown bookId={bookId} drawerToggle="drafts" />

        <button
          onClick={onAddChapter}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
          style={{ background: '#E9A020', color: '#FFFFFF' }}
        >
          <Plus size={13} />
          Chapter
        </button>
      </div>
    </div>
  )
}
