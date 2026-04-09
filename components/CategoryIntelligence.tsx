'use client'
// components/CategoryIntelligence.tsx
import { useEffect, useState } from 'react'
import BookSelector from '@/components/BookSelector'
import NoBooksEmptyState from '@/components/NoBooksEmptyState'
import { useBooks } from '@/hooks/useBooks'

interface CategoryEntry {
  id: string
  asin: string
  category: string
  rank: number | null
  fetchedAt: string
}

export default function CategoryIntelligence() {
  const { books, loading: booksLoading } = useBooks()
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [entries, setEntries] = useState<CategoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  const selectedBook = books.find(b => b.id === selectedBookId)

  useEffect(() => {
    if (!selectedBook?.asin) {
      setEntries([])
      return
    }
    setLoading(true)
    fetch(`/api/kdp/category-cache?asin=${encodeURIComponent(selectedBook.asin)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.data)) setEntries(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedBook?.asin])

  if (booksLoading) return null

  if (books.length === 0) {
    return (
      <div className="mb-5">
        <NoBooksEmptyState />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: '#fff', border: '0.5px solid #e8e0d8', borderRadius: 12 }}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="text-[13.5px] font-semibold" style={{ color: '#1E2D3D' }}>
          Category Intelligence
        </h3>
        <BookSelector
          value={selectedBookId}
          onChange={setSelectedBookId}
          placeholder="Select a book"
        />
      </div>

      {loading && (
        <div className="text-[12px] text-stone-400 py-2">Loading categories…</div>
      )}

      {!loading && entries.length === 0 && selectedBook && (
        <div className="text-[12px] text-stone-400 py-2">No category data found for this book yet.</div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between text-[12px]">
              <span className="truncate flex-1 mr-3" style={{ color: '#1E2D3D' }}>{e.category}</span>
              {e.rank != null && (
                <span className="font-semibold tabular-nums" style={{ color: '#E9A020' }}>
                  #{e.rank.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
