'use client'
// components/writing-notebook/WritingNotebookTopBar.tsx
import Link from 'next/link'
import { ChevronLeft, Sparkles, X } from 'lucide-react'
import BookSelector from '@/components/BookSelector'

interface Props {
  selectedBookId: string
  onBookChange: (id: string) => void
  isChatOpen: boolean
  onToggleChat: () => void
}

export function WritingNotebookTopBar({ selectedBookId, onBookChange, isChatOpen, onToggleChat }: Props) {
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
      <div className="flex-1 flex justify-center">
        <BookSelector
          value={selectedBookId || null}
          onChange={onBookChange}
          placeholder="Select a book"
        />
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
