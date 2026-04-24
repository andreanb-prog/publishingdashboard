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

// ── Sparkline ─────────────────────────────────────────────────────────────────
function BsrSparkline({ logs }: { logs: BsrLogEntry[] }) {
  const W = 200, H = 80

  // Filter to last 24 hours, sort chronological
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const pts = [...logs]
    .filter(l => new Date(l.fetchedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())

  if (pts.length < 2) {
    return (
      <p style={{
        fontFamily: 'var(--font-serif, Georgia, serif)',
        fontStyle: 'italic', fontSize: 13,
        color: 'var(--ink4, #8a8076)', margin: '8px 0',
      }}>
        Not enough data for chart
      </p>
    )
  }

  const ranks = pts.map(p => p.rank)
  const minR = Math.min(...ranks), maxR = Math.max(...ranks)
  const range = maxR - minR || 1

  // Y is inverted: lower rank (better) maps to higher Y position
  const toY = (r: number) => H - ((r - minR) / range) * (H - 12) - 6
  const toX = (i: number) => (i / (pts.length - 1)) * W

  const polyline = pts.map((p, i) => `${toX(i)},${toY(p.rank)}`).join(' ')
  const area = `M0,${H} L${polyline.split(' ').map((pt, i) => i === 0 ? `0,${toY(pts[0].rank)}` : pt).join(' ')} L${W},${H} Z`

  const [tooltip, setTooltip] = useState<{ x: number; y: number; rank: number; time: string } | null>(null)

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="bsr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--amber-boutique, #c2831f)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--amber-boutique, #c2831f)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#bsr-fill)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--amber-boutique, #c2831f)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle
            key={p.id}
            cx={toX(i)} cy={toY(p.rank)} r={4}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setTooltip({
              x: toX(i), y: toY(p.rank), rank: p.rank,
              time: new Date(p.fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            })}
          />
        ))}
        {tooltip && (
          <g>
            <circle cx={tooltip.x} cy={tooltip.y} r={3} fill="var(--amber-boutique, #c2831f)" />
          </g>
        )}
      </svg>
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 8, W - 80),
          top: Math.max(tooltip.y - 28, 0),
          background: 'var(--ink, #14110f)',
          color: 'var(--paper, #f7f1e5)',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 10, padding: '3px 7px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          #{tooltip.rank.toLocaleString()} · {tooltip.time}
        </div>
      )}
    </div>
  )
}

