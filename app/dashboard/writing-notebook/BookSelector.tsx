'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Plus, Pencil, Check, X } from 'lucide-react'

interface Book {
  id: string
  title: string
}

interface Props {
  books: Book[]
  selectedBookId: string | null
  onSelectBook: (id: string | null) => void
  onBookCreated: (book: Book) => void
  onBookRenamed: (id: string, newTitle: string) => void
}

export function BookSelector({ books, selectedBookId, onSelectBook, onBookCreated, onBookRenamed }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renameTitle, setRenameTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const selectedBook = books.find(b => b.id === selectedBookId)

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setIsAdding(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus inputs when they appear
  useEffect(() => { if (isAdding) addInputRef.current?.focus() }, [isAdding])
  useEffect(() => { if (isRenaming) renameInputRef.current?.focus() }, [isRenaming])

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim()
    if (!title || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const data = await res.json()
      if (data.book) {
        onBookCreated({ id: data.book.id, title: data.book.title })
        onSelectBook(data.book.id)
      }
      setNewTitle('')
      setIsAdding(false)
      setIsOpen(false)
    } catch {}
    setIsSubmitting(false)
  }, [newTitle, isSubmitting, onBookCreated, onSelectBook])

  const handleRename = useCallback(async () => {
    const title = renameTitle.trim()
    if (!title || !selectedBookId || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/books/${selectedBookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        onBookRenamed(selectedBookId, title)
      }
    } catch {}
    setIsRenaming(false)
    setIsSubmitting(false)
  }, [renameTitle, selectedBookId, isSubmitting, onBookRenamed])

  // Rename mode
  if (isRenaming && selectedBook) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={renameInputRef}
          value={renameTitle}
          onChange={e => setRenameTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setIsRenaming(false)
          }}
          className="px-3 py-1.5 rounded-lg text-sm border outline-none"
          style={{ borderColor: '#E9A020', minWidth: 200, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          placeholder="Book title"
        />
        <button
          onClick={handleRename}
          disabled={!renameTitle.trim() || isSubmitting}
          className="w-7 h-7 rounded-md flex items-center justify-center border-none cursor-pointer"
          style={{ background: '#E9A020', color: '#FFFFFF', opacity: renameTitle.trim() ? 1 : 0.4 }}
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => setIsRenaming(false)}
          className="w-7 h-7 rounded-md flex items-center justify-center border-none cursor-pointer"
          style={{ background: '#F3F4F6', color: '#6B7280' }}
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        {/* Trigger */}
        <button
          onClick={() => { setIsOpen(!isOpen); setIsAdding(false) }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border cursor-pointer bg-white"
          style={{ borderColor: '#E5E7EB', minWidth: 200, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E2D3D' }}
        >
          <span className="flex-1 text-left truncate">
            {selectedBook?.title || 'Select a book...'}
          </span>
          <ChevronDown size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
        </button>

        {/* Rename icon */}
        {selectedBook && (
          <button
            onClick={() => { setRenameTitle(selectedBook.title); setIsRenaming(true) }}
            className="w-7 h-7 rounded-md flex items-center justify-center border-none cursor-pointer transition-colors"
            style={{ background: 'transparent', color: '#9CA3AF' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#E9A020')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
            title="Rename book"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-72 rounded-lg z-20 py-1"
          style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          {books.map(b => (
            <button
              key={b.id}
              onClick={() => { onSelectBook(b.id); setIsOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm border-none cursor-pointer transition-colors block"
              style={{
                background: b.id === selectedBookId ? '#FFF8F0' : 'transparent',
                color: '#1E2D3D',
                fontWeight: b.id === selectedBookId ? 600 : 400,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => { if (b.id !== selectedBookId) e.currentTarget.style.background = '#FFF8F0' }}
              onMouseLeave={e => { if (b.id !== selectedBookId) e.currentTarget.style.background = 'transparent' }}
            >
              {b.id === selectedBookId && <span className="mr-1.5">&#10003;</span>}
              {b.title}
            </button>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: '#EEEBE6', margin: '4px 0' }} />

          {/* Add new book */}
          {isAdding ? (
            <div className="px-3 py-2 flex items-center gap-2">
              <input
                ref={addInputRef}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setIsAdding(false); setNewTitle('') }
                }}
                className="flex-1 px-2.5 py-1.5 rounded-md text-sm border outline-none"
                style={{ borderColor: '#E9A020', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                placeholder="Book title..."
              />
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || isSubmitting}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold border-none cursor-pointer"
                style={{ background: '#E9A020', color: '#FFFFFF', opacity: newTitle.trim() ? 1 : 0.4 }}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full text-left px-3 py-2 text-sm border-none cursor-pointer flex items-center gap-2"
              style={{ background: 'transparent', color: '#E9A020', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={14} />
              Add new book...
            </button>
          )}
        </div>
      )}
    </div>
  )
}
