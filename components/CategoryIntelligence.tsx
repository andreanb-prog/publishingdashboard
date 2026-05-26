'use client'
// components/CategoryIntelligence.tsx
import { useEffect, useState } from 'react'
import BookSelector from '@/components/BookSelector'
import { useBooks } from '@/hooks/useBooks'

interface CategoryEntry {
  id: string
  asin: string
  category: string
  rank: number | null
  fetchedAt: string
}

export default function CategoryIntelligence({ bookAsin }: { bookAsin?: string }) {
  const { books, loading: booksLoading } = useBooks()
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [entries, setEntries] = useState<CategoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null
  const asin = bookAsin ?? selectedBook?.asin ?? null

  useEffect(() => {
    if (!asin) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/kdp/category-cache?asin=${encodeURIComponent(asin)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.data)) setEntries(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [asin])

  // Dedup: keep the entry with the best (lowest) rank per category name
  const deduped = (() => {
    const map = new Map<string, CategoryEntry>()
    for (const e of entries) {
      const existing = map.get(e.category)
      if (!existing) {
        map.set(e.category, e)
      } else {
        const existingRank = existing.rank ?? Infinity
        const newRank = e.rank ?? Infinity
        if (newRank < existingRank) map.set(e.category, e)
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
  })()

  // Don't render at all while books list is still loading (avoids flash of empty selector)
  if (booksLoading) return null

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8E1D3',
      marginBottom: 20,
    }}>
      {/* Book selector — only when parent hasn't pinned a specific ASIN */}
      {!bookAsin && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E8E1D3' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#6B7280',
            marginBottom: 8,
          }}>
            Book
          </div>
          <BookSelector value={selectedBookId} onChange={setSelectedBookId} />
        </div>
      )}

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: '#6B7280',
        padding: '12px 16px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>Category Rankings</span>
        {selectedBook && (
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            textTransform: 'none',
            letterSpacing: 'normal',
            color: '#9CA3AF',
          }}>
            · {selectedBook.title}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '16px', color: '#9CA3AF', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
          Loading…
        </div>
      ) : deduped.length === 0 ? (
        <div style={{ padding: '16px', color: '#9CA3AF', fontSize: 12, fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>
          {asin ? 'No category data for this book yet.' : 'Select a book to see category rankings.'}
        </div>
      ) : (
        deduped.map((e, i) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderTop: i === 0 ? '1px solid #E8E1D3' : '1px solid #EEEBE6',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: '#1E2D3D',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: 12,
            }}>
              {e.category}
            </span>
            {e.rank != null && (
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 16,
                fontWeight: 600,
                color: '#D97706',
                flexShrink: 0,
                tabularNums: true,
              } as React.CSSProperties}>
                #{e.rank.toLocaleString()}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  )
}
