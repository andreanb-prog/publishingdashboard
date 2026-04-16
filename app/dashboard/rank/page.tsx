'use client'
// app/dashboard/rank/page.tsx
import Link from 'next/link'
import { useBooks, type BookRecord } from '@/hooks/useBooks'
import NoBooksEmptyState from '@/components/NoBooksEmptyState'
import BookSelector from '@/components/BookSelector'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChartJS from 'chart.js/auto'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BsrLogEntry {
  id: string
  asin: string
  bookTitle: string | null
  rank: number
  fetchedAt: string
}

interface CorrelationData {
  bsr: { date: string; rank: number }[]
  adSpend: { date: string; spend: number }[]
  subscribers: { date: string; count: number }[]
}

type FetchState = 'idle' | 'loading' | 'success' | 'blocked' | 'timeout' | 'rate_limited' | 'parse_fail'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getRankColor(rank: number) {
  if (rank < 50_000) return '#6EBF8B'
  if (rank < 200_000) return '#E9A020'
  return '#F97B6B'
}

function getRankLabel(rank: number) {
  if (rank < 50_000) return 'Strong momentum'
  if (rank < 200_000) return 'Steady — keep promoting'
  return 'Run a promo'
}

// ── Per-book card ─────────────────────────────────────────────────────────────

