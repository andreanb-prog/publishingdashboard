'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'

interface Props {
  value: string | null
  onChange: (bookId: string) => void
  placeholder?: string
}

export default function BookSelector({ value, onChange, placeholder = 'Select a book' }: Props) {
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
        className="rounded-lg px-3 py-2 text-[12.5px]"
        style={{ background: '#FFF8F0', border: '0.5px dashed #e0d8d0', color: '#9CA3AF' }}
      >
        <Link
          href="/dashboard/settings#my-books"
          className="hover:underline"
          style={{ color: '#E9A020' }}
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        style={{ border: '0.5px solid #e8e0d8', background: '#fff', minWidth: 180 }}
      >
        {selected && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: selected.color }}
          />
        )}
        <span className="flex-1 text-left text-[13px] truncate" style={{ color: '#1E2D3D' }}>
          {selected?.title ?? placeholder}
        </span>
        <ChevronDown size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 rounded-lg shadow-lg z-50 py-1 min-w-full"
          style={{ background: '#fff', border: '0.5px solid #e8e0d8', minWidth: 200 }}
        >
          {books.map(book => (
            <button
              key={book.id}
              onClick={() => { onChange(book.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#FFF8F0] transition-colors flex items-center gap-2"
              style={{ color: book.id === value ? '#E9A020' : '#1E2D3D' }}
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
