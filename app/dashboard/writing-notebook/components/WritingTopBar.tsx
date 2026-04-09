'use client'
import Link from 'next/link'
import { Download, Plus } from 'lucide-react'
import { BookTitleDropdown } from './BookTitleDropdown'
import { SaveStatusIndicator } from './SaveStatusIndicator'

type SaveState = 'idle' | 'saving' | 'saved'

interface Book {
  id: string
  title: string
  sortOrder?: number
}

interface Props {
  books: Book[]
  selectedBookId: string | null
  onSelectBook: (id: string) => void
  onAddBook: () => void
  onAddChapter: () => void
  onExport: () => void
  wordCount: number
  saveState: SaveState
  lastSavedAt: number | null
  chapterCounts: Record<string, number>
  wordCounts: Record<string, number>
}

export function WritingTopBar({
  books, selectedBookId, onSelectBook, onAddBook, onAddChapter, onExport,
  wordCount, saveState, lastSavedAt, chapterCounts, wordCounts,
}: Props) {
  return (
    <div
      className="flex items-center h-[48px] px-4 flex-shrink-0"
      style={{ borderBottom: '1px solid #EEEBE6', background: '#FFFFFF' }}
    >
      {/* Left zone */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link
          href="/dashboard"
          className="text-[12px] no-underline flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: '#9CA3AF' }}
        >
          &larr; Dashboard
        </Link>
        <span className="text-[12px] flex-shrink-0" style={{ color: '#E5E7EB' }}>|</span>
        <BookTitleDropdown
          books={books}
          selectedBookId={selectedBookId}
          onSelectBook={onSelectBook}
          onAddBook={onAddBook}
          chapterCounts={chapterCounts}
          wordCounts={wordCounts}
        />
      </div>

      {/* Center zone */}
      <div className="flex-shrink-0">
        <SaveStatusIndicator saveState={saveState} lastSavedAt={lastSavedAt} />
      </div>

      {/* Right zone */}
      <div className="flex items-center gap-2.5 flex-1 justify-end">
        <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
          {wordCount.toLocaleString()} words
        </span>
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-transparent border-none cursor-pointer transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F4')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <Download size={13} />
          Export
        </button>
        <button
          onClick={onAddChapter}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer"
          style={{ background: '#E9A020', color: '#FFFFFF' }}
        >
          <Plus size={13} />
          Chapter
        </button>
      </div>
    </div>
  )
}
