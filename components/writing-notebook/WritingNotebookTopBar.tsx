'use client'
// components/writing-notebook/WritingNotebookTopBar.tsx
import Link from 'next/link'
import { ChevronLeft, Sparkles, X, ChevronDown, Plus } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

type Book = { id: string; title: string; coverUrl?: string | null }

interface Props {
  books: Book[]
  selectedBookId: string
  onBookChange: (id: string) => void
  isChatOpen: boolean
  onToggleChat: () => void
}

export function WritingNotebookTopBar({ books, selectedBookId, onBookChange, isChatOpen, onToggleChat }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedBook = books.find(b => b.id === selectedBookId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div
      className="h-12 flex items-center px-6 shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}
    >
      {/* Left — back */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
        style={{ color: '#6B7280' }}
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Back to Dashboard</span>
      </Link>

      {/* Center — book selector */}
      <div className="flex-1 flex justify-center" ref={ref}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium" style={{ color: '#1E2D3D' }}>
            {selectedBook?.title ?? 'Select a book'}
          </span>
          <ChevronDown size={14} style={{ color: '#6B7280' }} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute top-12 left-1/2 -translate-x-1/2 rounded-lg shadow-lg z-50 py-1 min-w-56"
            style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB' }}
          >
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => { onBookChange(book.id); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                style={{ color: book.id === selectedBookId ? '#E9A020' : '#1E2D3D' }}
              >
                {book.title}
              </button>
            ))}
            <div style={{ borderTop: '1px solid #E5E7EB' }} className="mt-1 pt-1">
              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50"
                style={{ color: '#E9A020' }}
              >
                <Plus size={14} />
                Add New Book
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Right — AI Chat toggle */}
      <button
        onClick={onToggleChat}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
        style={{
          border: isChatOpen ? 'none' : '1.5px solid #E9A020',
          color: isChatOpen ? '#6B7280' : '#E9A020',
          background: isChatOpen ? '#F3F4F6' : 'transparent',
        }}
      >
        {isChatOpen ? <X size={14} /> : <Sparkles size={14} />}
        {isChatOpen ? 'Close Chat' : 'AI Chat'}
      </button>
    </div>
  )
}
