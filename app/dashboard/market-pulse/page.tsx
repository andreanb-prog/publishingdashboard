'use client'

// Market Pulse — Category Intelligence v2.
// Replaces the old Category Research anchor (which mirrored KDP data — dead
// weight). Answers: "what is this market doing, and what's my next move?"
// Data: daily Browserbase scrape of genre best-seller lists (lib/market-pulse).

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'

const NAVY = '#1E2D3D'
const AMBER = '#E9A020'
const SERIF = "var(--font-playfair), 'Playfair Display', Georgia, serif"

type PulseRow = {
  rank: number; asin: string | null; title: string; author: string | null
  price: number | null; reviews: number | null; ku: boolean
}
type PulseStats = {
  thresholds: Record<'rank1' | 'rank10' | 'rank50', { bsr: number | null; salesPerDay: number | null }>
  modalPrice: number | null
  kuShare: number | null
  tropeCounts: Record<string, number>
  rowCount: number
}
type GenrePulse = {
  genre: { slug: string; label: string; group: string; focusTropes: string[] }
  latest: { capturedAt: string; rows: PulseRow[]; stats: PulseStats | null } | null
  prevStats: PulseStats | null
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
  const [myPace, setMyPace] = useState<number | null>(null)
  const [openGenre, setOpenGenre] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/market-pulse')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPulse(d.pulse ?? []))
      .catch(() => setPulse([]))
      .finally(() => setLoading(false))
    // User's current sales pace this month → the "gap to threshold" line.
    fetch('/api/kdp/sales')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const units = d?.totalUnits ?? 0
        const day = new Date().getUTCDate()
        if (day > 0) setMyPace(Math.round((units / day) * 10) / 10)
      })
      .catch(() => {})
  }, [])

  async function runScrape() {
    setRunning(true)
    setRunError(null)
    try {
      const res = await fetch('/api/market-pulse', { method: 'POST' })
      if (!res.ok) throw new Error('Scrape failed')
      const refreshed = await fetch('/api/market-pulse').then(r => r.json())
      setPulse(refreshed.pulse ?? [])
    } catch {
      setRunError('Scrape failed — check Browserbase configuration and try again.')
    } finally {
      setRunning(false)
    }
  }

  const hasAnyData = useMemo(() => (pulse ?? []).some(p => p.latest), [pulse])

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 34, color: NAVY, margin: 0 }}>Market Pulse</h1>
          <p style={{ fontSize: 13.5, color: 'rgba(30,45,61,0.55)', margin: '6px 0 0', maxWidth: 640, lineHeight: 1.5 }}>
            What each genre&apos;s best-seller list is doing right now — entry thresholds, price points,
            and the tropes that are rising — so you know where your next promo push lands hardest.
          </p>
        </div>
        <button
          onClick={runScrape}
          disabled={running}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: AMBER, color: NAVY, fontWeight: 700, fontSize: 13,
            border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
            opacity: running ? 0.7 : 1,
          }}
        >
          <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
          {running ? 'Scanning the market…' : hasAnyData ? 'Refresh now' : 'Run first scan'}
        </button>
      </div>

      {myPace != null && (
        <p style={{ fontSize: 12, color: 'rgba(30,45,61,0.5)', margin: '2px 0 24px' }}>
          Your current pace this month: <strong style={{ color: NAVY }}>{myPace} units/day</strong> — gap lines below compare against this.
        </p>
      )}

      {runError && (
        <div style={{ ...card, borderLeft: '3px solid #F97B6B', padding: '12px 16px', marginBottom: 16, fontSize: 12.5, color: '#92400E' }}>
          {runError}
        </div>
      )}

      {loading ? (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
      ) : !hasAnyData ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: SERIF, fontSize: 18, color: NAVY, margin: '0 0 6px' }}>No market data yet</p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.55)', margin: 0 }}>
            Run the first scan to pull today&apos;s best-seller lists for every tracked genre. The nightly refresh takes over from there.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {(pulse ?? []).map(g => (
            <GenreCard
              key={g.genre.slug}
              data={g}
              myPace={myPace}
              open={openGenre === g.genre.slug}
              onToggle={() => setOpenGenre(v => v === g.genre.slug ? null : g.genre.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GapLine({ label, salesPerDay, myPace }: { label: string; salesPerDay: number | null; myPace: number | null }) {
  if (salesPerDay == null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0' }}>
        <span style={{ color: 'rgba(30,45,61,0.55)' }}>{label}</span>
        <span style={{ color: '#9CA3AF' }}>—</span>
      </div>
    )
  }
  const gap = myPace != null ? Math.round((salesPerDay - myPace) * 10) / 10 : null
  const within = gap != null && gap <= 0
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, padding: '5px 0' }}>
      <span style={{ color: 'rgba(30,45,61,0.55)' }}>{label}</span>
      <span style={{ color: NAVY, fontWeight: 700 }}>
        ~{salesPerDay}/day
        {gap != null && (
          <span style={{ fontWeight: 600, marginLeft: 6, color: within ? '#16a34a' : '#B57812' }}>
            {within ? 'within reach' : `+${gap} needed`}
          </span>
        )}
      </span>
    </div>
  )
}

function GenreCard({ data, myPace, open, onToggle }: {
  data: GenrePulse; myPace: number | null; open: boolean; onToggle: () => void
}) {
  const { genre, latest, prevStats } = data
  const stats = latest?.stats ?? null

  // Trope ordering: focus tropes first, then by count.
  const tropes = useMemo(() => {
    if (!stats) return [] as { name: string; count: number; delta: number | null }[]
    const entries = Object.entries(stats.tropeCounts)
      .map(([name, count]) => ({
        name, count,
        delta: prevStats?.tropeCounts ? count - (prevStats.tropeCounts[name] ?? 0) : null,
      }))
      .sort((a, b) => {
        const af = genre.focusTropes.includes(a.name) ? 1 : 0
        const bf = genre.focusTropes.includes(b.name) ? 1 : 0
        if (af !== bf) return bf - af
        return b.count - a.count
      })
    return entries.slice(0, 6)
  }, [stats, prevStats, genre.focusTropes])

  return (
    <div style={{ ...card, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 19, color: NAVY, margin: 0 }}>{genre.label}</h2>
        {latest && (
          <span style={{ fontSize: 10.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
            scanned {fmtDate(latest.capturedAt)}
          </span>
        )}
      </div>

      {!latest || !stats ? (
        <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: '12px 0 0' }}>
          No scan yet for this genre.
        </p>
      ) : (
        <>
          {/* Entry thresholds */}
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(30,45,61,0.4)', margin: '14px 0 2px' }}>
            What it takes here
          </p>
          <GapLine label="#1 in category"   salesPerDay={stats.thresholds.rank1.salesPerDay}  myPace={myPace} />
          <GapLine label="Top 10"           salesPerDay={stats.thresholds.rank10.salesPerDay} myPace={myPace} />
          <GapLine label="Top 50"           salesPerDay={stats.thresholds.rank50.salesPerDay} myPace={myPace} />

          {/* Market shape */}
          <div style={{ display: 'flex', gap: 14, margin: '10px 0 0', fontSize: 12 }}>
            {stats.modalPrice != null && (
              <span style={{ color: 'rgba(30,45,61,0.7)' }}>
                Modal price <strong style={{ color: NAVY }}>${stats.modalPrice.toFixed(2)}</strong>
              </span>
            )}
            {stats.kuShare != null && stats.kuShare > 0 && (
              <span style={{ color: 'rgba(30,45,61,0.7)' }}>
                KU-visible <strong style={{ color: NAVY }}>{Math.round(stats.kuShare * 100)}%</strong>
              </span>
            )}
          </div>

          {/* Trope pulse */}
          {tropes.length > 0 && (
            <>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(30,45,61,0.4)', margin: '14px 0 6px' }}>
                Trope pulse (top 100)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tropes.map(t => (
                  <span key={t.name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                    background: genre.focusTropes.includes(t.name) ? 'rgba(233,160,32,0.12)' : 'rgba(30,45,61,0.05)',
                    color: genre.focusTropes.includes(t.name) ? '#B57812' : 'rgba(30,45,61,0.65)',
                  }}>
                    {t.name} · {t.count}
                    {t.delta != null && t.delta !== 0 && (
                      t.delta > 0
                        ? <TrendingUp size={11} color="#16a34a" />
                        : <TrendingDown size={11} color="#F97B6B" />
                    )}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Top 10 expandable */}
          <button
            onClick={onToggle}
            style={{
              marginTop: 14, alignSelf: 'flex-start', fontSize: 12, fontWeight: 700,
              color: AMBER, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            {open ? 'Hide top 10' : 'See top 10 →'}
          </button>
          {open && (
            <div style={{ marginTop: 8, borderTop: '0.5px solid rgba(30,45,61,0.08)' }}>
              {latest.rows.slice(0, 10).map(r => (
                <div key={r.rank} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '6px 0', borderBottom: '0.5px solid rgba(30,45,61,0.05)', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: 'rgba(30,45,61,0.4)', width: 22, flexShrink: 0 }}>#{r.rank}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {r.asin ? (
                      <a href={`https://www.amazon.com/dp/${r.asin}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: NAVY, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 220, verticalAlign: 'bottom' }}>{r.title}</span>
                        <ExternalLink size={10} color="#9CA3AF" style={{ flexShrink: 0 }} />
                      </a>
                    ) : (
                      <span style={{ color: NAVY, fontWeight: 600 }}>{r.title}</span>
                    )}
                    {r.author && <span style={{ color: 'rgba(30,45,61,0.45)' }}> · {r.author}</span>}
                  </div>
                  {r.price != null && <span style={{ color: 'rgba(30,45,61,0.55)', flexShrink: 0 }}>${r.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