function BookRankCard({ book }: { book: BookRecord }) {
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [rankInput, setRankInput] = useState('')

  const [logSaving, setLogSaving] = useState(false)
  const [logConfirmed, setLogConfirmed] = useState(false)

  const [history, setHistory] = useState<BsrLogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const latestRank = history[0]?.rank ?? null

  const loadHistory = useCallback(async (asin: string) => {
    setHistoryLoading(true)
    try {
      const r = await fetch(`/api/books/bsr/history?asin=${encodeURIComponent(asin)}&days=7`)
      const d = await r.json()
      // Convert history shape back to BsrLogEntry-like
      if (Array.isArray(d.bsr)) {
        setHistory(
          d.bsr
            .slice()
            .reverse()
            .map((e: { date: string; rank: number }, i: number) => ({
              id: String(i),
              asin,
              bookTitle: book.title,
              rank: e.rank,
              fetchedAt: e.date,
            }))
        )
      }
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [book.title])

  useEffect(() => {
    if (book.asin) loadHistory(book.asin)
  }, [book.asin, loadHistory])

  async function handleRefresh() {
    if (!book.asin) { setFetchState('idle'); return }
    setFetchState('loading')
    try {
      const r = await fetch(`/api/books/bsr/fetch?asin=${encodeURIComponent(book.asin)}`)
      const d = await r.json()
      if (d.error === 'rate_limited') { setFetchState('rate_limited'); return }
      if (d.error === 'blocked') { setFetchState('blocked'); return }
      if (d.error === 'timeout') { setFetchState('timeout'); return }
      if (d.error) { setFetchState('parse_fail'); return }

      setRankInput(String(d.rank))
      setLastFetchedAt(d.fetchedAt)
      setFetchState('success')
    } catch {
      setFetchState('parse_fail')
    }
  }

  async function handleLog() {
    if (!book.asin) return
    const rankNum = parseInt(rankInput)
    if (isNaN(rankNum) || rankNum < 1) return

    setLogSaving(true)
    try {
      const r = await fetch('/api/books/bsr/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: book.asin, bookTitle: book.title, rank: rankNum }),
      })
      const d = await r.json()
      if (d.success) {
        setLogConfirmed(true)
        setTimeout(() => setLogConfirmed(false), 3500)
        setRankInput('')
        if (book.asin) loadHistory(book.asin)
      }
    } finally {
      setLogSaving(false)
    }
  }

  return (
    <div className="card p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: book.color }} />
            <div className="text-[14px] font-bold" style={{ color: '#1E2D3D' }}>{book.title || 'Untitled'}</div>
          </div>
          {book.asin
            ? <div className="text-[10.5px] font-mono ml-5.5" style={{ color: '#9CA3AF' }}>{book.asin}</div>
            : (
              <div className="ml-5.5 text-[11px]" style={{ color: '#9CA3AF' }}>
                No ASIN —{' '}
                <Link href="/dashboard/settings#my-books" className="font-semibold underline" style={{ color: '#E9A020' }}>
                  add in Settings
                </Link>
              </div>
            )
          }
        </div>
        {latestRank !== null && (
          <div className="text-right">
            <div
              className="font-sans leading-none tracking-tight"
              style={{ fontSize: 30, fontWeight: 600, color: getRankColor(latestRank) }}
            >
              #{latestRank.toLocaleString()}
            </div>
            <div className="text-[10.5px] mt-0.5" style={{ color: getRankColor(latestRank) }}>
              {getRankLabel(latestRank)}
            </div>
          </div>
        )}
      </div>

      {/* ── Input row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={handleRefresh}
          disabled={fetchState === 'loading' || !book.asin}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all disabled:opacity-40"
          style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {fetchState === 'loading' ? (
            <>
              <span
                className="inline-block w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0"
                style={{ borderColor: '#1E2D3D', borderTopColor: 'transparent' }}
              />
              Fetching…
            </>
          ) : 'Refresh Rank →'}
        </button>

        <input
          type="number"
          min="1"
          placeholder="e.g. 45000"
          value={rankInput}
          onChange={e => setRankInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLog()}
          className="rounded-lg px-3 py-2 text-[13px] w-36"
          style={{ border: '0.5px solid #D1CBC2', background: 'white', color: '#1E2D3D', outline: 'none' }}
        />

        <button
          onClick={handleLog}
          disabled={logSaving || !rankInput || !book.asin}
          className="px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all disabled:opacity-40"
          style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {logSaving ? '…' : 'Log It'}
        </button>

        <span className="text-[12px] ml-auto" style={{ color: '#9CA3AF' }}>
          {lastFetchedAt
            ? `Last fetched: ${timeAgo(lastFetchedAt)}`
            : 'Last fetched: never'}
        </span>
      </div>

      {/* ── Fetch state messages ── */}
      {(fetchState === 'blocked' || fetchState === 'timeout' || fetchState === 'rate_limited' || fetchState === 'parse_fail') && (
        <div
          className="rounded-lg px-3 py-2 mb-3 text-[12.5px]"
          style={{ background: '#FFF8F0', border: '0.5px solid #E9A020', color: '#92400e' }}
        >
          {fetchState === 'blocked' && 'Amazon blocked the auto-fetch — enter your rank manually.'}
          {fetchState === 'timeout' && 'Took too long — try again or enter manually.'}
          {fetchState === 'rate_limited' && 'Checked recently — auto-fetch is limited to once per hour.'}
          {fetchState === 'parse_fail' && "Couldn't read the rank — enter manually."}
        </div>
      )}

      {/* ── Log confirmed ── */}
      {logConfirmed && (
        <div
          className="rounded-lg px-3 py-2 mb-3 text-[12.5px] font-semibold"
          style={{ background: '#eaf7f1', color: '#0f6b46' }}
        >
          Rank logged ✓
        </div>
      )}

      {/* ── 7-day history table ── */}
      <div className="border-t pt-4" style={{ borderColor: '#F3F0EB' }}>
        <div className="text-[11.5px] font-semibold mb-2" style={{ color: '#6B7280' }}>7-Day History</div>

        {historyLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded h-7" style={{ background: '#F3F0EB' }} />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-[12.5px] py-3 text-center" style={{ color: '#9CA3AF' }}>
            No history yet. Log your first rank above.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-1.5 text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>Date</th>
                <th className="text-left py-1.5 text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>BSR</th>
                <th className="text-left py-1.5 text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => {
                const prev = history[i + 1]?.rank
                const diff = prev !== undefined ? prev - entry.rank : undefined
                return (
                  <tr key={entry.id} style={{ borderTop: i > 0 ? '0.5px solid #F3F0EB' : 'none' }}>
                    <td className="py-1.5 text-[12.5px]" style={{ color: '#1E2D3D' }}>{formatDate(entry.fetchedAt)}</td>
                    <td className="py-1.5 text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
                      #{entry.rank.toLocaleString()}
                    </td>
                    <td className="py-1.5">
                      {diff === undefined ? (
                        <span className="text-[12px]" style={{ color: '#9CA3AF' }}>—</span>
                      ) : diff === 0 ? (
                        <span className="text-[12px]" style={{ color: '#9CA3AF' }}>—</span>
                      ) : (
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: diff > 0 ? '#6EBF8B' : '#F97B6B' }}
                        >
                          {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toLocaleString()}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Correlation Graph ─────────────────────────────────────────────────────────

function CorrelationGraph({ books }: { books: BookRecord[] }) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [data, setData] = useState<CorrelationData | null>(null)
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null

  useEffect(() => {
    if (!selectedBook?.asin) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/books/bsr/history?asin=${encodeURIComponent(selectedBook.asin)}&days=7`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedBook?.asin])

  // Build chart
  useEffect(() => {
    chartRef.current?.destroy()
    chartRef.current = null

    if (!canvasRef.current || !data) return

    // Collect all dates across all 3 series
    const allDates = Array.from(
      new Set([
        ...data.bsr.map(d => d.date),
        ...data.adSpend.map(d => d.date),
        ...data.subscribers.map(d => d.date),
      ])
    ).sort()

    if (!allDates.length) return

    const bsrMap = new Map(data.bsr.map(d => [d.date, d.rank]))
    const spendMap = new Map(data.adSpend.map(d => [d.date, d.spend]))
    const subMap = new Map(data.subscribers.map(d => [d.date, d.count]))

    const hasBsr = data.bsr.length > 0
    const hasSpend = data.adSpend.length > 0
    const hasSubs = data.subscribers.length > 0

    const labels = allDates.map(d => {
      const dt = new Date(d + 'T00:00:00')
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'BSR (lower = better)',
            data: allDates.map(d => bsrMap.get(d) ?? null),
            borderColor: '#F97B6B',
            backgroundColor: 'rgba(249,123,107,0.08)',
            borderDash: hasBsr ? [] : [5, 5],
            pointBackgroundColor: '#F97B6B',
            pointRadius: 4,
            tension: 0.3,
            yAxisID: 'y-bsr',
            spanGaps: true,
          },
          {
            label: hasSpend ? 'Ad Spend ($)' : 'Ad Spend (no data yet)',
            data: allDates.map(d => spendMap.get(d) ?? null),
            borderColor: '#E9A020',
            backgroundColor: 'rgba(233,160,32,0.08)',
            borderDash: hasSpend ? [] : [5, 5],
            pointBackgroundColor: '#E9A020',
            pointRadius: 4,
            tension: 0.3,
            yAxisID: 'y-left',
            spanGaps: true,
          },
          {
            label: hasSubs ? 'Subscribers Added' : 'Subscribers (no data yet)',
            data: allDates.map(d => subMap.get(d) ?? null),
            borderColor: '#6EBF8B',
            backgroundColor: 'rgba(110,191,139,0.08)',
            borderDash: hasSubs ? [] : [5, 5],
            pointBackgroundColor: '#6EBF8B',
            pointRadius: 4,
            tension: 0.3,
            yAxisID: 'y-left',
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              color: '#6B7280',
              boxWidth: 10,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: 'white',
            borderColor: '#EEEBE6',
            borderWidth: 1,
            titleColor: '#1E2D3D',
            bodyColor: '#6B7280',
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            padding: 10,
            callbacks: {
              label(ctx) {
                const v = ctx.parsed.y
                if (v === null || v === undefined) return `${ctx.dataset.label}: —`
                if (ctx.datasetIndex === 0) return `BSR: #${Math.round(v).toLocaleString()}`
                if (ctx.datasetIndex === 1) return `Ad Spend: $${v.toFixed(2)}`
                return `Subscribers: ${Math.round(v).toLocaleString()}`
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#F3F0EB' },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: '#9CA3AF' },
          },
          'y-left': {
            type: 'linear',
            position: 'left',
            grid: { color: '#F3F0EB' },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: '#9CA3AF' },
            beginAtZero: true,
          },
          'y-bsr': {
            type: 'linear',
            position: 'right',
            reverse: true, // lower BSR = better, so invert this axis
            grid: { drawOnChartArea: false },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              color: '#F97B6B',
              callback(value) {
                return `#${Number(value).toLocaleString()}`
              },
            },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [data])

  const hasAnyData = data && (data.bsr.length > 0 || data.adSpend.length > 0 || data.subscribers.length > 0)

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[18px] font-semibold" style={{ color: '#1E2D3D' }}>7-Day Correlation</div>
          <div className="text-[13px]" style={{ color: '#9CA3AF' }}>
            How your rank moves with ad spend and list growth
          </div>
        </div>
        <div style={{ minWidth: 200, maxWidth: 260 }}>
          <BookSelector value={selectedBookId} onChange={setSelectedBookId} />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-lg" style={{ height: 280, background: '#F3F0EB' }} />
      ) : !selectedBook?.asin ? (
        <div
          className="rounded-lg p-6 flex flex-col items-center text-center"
          style={{ border: '1px dashed #D1CBC2', height: 200 }}
        >
          <div className="text-[13px] mb-2" style={{ color: '#9CA3AF' }}>
            Select a book with an ASIN to see correlation data.
          </div>
          <Link href="/dashboard/settings#my-books" className="text-[12.5px] font-semibold underline" style={{ color: '#E9A020' }}>
            Add ASIN in Settings →
          </Link>
        </div>
      ) : !hasAnyData ? (
        <div
          className="rounded-lg p-6 flex flex-col items-center text-center"
          style={{ border: '1px dashed #D1CBC2', height: 200 }}
        >
          <div
            className="w-10 h-10 rounded-full mb-2 flex items-center justify-center"
            style={{ background: '#F3F0EB' }}
          >
            <span style={{ fontSize: 18, color: '#9CA3AF' }}>📊</span>
          </div>
          <div className="text-[13px]" style={{ color: '#9CA3AF' }}>
            No correlation data yet. Log your rank daily to see trends over time.
          </div>
        </div>
      ) : (
        <div style={{ height: 280, position: 'relative' }}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RankPage() {
  const { books, loading } = useBooks()

  if (loading) {
    return (
      <div className="p-4 sm:p-8 pb-8 max-w-[1200px]">
        <div className="animate-pulse text-stone-500 text-[13px]">Loading your books…</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 pb-8 max-w-[1200px]">
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="font-sans text-[22px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
          Sales Rank Tracker
        </h1>
        <p className="text-[13px]" style={{ color: '#9CA3AF' }}>
          Track your Amazon Best Seller Rank over time
        </p>
      </div>

      {books.length === 0 ? (
        <NoBooksEmptyState />
      ) : (
        <>
          {/* ── Per-book cards ── */}
          <div className="space-y-5 mb-6">
            {books.map(book => (
              <BookRankCard key={book.id} book={book} />
            ))}
          </div>

          {/* ── 7-day correlation graph ── */}
          <CorrelationGraph books={books} />

          {/* ── Rank reference ── */}
          <div className="card p-5 mt-5">
            <div className="text-[13px] font-bold mb-3" style={{ color: '#1E2D3D' }}>How to read your rank</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  label: 'Top 50,000',
                  bg: '#eaf7f1', text: '#0f6b46',
                  body: 'Strong sales momentum. Your promos are working. Keep the swap calendar full.',
                },
                {
                  label: '50K – 200K',
                  bg: '#fdf5e3', text: '#7a4f00',
                  body: 'Steady sales. Good for a newer title. Schedule a promo week to push higher.',
                },
                {
                  label: '200K+',
                  bg: '#fdf0f0', text: '#8c2020',
                  body: 'Slow sales right now. Run a newsletter swap or paid promo to boost visibility.',
                },
              ].map(b => (
                <div key={b.label} className="rounded-lg p-3" style={{ background: b.bg }}>
                  <div className="text-[12px] font-bold mb-1" style={{ color: b.text }}>{b.label}</div>
                  <div className="text-[11.5px]" style={{ color: b.text }}>{b.body}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