// ── Velocity chip ─────────────────────────────────────────────────────────────
function VelocityChip({ logs }: { logs: BsrLogEntry[] }) {
  const now = Date.now()
  const cutoff = now - 6 * 60 * 60 * 1000

  const sorted = [...logs].sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())
  const newest = sorted[0]
  const sixHrAgo = sorted.find(l => new Date(l.fetchedAt).getTime() <= cutoff)

  if (!newest || !sixHrAgo) return null

  const delta = newest.rank - sixHrAgo.rank // positive = rank got worse; negative = improved
  const improving = delta < 0
  const color = improving ? 'var(--green, #2f6d4e)' : 'var(--red, #b0322a)'
  const sign = improving ? '−' : '+'

  return (
    <span style={{
      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
      fontSize: 11, color,
      marginLeft: 10,
    }}>
      {sign}{Math.abs(delta).toLocaleString()} / 6h
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
  const [logDrawerOpen, setLogDrawerOpen] = useState(false)

  const [history, setHistory] = useState<BsrLogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null

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

      if (r.status === 429 || d.error === 'rate_limited') { setFetchState('rate_limited'); return }
      if (d.error === 'blocked')    { setFetchState('blocked');    return }
      if (d.error === 'timeout')    { setFetchState('timeout');    return }
      if (d.error === 'no_asin')    { setFetchState('no_asin');    return }
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
        await loadHistory(selectedBook.asin)
      }
    } finally {
      setLogSaving(false)
    }
  }

  if (booksLoading) {
    return (
      <div className="p-5">
        <div className="animate-pulse h-16" style={{ borderRadius: 2, background: '#F3F0EB' }} />
      </div>
    )
  }

  // Current rank: prefer live fetch, fall back to most recent history entry
  const currentRank = bsrResult?.rank ?? history[0]?.rank ?? null
  const currentCategory = bsrResult?.subcategories?.[0]?.category ?? null

  const hasNoAsin = !selectedBook?.asin
  const needsManualEntry = fetchState === 'blocked' || fetchState === 'timeout' || fetchState === 'parse_fail'

  return (
    <div className="p-5 space-y-4">
      {/* ── Input row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div style={{ minWidth: 220, maxWidth: 320, flex: '1 1 220px' }}>
          <BookSelector value={selectedBookId} onChange={setSelectedBookId} />
        </div>

        {hasNoAsin ? (
          <p style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontStyle: 'italic', fontSize: 13,
            color: 'var(--ink3, #564e46)', margin: 0,
          }}>
            Select a book to start tracking —{' '}
            <Link href="/dashboard/settings#my-books" style={{ color: 'var(--amber-text, #a56b13)', textDecoration: 'none' }}>
              add ASIN in Settings
            </Link>
          </p>
        ) : (
          <button
            onClick={handleRefresh}
            disabled={fetchState === 'loading'}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold transition-all disabled:opacity-50"
            style={{ borderRadius: 2, background: '#D97706', color: '#FFFFFF', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {fetchState === 'loading' ? (
              <>
                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#1E2D3D', borderTopColor: 'transparent' }} />
                Fetching…
              </>
            ) : 'Refresh Rank →'}
          </button>
        )}

        <span className="text-[12px] ml-auto" style={{ color: '#9CA3AF' }}>
          {lastFetchedAt ? `Last fetched: ${timeAgo(lastFetchedAt)}` : 'Last fetched: never'}
        </span>
      </div>

      {/* ── Error states ── */}
      {fetchState === 'blocked' && (
        <div className="px-4 py-3 text-[13px]" style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #D97706', color: '#92400e' }}>
          Amazon blocked the auto-fetch — enter your rank manually below.
        </div>
      )}
      {fetchState === 'timeout' && (
        <div className="px-4 py-3 text-[13px]" style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #D97706', color: '#92400e' }}>
          Took too long — try again or enter manually.
        </div>
      )}
      {fetchState === 'no_asin' && (
        <div className="px-4 py-3 text-[13px]" style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #D97706', color: '#92400e' }}>
          Add your ASIN in{' '}
          <Link href="/dashboard/settings#my-books" className="font-semibold underline" style={{ color: '#D97706' }}>Settings</Link>{' '}
          first.
        </div>
      )}
      {fetchState === 'parse_fail' && (
        <div className="px-4 py-3 text-[13px]" style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #D97706', color: '#92400e' }}>
          Couldn&apos;t read the rank — enter manually below.
        </div>
      )}
      {fetchState === 'rate_limited' && (
        <div className="px-4 py-3 text-[13px]" style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #D97706', color: '#92400e' }}>
          Fetched recently — auto-fetch is limited to once per hour. Enter manually if needed.
        </div>
      )}

      {/* ── Main rank display (Boutique v2.3) ── */}
      {selectedBook && (currentRank || history.length > 0) && (
        <div className="p-4" style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #E8E1D3' }}>
          {/* Primary rank number */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 24, fontWeight: 500, lineHeight: 1,
              color: 'var(--ink3, #564e46)',
            }}>#</span>
            <span style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 48, fontWeight: 500, lineHeight: 1,
              color: 'var(--ink, #14110f)',
            }}>
              {(currentRank ?? 0).toLocaleString()}
            </span>
            <VelocityChip logs={history} />
          </div>

          {currentCategory && (
            <div style={{
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink3, #564e46)', marginBottom: 12,
            }}>
              {currentCategory}
            </div>
          )}

          {/* Sparkline */}
          <BsrSparkline logs={history} />

          {/* Subcategories (from live fetch) */}
          {bsrResult?.subcategories && bsrResult.subcategories.length > 0 && (
            <div className="mt-2 space-y-1">
              {bsrResult.subcategories.map((sub, i) => (
                <div key={i} className="text-[13px]" style={{ color: '#6B7280' }}>
                  <span className="font-semibold" style={{ color: '#1E2D3D' }}>#{sub.rank.toLocaleString()}</span>
                  {' › '}{sub.category}
                </div>
              ))}
            </div>
          )}

          {bsrResult && (
            <div className="text-[11px] mt-2" style={{ color: '#9CA3AF' }}>
              Live · fetched {timeAgo(bsrResult.fetchedAt)}
            </div>
          )}
        </div>
      )}

      {/* ── Manual log drawer ── */}
      {(fetchState === 'success' || needsManualEntry) && (
        <div>
          <button
            onClick={() => setLogDrawerOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--amber-text, #a56b13)',
            }}
          >
            Log manually {logDrawerOpen ? '↑' : '→'}
          </button>
          {logDrawerOpen && (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <input
                type="number" min="1" placeholder="e.g. 45000"
                value={rankInput}
                onChange={e => setRankInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogRank()}
                className="px-3 py-2 text-[13px] w-40"
                style={{ borderRadius: 2, border: '1px solid #E8E1D3', background: 'white', color: '#1E2D3D', outline: 'none' }}
              />
              <button
                onClick={handleLogRank}
                disabled={logSaving || !rankInput}
                className="px-4 py-2 text-[13px] font-bold transition-all disabled:opacity-40"
                style={{ borderRadius: 2, background: 'white', color: '#D97706', border: '1px solid #D97706', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {logSaving ? 'Saving…' : "Log Today's Rank →"}
              </button>
              {logConfirmed && (
                <span className="text-[12.5px] font-semibold px-3 py-1.5" style={{ borderRadius: 2, background: '#eaf7f1', color: '#0f6b46' }}>
                  Rank logged ✓
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Rank history table ── */}
      <div>
        <div className="text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>Rank History</div>
        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse rounded h-8" style={{ background: '#F3F0EB' }} />)}
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 flex flex-col items-center text-center" style={{ borderRadius: 0, border: '1px dashed #E8E1D3' }}>
            <div className="text-[13px]" style={{ color: '#9CA3AF' }}>
              No rank history yet. Fetch and log your first rank.
            </div>
          </div>
        ) : (
          <div className="overflow-hidden" style={{ borderRadius: 0, border: '1px solid #E8E1D3' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F9F7F4', borderBottom: '0.5px solid #EEEBE6' }}>
                  {['Date', 'Rank', 'Change'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11.5px] font-semibold" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => {
                  const prev = history[i + 1]?.rank
                  const diff = prev !== undefined ? prev - entry.rank : null
                  return (
                    <tr key={entry.id} style={{ borderBottom: i < history.length - 1 ? '0.5px solid #F3F0EB' : 'none', background: 'white' }}>
                      <td className="px-4 py-2.5 text-[12.5px]" style={{ color: '#1E2D3D' }}>{formatDate(entry.fetchedAt)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>#{entry.rank.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-[12px] font-semibold">
                        {diff === null ? <span style={{ color: '#9CA3AF' }}>—</span>
                          : diff === 0 ? <span style={{ color: '#9CA3AF' }}>—</span>
                          : <span style={{ color: diff > 0 ? '#6EBF8B' : '#F97B6B' }}>{diff > 0 ? '↑' : '↓'} {Math.abs(diff).toLocaleString()}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
