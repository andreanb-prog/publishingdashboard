'use client'
// components/bsr/BsrFetchButton.tsx
// Reusable BSR fetch button — calls GET /api/books/bsr/fetch?asin=X
// sm: small muted inline button with RefreshCw icon (for embedding in other pages)
// md: full amber "Refresh Rank →" button (ROAS Hub style)
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

type FetchError = 'blocked' | 'rate_limited' | 'failed'
type State = 'idle' | 'loading' | 'success' | 'blocked' | 'rate_limited' | 'failed'

interface Props {
  asin: string
  onResult: (rank: number) => void
  onError?: (error: FetchError) => void
  size?: 'sm' | 'md'
}

function fmtNextAllowed(iso: string | null): string {
  if (!iso) return 'in ~1h'
  const mins = Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 60_000))
  if (mins >= 60) return 'in ~1h'
  return `in ~${mins}m`
}

export default function BsrFetchButton({ asin, onResult, onError, size = 'md' }: Props) {
  const [state, setState] = useState<State>('idle')
  const [fetchedRank, setFetchedRank] = useState<number | null>(null)
  const [nextAllowed, setNextAllowed] = useState<string | null>(null)

  async function handleFetch() {
    if (!asin || state === 'loading') return
    setState('loading')
    setFetchedRank(null)

    try {
      const r = await fetch(`/api/books/bsr/fetch?asin=${encodeURIComponent(asin)}`)
      const d = await r.json()

      if (d.error === 'rate_limited') {
        setNextAllowed(d.nextAllowed ?? null)
        setState('rate_limited')
        onError?.('rate_limited')
        setTimeout(() => setState('idle'), 5000)
        return
      }
      if (d.error === 'blocked') {
        setState('blocked')
        onError?.('blocked')
        setTimeout(() => setState('idle'), 3000)
        return
      }
      if (d.error) {
        setState('failed')
        onError?.('failed')
        setTimeout(() => setState('idle'), 3000)
        return
      }

      setFetchedRank(d.rank)
      setState('success')
      onResult(d.rank)
      setTimeout(() => { setState('idle'); setFetchedRank(null) }, 2000)
    } catch {
      setState('failed')
      onError?.('failed')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  // ── sm variant ──────────────────────────────────────────────────────────────
  if (size === 'sm') {
    const label =
      state === 'loading' ? 'Fetching…' :
      state === 'success' && fetchedRank != null ? `✓ #${fetchedRank.toLocaleString()}` :
      state === 'blocked' ? 'Amazon blocked' :
      state === 'rate_limited' ? `Refreshes hourly · available ${fmtNextAllowed(nextAllowed)}` :
      'Refresh BSR'

    const labelColor =
      state === 'success' ? '#6EBF8B' :
      state === 'blocked' || state === 'rate_limited' ? '#E9A020' :
      '#6B7280'

    return (
      <button
        onClick={handleFetch}
        disabled={state === 'loading'}
        title="BSR refreshes hourly from Amazon"
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all disabled:opacity-50"
        style={{
          background: '#F5F5F4',
          color: labelColor,
          border: '0.5px solid #E5E7EB',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <RefreshCw size={12} strokeWidth={2} className={state === 'loading' ? 'animate-spin' : ''} />
        {label}
      </button>
    )
  }

  // ── md variant ──────────────────────────────────────────────────────────────
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        onClick={handleFetch}
        disabled={state === 'loading' || !asin}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all disabled:opacity-40"
        style={{
          background: state === 'success' ? '#6EBF8B' : '#E9A020',
          color: '#1E2D3D',
          border: 'none',
          cursor: state === 'loading' || !asin ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          minWidth: 120,
        }}
      >
        {state === 'loading' ? (
          <>
            <span
              className="inline-block w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0"
              style={{ borderColor: '#1E2D3D', borderTopColor: 'transparent' }}
            />
            Fetching…
          </>
        ) : state === 'success' && fetchedRank != null ? (
          <>✓ #{fetchedRank.toLocaleString()}</>
        ) : (
          'Refresh Rank →'
        )}
      </button>
      {state === 'idle' && (
        <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
          Refreshes hourly from Amazon
        </span>
      )}
      {state === 'blocked' && (
        <span className="text-[11.5px] font-medium" style={{ color: '#E9A020' }}>
          ⚠ Amazon blocked — enter manually
        </span>
      )}
      {state === 'rate_limited' && (
        <span className="text-[11.5px]" style={{ color: '#9CA3AF' }}>
          Refreshes hourly · available {fmtNextAllowed(nextAllowed)}
        </span>
      )}
    </span>
  )
}
