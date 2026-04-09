'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'

const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA', '#F472B6']

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
  chapterCounts: Record<string, number>
  wordCounts: Record<string, number>
}

export function BookTitleDropdown({ books, selectedBookId, onSelectBook, onAddBook, chapterCounts, wordCounts }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = books.find(b => b.id === selectedBookId)
  const selectedIdx = books.findIndex(b => b.id === selectedBookId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-transparent border-none cursor-pointer transition-colors"
        style={{ color: '#1E2D3D' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: BOOK_COLORS[selectedIdx % BOOK_COLORS.length] || '#6B7280' }}
        />
        <span className="text-[14px] font-medium truncate max-w-[200px]" style={{ color: '#1E2D3D' }}>
          {selected?.title || 'Select a book'}
        </span>
        <ChevronDown
          size={14}
          className="transition-transform duration-200"
          style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 rounded-[10px] shadow-lg z-[100] overflow-hidden"
          style={{ background: '#FFFFFF', border: '0.5px solid #EEEBE6', width: 240 }}
        >
          <div className="px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: '#9CA3AF' }}>
              Your books
            </span>
          </div>
          <div className="py-1 max-h-[280px] overflow-y-auto">
            {books.map((b, i) => {
              const isActive = b.id === selectedBookId
              const chapters = chapterCounts[b.id] ?? 0
              const words = wordCounts[b.id] ?? 0
              return (
                <button
                  key={b.id}
                  onClick={() => { onSelectBook(b.id); setOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-none cursor-pointer text-left transition-colors"
                  style={{ background: isActive ? '#FFF3E0' : undefined }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#FAFAF9' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: BOOK_COLORS[i % BOOK_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: '#1E2D3D' }}>
                      {b.title}
                    </div>
                    <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
                      B{i + 1} · {chapters} chapter{chapters !== 1 ? 's' : ''} · {words.toLocaleString()} words
                    </div>
                  </div>
                  {isActive && <Check size={14} style={{ color: '#E9A020' }} />}
                </button>
              )
            })}
          </div>
          <div style={{ borderTop: '0.5px solid #EEEBE6' }}>
            <button
              onClick={() => { onAddBook(); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 bg-transparent border-none cursor-pointer"
              style={{ color: '#E9A020' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <Plus size={14} />
              <span className="text-[13px] font-medium">New book</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
