'use client'

// Market Pulse v1.1 — Andrea's spec: pick a big category, see the KU titles in
// its top-100 as a clean linear table, with a sidebar of the top tropes across
// those KU titles (tagged from product-page blurbs, not title guessing).
// KU status + tropes come from the AsinMeta product-page cache, which fills in
// over the first few nightly scans (metaCoverage shows progress).

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ExternalLink } from 'lucide-react'

const NAVY = '#1E2D3D'
const AMBER = '#E9A020'
const SERIF = "var(--font-playfair), 'Playfair Display', Georgia, serif"

type EnrichedRow = {
  rank: number; asin: string | null; title: string; author: string | null
  price: number | null; reviews: number | null; ku: boolean
  meta: null | {
    author: string | null; isKu: boolean; price: number | null; reviews: number | null
    overallBsr: number | null; estSalesPerDay: number | null; tropes: string[]
  }
}
type GenrePulse = {
  genre: { slug: string; label: string; group: string; focusTropes: string[] }
  latest: {
    capturedAt: string
    rows: EnrichedRow[]
    stats: { modalPrice: number | null } | null
    kuTropeCounts: Record<string, number>
    kuCount: number
    metaCoverage: number
  } | null
  prevStats: unknown
}

const card: React.CSSProperties = {
  background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MarketPulsePage() {
  const [pulse, setPulse] = useState<GenrePulse[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/market-pulse')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const p: GenrePulse[] = d.pulse ?? []
        setPulse(p)
        setActiveSlug(prev => prev ?? p.find(g => g.latest)?.genre.slug ?? p[0]?.genre.slug ?? null)
      })
      .catch(() => setPulse([]))
      .finally(() => setLoading(false))
  }, [])

  async function runScan() {
    setRunning(true)
    setRunError(null)
    try {
      const res = await fetch('/api/market-pulse', { method: 'POST' })
      if (!res.ok) throw new Error('scan failed')
      const refreshed = await fetch('/api/market-pulse').then(r => r.json())
      setPulse(refreshed.pulse ?? [])
    } catch {
      setRunError('Scan failed — try again in a minute.')
    } finally {
      setRunning(false)
    }
  }

  const active = useMemo(
    () => (pulse ?? []).find(g => g.genre.slug === activeSlug) ?? null,
    [pulse, activeSlug],
  )

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 34, color: NAVY, margin: 0 }}>Market Pulse</h1>
          <p style={{ fontSize: 13.5, color: 'rgba(30,45,61,0.55)', margin: '6px 0 0', maxWidth: 620, lineHeight: 1.5 }}>
            The Kindle Unlimited titles ranking in each big category&apos;s top 100 — and the
            tropes carrying them there.
          </p>
        </div>
        <button onClick={runScan} disabled={running} style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          background: AMBER, color: NAVY, fontWeight: 700, fontSize: 13,
          border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
          opacity: running ? 0.7 : 1,
        }}>
          <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
          {running ? 'Scanning…' : 'Refresh scan'}
        </button>
      </div>

      {/* Genre picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '20px 0 24px' }}>
        {(pulse ?? []).map(g => {
          const isActive = g.genre.slug === activeSlug
          return (
            <button key={g.genre.slug} onClick={() => setActiveSlug(g.genre.slug)} style={{
              fontSize: 12.5, fontWeight: 700, padding: '7px 14px', borderRadius: 99,
              cursor: 'pointer',
              border: isActive ? 'none' : '0.5px solid rgba(30,45,61,0.2)',
              background: isActive ? NAVY : 'white',
              color: isActive ? 'white' : 'rgba(30,45,61,0.65)',
            }}>
              {g.genre.label}
            </button>
          )
        })}
        <RequestCategory />
      </div>

      {runError && (
        <div style={{ ...card, borderLeft: '3px solid #F97B6B', padding: '12px 16px', marginBottom: 16, fontSize: 12.5, color: '#92400E' }}>
          {runError}
        </div>
      )}

      {loading ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
      ) : !active?.latest ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 18, color: NAVY, margin: '0 0 6px' }}>No scan yet</p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.55)', margin: 0 }}>
            Run a scan to pull this category&apos;s best-seller list. KU detection and trope
            tagging fill in over the first few nightly scans.
          </p>
        </div>
      ) : (
        <GenreView data={active} />
      )}
    </div>
  )
}

// "Request a category" — posts to the existing feedback pipeline (lands in the
// Notion Feedback DB) so category demand is tracked where ideas already live.
function RequestCategory() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function submit() {
    if (!value.trim() || state === 'sending') return
    setState('sending')
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'idea',
          message: `Market Pulse category request: ${value.trim()}`,
          page: '/dashboard/market-pulse',
        }),
      })
      setState('sent')
      setValue('')
      setTimeout(() => { setState('idle'); setOpen(false) }, 2500)
    } catch {
      setState('idle')
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 99, cursor: 'pointer',
        border: '1px dashed rgba(233,160,32,0.6)', background: 'transparent', color: '#B57812',
      }}>
        + Request a category
      </button>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="e.g. Reverse Harem"
        style={{
          fontSize: 12, padding: '6px 12px', borderRadius: 99, outline: 'none', width: 170,
          border: '1px solid rgba(233,160,32,0.6)', background: 'white', color: NAVY,
        }}
      />
      <button onClick={submit} disabled={state === 'sending'} style={{
        fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
        border: 'none', background: AMBER, color: NAVY, opacity: state === 'sending' ? 0.6 : 1,
      }}>
        {state === 'sent' ? 'Sent ✓' : state === 'sending' ? '…' : 'Send'}
      </button>
    </span>
  )
}

function GenreView({ data }: { data: GenrePulse }) {
  const latest = data.latest!
  const enriched = latest.metaCoverage
  const total = latest.rows.length
  const allKuRows = latest.rows.filter(r => r.meta?.isKu)
  const unknownRows = total - enriched
  const wideCount = enriched - allKuRows.length

  // Default: top 10 of the full list (KU badge where verified). "KU only"
  // narrows to verified-KU titles; "Show all" expands to the full 100.
  const [kuOnly, setKuOnly] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const shownRows = kuOnly ? allKuRows : latest.rows

  // Trope sidebar: counts across ALL verified titles in the top 100 (not just
  // KU) so it reflects the whole list she's looking at.
  const tropes = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of latest.rows) {
      for (const t of r.meta?.tropes ?? []) counts[t] = (counts[t] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [latest.rows])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, alignItems: 'start' }}>
      {/* Main: KU top-100 table */}
      <div style={{ ...card, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 20, color: NAVY, margin: 0 }}>
            Top {expanded ? 100 : 10}{kuOnly ? ' — KU only' : ''}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setKuOnly(v => !v)} style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
              border: kuOnly ? 'none' : '0.5px solid rgba(30,45,61,0.2)',
              background: kuOnly ? AMBER : 'white',
              color: kuOnly ? NAVY : 'rgba(30,45,61,0.55)',
            }}>
              KU only
            </button>
            <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>scanned {fmtDate(latest.capturedAt)}</span>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'rgba(30,45,61,0.5)', margin: '0 0 14px' }}>
          {allKuRows.length} KU · {wideCount} wide/trad
          {unknownRows > 0 && <> · {unknownRows} not yet verified (fills in over the next nightly scans)</>}
        </p>

        {shownRows.length === 0 ? (
          <p style={{ fontSize: 12.5, color: '#9CA3AF' }}>
            No verified KU titles yet — KU status comes from each book&apos;s product page and
            builds up across the first few scans.
          </p>
        ) : (
          <div>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) 70px 70px 84px', gap: 8, padding: '4px 0 8px', borderBottom: '1px solid rgba(30,45,61,0.1)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(30,45,61,0.4)' }}>
              <span>#</span><span>Title</span><span>Price</span><span>Reviews</span><span>Est/day</span>
            </div>
            {shownRows.slice(0, expanded ? 100 : 10).map(r => (
              <div key={r.rank} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) 70px 70px 84px', gap: 8, alignItems: 'baseline', padding: '8px 0', borderBottom: '0.5px solid rgba(30,45,61,0.05)', fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: 'rgba(30,45,61,0.4)' }}>#{r.rank}</span>
                <div style={{ minWidth: 0 }}>
                  {r.asin ? (
                    <a href={`https://www.amazon.com/dp/${r.asin}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: NAVY, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      <ExternalLink size={10} color="#9CA3AF" style={{ flexShrink: 0 }} />
                    </a>
                  ) : (
                    <span style={{ color: NAVY, fontWeight: 600 }}>{r.title}</span>
                  )}
                  <div style={{ fontSize: 11, color: 'rgba(30,45,61,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.meta?.isKu && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 3, background: 'rgba(233,160,32,0.15)', color: '#B57812', flexShrink: 0 }}>KU</span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.meta?.author ?? r.author}
                      {r.meta?.tropes?.length ? <> · <span style={{ fontStyle: 'italic' }}>{r.meta.tropes.slice(0, 3).join(', ')}</span></> : null}
                    </span>
                  </div>
                </div>
                <span style={{ color: 'rgba(30,45,61,0.65)' }}>
                  {(r.meta?.price ?? r.price) != null ? `$${(r.meta?.price ?? r.price)!.toFixed(2)}` : '—'}
                </span>
                <span style={{ color: 'rgba(30,45,61,0.65)' }}>
                  {(r.meta?.reviews ?? r.reviews)?.toLocaleString() ?? '—'}
                </span>
                <span style={{ color: NAVY, fontWeight: 600 }}>
                  {r.meta?.estSalesPerDay != null ? `~${r.meta.estSalesPerDay}` : '—'}
                </span>
              </div>
            ))}
            {shownRows.length > 10 && (
              <button onClick={() => setExpanded(v => !v)} style={{
                marginTop: 12, fontSize: 12, fontWeight: 700, color: AMBER,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                {expanded ? 'Show top 10 only' : `Show all ${shownRows.length} →`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sidebar: top tropes across the verified titles in the top 100 */}
      <div style={{ ...card, padding: '18px 20px', position: 'sticky', top: 20 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(30,45,61,0.4)', margin: '0 0 12px' }}>
          Top tropes — this top 100
        </p>
        {tropes.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            Trope data builds as titles get verified.
          </p>
        ) : (
          tropes.map((t, i) => {
            const max = tropes[0].count
            const isFocus = data.genre.focusTropes.includes(t.name)
            return (
              <div key={t.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: i < 3 ? 700 : 500, color: isFocus ? '#B57812' : NAVY }}>{t.name}</span>
                  <span style={{ color: 'rgba(30,45,61,0.45)' }}>{t.count}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(30,45,61,0.06)' }}>
                  <div style={{
                    height: 4, borderRadius: 2, width: `${Math.max(6, (t.count / max) * 100)}%`,
                    background: isFocus ? AMBER : 'rgba(30,45,61,0.35)',
                  }} />
                </div>
              </div>
            )
          })
        )}
        {data.latest && data.latest.kuCount > 0 && (
          <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '12px 0 0', lineHeight: 1.5 }}>
            Tagged from {enriched} verified titles&apos; blurbs ({data.latest.kuCount} KU).
          </p>
        )}
      </div>
    </div>
  )
}
