'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'
import type { BookRecord } from '@/hooks/useBooks'

interface Props {
  books: BookRecord[]
  selectedBookId: string
  onBookChange: (id: string) => void
  onNewBook?: () => void
}

export function BookDropdown({ books, selectedBookId, onBookChange, onNewBook }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = books.find(b => b.id === selectedBookId)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors"
        style={{ background: open ? '#F7F1E6' : 'transparent' }}
      >
        {selected && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: selected.color }}
          />
        )}
        <span className="text-[14px] font-medium leading-none" style={{ color: '#1E2D3D' }}>
          {selected?.title ?? 'Select book'}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: '#9CA3AF',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 z-[100] py-1.5"
          style={{
            width: 240,
            background: '#FFFFFF',
            border: '0.5px solid #E5E7EB',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <p
            className="px-3 pt-0.5 pb-1.5 text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: '#9CA3AF' }}
          >
            Your books
          </p>

          {books.map((b, i) => (
            <button
              key={b.id}
              onClick={() => { onBookChange(b.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: b.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: '#1E2D3D' }}>
                  {b.title}
                </p>
                <p className="text-[11px]" style={{ color: '#9CA3AF' }}>B{b.position}</p>
              </div>
              {b.id === selectedBookId && (
                <Check size={13} style={{ color: '#6EBF8B', flexShrink: 0 }} />
              )}
            </button>
          ))}

          <div className="mx-2 my-1" style={{ borderTop: '0.5px solid #E5E7EB' }} />

          <button
            onClick={() => { onNewBook?.(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 transition-colors"
          >
            <Plus size={13} style={{ color: '#D97706' }} />
            <span className="text-[13px] font-medium" style={{ color: '#D97706' }}>
              New book
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
