'use client'
// components/BsrTracker.tsx
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import BookSelector from '@/components/BookSelector'
import { useBooks } from '@/hooks/useBooks'

interface Subcategory {
  rank: number
  category: string
}

interface BsrResult {
  rank: number
  subcategories: Subcategory[]
  fetchedAt: string
}

interface BsrLogEntry {
  id: string
  asin: string
  bookTitle: string | null
  rank: number
  fetchedAt: string
}

type FetchState = 'idle' | 'loading' | 'success' | 'blocked' | 'timeout' | 'no_asin' | 'parse_fail' | 'rate_limited'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function RankChange({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return <span className="text-stone-400 text-[12px]">—</span>
  const diff = previous - current // positive = rank improved (lower number is better)
  if (diff === 0) return <span className="text-stone-400 text-[12px]">—</span>
  return (
    <span
      className="text-[12px] font-semibold"
      style={{ color: diff > 0 ? '#6EBF8B' : '#F97B6B' }}
    >
      {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toLocaleString()}
    </span>
  )
}

export default function BsrTracker() {
  const { books, loading: booksLoading } = useBooks()
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)

  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [bsrResult, setBsrResult] = useState<BsrResult | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)

  const [rankInput, setRankInput] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [logConfirmed, setLogConfirmed] = useState(false)

  const [history, setHistory] = useState<BsrLogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null

  // Load history whenever the selected book changes
  const loadHistory = useCallback(async (asin: string) => {
    setHistoryLoading(true)
    try {
      const r = await fetch(`/api/books/bsr?asin=${encodeURIComponent(asin)}&history=true`)
      const d = await r.json()
      if (Array.isArray(d.logs)) setHistory(d.logs)
      else setHistory([])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedBook?.asin) {
      setHistory([])
      setBsrResult(null)
      setFetchState('idle')
      setLastFetchedAt(null)
      return
    }
    loadHistory(selectedBook.asin)
  }, [selectedBook?.asin, loadHistory])

  // Pre-fill rank input from fetch result
  useEffect(() => {
    if (bsrResult) setRankInput(String(bsrResult.rank))
  }, [bsrResult])

  async function handleRefresh() {
    if (!selectedBook?.asin) {
      setFetchState('no_asin')
      return
    }
    setFetchState('loading')
    setBsrResult(null)
    try {
      const r = await fetch(`/api/books/bsr?asin=${encodeURIComponent(selectedBook.asin)}`)
      const d = await r.json()

      if (r.status === 429 || d.error === 'rate_limited') {
        setFetchState('rate_limited')
        return
      }
      if (d.error === 'blocked') { setFetchState('blocked'); return }
      if (d.error === 'timeout') { setFetchState('timeout'); return }
      if (d.error === 'no_asin') { setFetchState('no_asin'); return }
      if (d.error === 'parse_fail' || d.error) { setFetchState('parse_fail'); return }

      setBsrResult({ rank: d.rank, subcategories: d.subcategories ?? [], fetchedAt: d.fetchedAt })
      setLastFetchedAt(d.fetchedAt)
      setFetchState('success')
      setLogConfirmed(false)
    } catch {
      setFetchState('parse_fail')
    }
  }

  async function handleLogRank() {
    if (!selectedBook?.asin) return
    const rankNum = parseInt(rankInput)
    if (isNaN(rankNum) || rankNum < 1) return

    setLogSaving(true)
    try {
      const r = await fetch('/api/books/bsr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: selectedBook.asin, bookTitle: selectedBook.title, rank: rankNum }),
      })
      const d = await r.json()
      if (d.success) {
        setLogConfirmed(true)
        setTimeout(() => setLogConfirmed(false), 3500)
        // Refresh history
        await loadHistory(selectedBook.asin)
      }
    } finally {
      setLogSaving(false)
    }
  }

  if (booksLoading) {
    return (
      <div className="p-5">
        <div className="animate-pulse rounded-lg h-16" style={{ background: '#F3F0EB' }} />
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      {/* ── Input row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div style={{ minWidth: 220, maxWidth: 320, flex: '1 1 220px' }}>
          <BookSelector value={selectedBookId} onChange={setSelectedBookId} />
        </div>

        <button
          onClick={handleRefresh}
          disabled={fetchState === 'loading'}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
          style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {fetchState === 'loading' ? (
            <>
              <span
                className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin"
                style={{ borderColor: '#1E2D3D', borderTopColor: 'transparent' }}
              />
              Fetching…
            </>
          ) : (
            'Refresh Rank →'
          )}
        </button>

        <span className="text-[12px] ml-auto" style={{ color: '#9CA3AF' }}>
          {lastFetchedAt ? `Last fetched: ${timeAgo(lastFetchedAt)}` : 'Last fetched: never'}
        </span>
      </div>

      {/* ── Error states ── */}
      {fetchState === 'blocked' && (
        <div
          className="rounded-lg px-4 py-3 text-[13px]"
          style={{ background: '#FFF8F0', border: '1px solid #E9A020', color: '#92400e' }}
        >
          Amazon blocked the auto-fetch — enter your rank manually below.
        </div>
      )}
      {fetchState === 'timeout' && (
        <div
          className="rounded-lg px-4 py-3 text-[13px]"
          style={{ background: '#FFF8F0', border: '1px solid #E9A020', color: '#92400e' }}
        >
          Took too long — try again or enter manually.
        </div>
      )}
      {fetchState === 'no_asin' && (
        <div
          className="rounded-lg px-4 py-3 text-[13px]"
          style={{ background: '#FFF8F0', border: '1px solid #E9A020', color: '#92400e' }}
        >
          Add your ASIN in{' '}
          <Link href="/dashboard/settings#my-books" className="font-semibold underline" style={{ color: '#E9A020' }}>
            Settings
          </Link>{' '}
          first.
        </div>
      )}
      {(fetchState === 'parse_fail') && (
        <div
          className="rounded-lg px-4 py-3 text-[13px]"
          style={{ background: '#FFF8F0', border: '1px solid #E9A020', color: '#92400e' }}
        >
          Couldn't read the rank — enter manually below.
        </div>
      )}
      {fetchState === 'rate_limited' && (
        <div
          className="rounded-lg px-4 py-3 text-[13px]"
          style={{ background: '#FFF8F0', border: '1px solid #E9A020', color: '#92400e' }}
        >
          Fetched recently — auto-fetch is limited to once per hour. Enter manually if needed.
        </div>
      )}

      {/* ── Result display ── */}
      {fetchState === 'success' && bsrResult && (
        <div
          className="rounded-lg p-4"
          style={{ background: '#F9F7F4', border: '0.5px solid #EEEBE6' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="font-sans leading-none tracking-tight mb-0.5"
                style={{ fontSize: 28, fontWeight: 600, color: '#1E2D3D' }}
              >
                #{bsrResult.rank.toLocaleString()}
              </div>
              <div className="text-[12px]" style={{ color: '#9CA3AF' }}>Amazon Best Sellers Rank</div>
            </div>
            <div className="text-[11px]" style={{ color: '#9CA3AF' }}>
              Fetched {timeAgo(bsrResult.fetchedAt)}
            </div>
          </div>

          {bsrResult.subcategories.length > 0 && (
            <div className="mt-3 space-y-1">
              {bsrResult.subcategories.map((sub, i) => (
                <div key={i} className="text-[13px]" style={{ color: '#6B7280' }}>
                  <span className="font-semibold" style={{ color: '#1E2D3D' }}>
                    #{sub.rank.toLocaleString()}
                  </span>
                  {' › '}{sub.category}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Log entry row (shown after fetch or on error states that need manual entry) ── */}
      {(fetchState === 'success' || fetchState === 'blocked' || fetchState === 'timeout' || fetchState === 'parse_fail') && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min="1"
            placeholder="e.g. 45000"
            value={rankInput}
            onChange={e => setRankInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogRank()}
            className="rounded-lg px-3 py-2 text-[13px] w-40"
            style={{
              border: '0.5px solid #D1CBC2',
              background: 'white',
              color: '#1E2D3D',
              outline: 'none',
            }}
          />
          <button
            onClick={handleLogRank}
            disabled={logSaving || !rankInput}
            className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all disabled:opacity-40"
            style={{
              background: 'white',
              color: '#E9A020',
              border: '1.5px solid #E9A020',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {logSaving ? 'Saving…' : 'Log Today\'s Rank →'}
          </button>
          {logConfirmed && (
            <span
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: '#eaf7f1', color: '#0f6b46' }}
            >
              Rank logged ✓
            </span>
          )}
        </div>
      )}

      {/* ── Rank history table ── */}
      <div>
        <div className="text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
          Rank History
        </div>

        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded h-8" style={{ background: '#F3F0EB' }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div
            className="rounded-lg p-6 flex flex-col items-center text-center"
            style={{ border: '1px dashed #D1CBC2' }}
          >
            <div
              className="w-10 h-10 rounded-full mb-2 flex items-center justify-center"
              style={{ background: '#F3F0EB' }}
            >
              <span style={{ fontSize: 18, color: '#9CA3AF' }}>📊</span>
            </div>
            <div className="text-[13px]" style={{ color: '#9CA3AF' }}>
              No rank history yet. Fetch and log your first rank.
            </div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: '0.5px solid #EEEBE6' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F9F7F4', borderBottom: '0.5px solid #EEEBE6' }}>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold" style={{ color: '#6B7280' }}>Date</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold" style={{ color: '#6B7280' }}>Rank</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold" style={{ color: '#6B7280' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: i < history.length - 1 ? '0.5px solid #F3F0EB' : 'none',
                      background: 'white',
                    }}
                  >
                    <td className="px-4 py-2.5 text-[12.5px]" style={{ color: '#1E2D3D' }}>
                      {formatDate(entry.fetchedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
                      #{entry.rank.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <RankChange current={entry.rank} previous={history[i + 1]?.rank} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
