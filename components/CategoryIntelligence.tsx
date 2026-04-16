'use client'
// components/CategoryIntelligence.tsx
import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import BookSelector from '@/components/BookSelector'
import NoBooksEmptyState from '@/components/NoBooksEmptyState'
import BsrFetchButton from '@/components/bsr/BsrFetchButton'
import { useBooks } from '@/hooks/useBooks'

interface CategoryEntry {
  id: string
  asin: string
  category: string
  rank: number | null
  fetchedAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export default function CategoryIntelligence() {
  const { books, loading: booksLoading } = useBooks()
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [entries, setEntries] = useState<CategoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current BSR — display-only, not saved to BsrLog
  const [currentBsr, setCurrentBsr] = useState<number | null>(null)
  const [bsrFetchedAt, setBsrFetchedAt] = useState<string | null>(null)

  const selectedBook = books.find(b => b.id === selectedBookId)

  // Pre-populate BSR from today's BsrLog on mount/book change (display-only)
  useEffect(() => {
    if (!selectedBook?.asin) {
      setCurrentBsr(null)
      setBsrFetchedAt(null)
      return
    }
    fetch(`/api/books/bsr/history?asin=${encodeURIComponent(selectedBook.asin)}&days=1`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.rows) && d.rows.length > 0) {
          const today = new Date().toISOString().split('T')[0]
          const todayRow = d.rows.find((r: { date: string; rank: number | null }) => r.date === today)
          if (todayRow?.rank != null) {
            setCurrentBsr(todayRow.rank)
            setBsrFetchedAt(null) // pre-populated from DB, not a live fetch
          }
        }
      })
      .catch(() => {})
  }, [selectedBook?.asin])

  // Fetch cached categories
  const fetchCached = useCallback(async (asin: string) => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/kdp/category-cache?asin=${encodeURIComponent(asin)}`)
      const d = await r.json()
      if (Array.isArray(d.data)) setEntries(d.data)
    } catch {
      // silently fail for cache reads
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedBook?.asin) {
      setEntries([])
      setError(null)
      return
    }
    fetchCached(selectedBook.asin)
  }, [selectedBook?.asin, fetchCached])

  // Trigger a fresh BKLNK lookup
  const handleLookup = useCallback(async () => {
    if (!selectedBook?.asin) return
    setLookupLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/kdp/category-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: selectedBook.asin }),
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.message || d.error || 'Category data temporarily unavailable \u2014 try again later')
        return
      }
      if (Array.isArray(d.data)) setEntries(d.data)
    } catch {
      setError('Category data temporarily unavailable \u2014 try again later')
    } finally {
      setLookupLoading(false)
    }
  }, [selectedBook?.asin])

  if (booksLoading) return null

  if (books.length === 0) {
    return (
      <div className="mb-5">
        <NoBooksEmptyState />
      </div>
    )
  }

  const showEmpty = !loading && !lookupLoading && entries.length === 0 && selectedBook && !error
  const isRefreshing = lookupLoading

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: '#fff', border: '0.5px solid #e8e0d8', borderRadius: 12 }}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="text-[13.5px] font-semibold" style={{ color: '#1E2D3D' }}>
          Category Intelligence
        </h3>
        <div className="flex items-center gap-2">
          {entries.length > 0 && selectedBook?.asin && (
            <button
              onClick={handleLookup}
              disabled={isRefreshing}
              title="Refresh categories"
              className="flex items-center justify-center rounded-md transition-colors"
              style={{
                width: 28,
                height: 28,
                color: isRefreshing ? '#D1D5DB' : '#9CA3AF',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw
                size={14}
                strokeWidth={2}
                className={isRefreshing ? 'animate-spin' : ''}
              />
            </button>
          )}
          <BookSelector
            value={selectedBookId}
            onChange={setSelectedBookId}
            placeholder="Select a book"
          />
        </div>
      </div>

      {/* ── Current BSR row ───────────────────────────────────────────────── */}
      {selectedBook?.asin && (
        <div
          className="flex flex-wrap items-center gap-3 mb-4 px-3 py-2.5 rounded-lg"
          style={{ background: '#FFF8F0', border: '0.5px solid #EEEBE6' }}
        >
          <BsrFetchButton
            asin={selectedBook.asin}
            size="sm"
            onResult={rank => {
              setCurrentBsr(rank)
              setBsrFetchedAt(new Date().toISOString())
            }}
          />
          <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
            {currentBsr != null ? (
              <>Current BSR: <span style={{ color: '#E9A020' }}>#{currentBsr.toLocaleString()}</span></>
            ) : (
              <span style={{ color: '#9CA3AF' }}>Current BSR: —</span>
            )}
          </span>
          {bsrFetchedAt && (
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
              Last checked: {timeAgo(bsrFetchedAt)}
            </span>
          )}
        </div>
      )}

      {/* Loading state */}
      {(loading || lookupLoading) && (
        <div className="text-[12px] text-stone-400 py-2">
          {lookupLoading ? 'Looking up categories\u2026' : 'Loading categories\u2026'}
        </div>
      )}

      {/* Error state */}
      {!loading && !lookupLoading && error && (
        <div className="text-[12px] py-2" style={{ color: '#E9A020' }}>
          {error}
        </div>
      )}

      {/* Empty state with lookup button */}
      {showEmpty && (
        <div
          className="flex flex-col items-center justify-center gap-2.5 py-8"
          style={{
            background: '#FFF8F0',
            border: '0.5px dashed #e0d8d0',
            borderRadius: 10,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px dashed #D1D5DB',
              color: '#D1D5DB',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            &#9675;
          </div>
          <div className="text-[13px]" style={{ color: '#9CA3AF' }}>
            No category data yet
          </div>
          {selectedBook?.asin ? (
            <button
              onClick={handleLookup}
              className="text-[13px] font-medium hover:underline"
              style={{ color: '#E9A020', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Look up categories &rarr;
            </button>
          ) : (
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
              Add an ASIN in{' '}
              <a
                href="/dashboard/settings#my-books"
                className="font-medium hover:underline"
                style={{ color: '#E9A020' }}
              >
                Settings
              </a>{' '}
              to look up categories
            </span>
          )}
        </div>
      )}

      {/* Category list */}
      {!loading && !lookupLoading && entries.length > 0 && (
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
          <div className="text-[10px] pt-1" style={{ color: '#D1D5DB' }}>
            Last updated {new Date(entries[0]?.fetchedAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  )
}
