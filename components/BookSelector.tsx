'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'

interface Props {
  value: string | null
  onChange: (bookId: string) => void
  placeholder?: string
  /** Override the displayed title — use when the parent already has the title and
   *  wants to avoid relying on BookSelector's internal useBooks() lookup. */
  displayTitle?: string
}

export default function BookSelector({ value, onChange, placeholder = 'Select a book', displayTitle }: Props) {
  const { books, loading } = useBooks()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Auto-select first book if only one exists or nothing selected
  useEffect(() => {
    if (!loading && books.length > 0 && !value) {
      onChange(books[0].id)
    }
  }, [loading, books, value, onChange])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!loading && books.length === 0) {
    return (
      <div
        className="px-3 py-2 text-[12.5px]"
        style={{ borderRadius: 2, background: '#F7F1E6', border: '1px dashed #E8E1D3', color: '#9CA3AF' }}
      >
        <Link
          href="/dashboard/settings#my-books"
          className="hover:underline"
          style={{ color: '#D97706' }}
        >
          Add your books in Settings to get started
        </Link>
      </div>
    )
  }

  const selected = books.find(b => b.id === value)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 transition-colors"
        style={{ borderRadius: 2, border: '1px solid #E8E1D3', background: '#fff', minWidth: 180 }}
      >
        {selected && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: selected.color }}
          />
        )}
        <span className="flex-1 text-left text-[13px] truncate" style={{ color: '#1E2D3D' }}>
          {displayTitle ?? selected?.title ?? placeholder}
        </span>
        <ChevronDown size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-50 py-1 min-w-full"
          style={{ borderRadius: 0, background: '#fff', border: '1px solid #E8E1D3', minWidth: 200 }}
        >
          {books.map(book => (
            <button
              key={book.id}
              onClick={() => { onChange(book.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#F7F1E6] transition-colors flex items-center gap-2"
              style={{ color: book.id === value ? '#D97706' : '#1E2D3D' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: book.color }}
              />
              {book.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
