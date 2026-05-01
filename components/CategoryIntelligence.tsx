'use client'
// components/CategoryIntelligence.tsx
import { useEffect, useState } from 'react'

interface CategoryEntry {
  id: string
  asin: string
  category: string
  rank: number | null
  fetchedAt: string
}

interface Book {
  asin: string
  title: string
  shortTitle: string
  units: number
  kenp: number
  royalties: number
  format?: string
}

const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA']

function getRankBadgeStyle(rank: number | null): React.CSSProperties {
  if (rank == null) return {}
  if (rank <= 100) return { color: '#D97706', fontWeight: 700 }
  if (rank <= 1000) return { color: '#059669', fontWeight: 600 }
  if (rank <= 10000) return { color: '#374151', fontWeight: 600 }
  return { color: '#9CA3AF', fontWeight: 500 }
}

interface Props {
  books: Book[]
  bookColorMap: Record<string, number>
  myBooksList?: any[]
}

export default function CategoryIntelligence({ books, bookColorMap }: Props) {
  const [entriesByAsin, setEntriesByAsin] = useState<Record<string, CategoryEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [fetchingAsin, setFetchingAsin] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/kdp/category-cache')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.data)) {
          const byAsin: Record<string, CategoryEntry[]> = {}
          d.data.forEach((e: CategoryEntry) => {
            const key = e.asin?.trim().toUpperCase()
            if (!key) return
            if (!byAsin[key]) byAsin[key] = []
            byAsin[key].push(e)
          })
          setEntriesByAsin(byAsin)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleFetch(book: Book) {
    if (!book.asin) return
    setFetchingAsin(book.asin)
    setFetchError(null)
    try {
      const res = await fetch('/api/kdp/category-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: book.asin }),
      })
      const d = await res.json()
      if (!res.ok) {
        setFetchError(d.message ?? 'Category lookup failed — try again later')
        return
      }
      if (Array.isArray(d.data) && d.data.length > 0) {
        const key = book.asin.trim().toUpperCase()
        setEntriesByAsin(prev => ({ ...prev, [key]: d.data }))
      }
    } catch {
      setFetchError('Could not reach the category service — try again later')
    } finally {
      setFetchingAsin(null)
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-6 text-center" style={{ color: '#9CA3AF', fontSize: 13 }}>
        Loading category data…
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="px-5 py-6 text-center" style={{ color: '#9CA3AF', fontSize: 13 }}>
        No books in your catalog yet.{' '}
        <a href="/dashboard/settings" style={{ color: '#E9A020' }}>Add books in Settings →</a>
      </div>
    )
  }

  return (
    <div className="p-5">
      {fetchError && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-[12px]"
          style={{ background: 'rgba(249,123,107,0.08)', color: '#92400E', border: '1px solid rgba(249,123,107,0.2)' }}
        >
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {books.map((book, visibleIdx) => {
          const asinKey = book.asin?.trim().toUpperCase() ?? ''
          const colorIdx = bookColorMap[asinKey] ?? visibleIdx
          const color = BOOK_COLORS[colorIdx % BOOK_COLORS.length] ?? '#6B7280'
          const categories = entriesByAsin[asinKey] ?? []
          const isFetching = fetchingAsin === book.asin

          return (
            <div
              key={book.asin || book.shortTitle}
              style={{
                background: 'white',
                border: '1px solid #EEEBE6',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Book header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #EEEBE6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1E2D3D',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {book.shortTitle}
                  </span>
                </div>
                <button
                  onClick={() => handleFetch(book)}
                  disabled={isFetching}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isFetching ? '#9CA3AF' : '#E9A020',
                    background: 'none',
                    border: 'none',
                    cursor: isFetching ? 'default' : 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isFetching ? 'Looking up…' : categories.length > 0 ? 'Refresh →' : 'Fetch ranks →'}
                </button>
              </div>

              {/* Category rows */}
              {categories.length === 0 ? (
                <div
                  style={{
                    padding: '18px 16px',
                    fontSize: 12,
                    color: '#9CA3AF',
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  {isFetching
                    ? 'Fetching from Amazon…'
                    : 'No category data yet — click Fetch ranks to load.'}
                </div>
              ) : (
                categories.map((e, i) => (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 16px',
                      borderTop: '1px solid #F5F5F4',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: '#374151',
                        flex: 1,
                        marginRight: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {e.category}
                    </span>
                    {e.rank != null && (
                      <span
                        style={{
                          fontSize: 14,
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                          ...getRankBadgeStyle(e.rank),
                        }}
                      >
                        #{e.rank.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))
              )}

              {/* Last updated */}
              {categories.length > 0 && (
                <div
                  style={{
                    padding: '6px 16px 10px',
                    fontSize: 10,
                    color: '#9CA3AF',
                    borderTop: '1px solid #F5F5F4',
                  }}
                >
                  Updated{' '}
                  {new Date(categories[0].fetchedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
