'use client'
// app/dashboard/kdp/page.tsx
import { useEffect, useState } from 'react'
import { DarkPage, DarkKPIStrip, DarkCoachBox } from '@/components/DarkPage'
import { BarChart } from '@/components/ui'
import type { Analysis, DailyData, RoasLog } from '@/types'

// ── Ad Overlay Sparkline ─────────────────────────────────────────────────────
function AdOverlaySparkline({
  dailyUnits,
  roasLogs,
  color = '#fb7185',
  height = 64,
}: {
  dailyUnits: DailyData[]
  roasLogs: RoasLog[]
  color?: string
  height?: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Build spend map: YYYY-MM-DD → total spend that day
  const spendByDate = new Map<string, number>()
  roasLogs.forEach(r => {
    const date = new Date(r.date).toISOString().split('T')[0]
    spendByDate.set(date, (spendByDate.get(date) ?? 0) + r.spend)
  })

  const max = Math.max(...dailyUnits.map(d => d.value), 1)

  // Correlation: avg units on ad days vs no-ad days
  const withAds    = dailyUnits.filter(d => (spendByDate.get(d.date) ?? 0) > 0)
  const withoutAds = dailyUnits.filter(d => !((spendByDate.get(d.date) ?? 0) > 0))
  const avg = (arr: DailyData[]) =>
    arr.length ? arr.reduce((s, d) => s + d.value, 0) / arr.length : 0
  const avgWith    = avg(withAds)
  const avgWithout = avg(withoutAds)
  const correlation = withAds.length > 0 && avgWithout > 0
    ? Math.round(((avgWith - avgWithout) / avgWithout) * 100)
    : null

  return (
    <div>
      {/* Chart container */}
      <div className="relative">
        {/* Bars row */}
        <div className="flex items-end gap-[2px]" style={{ height }}>
          {dailyUnits.map((d, i) => {
            const spend    = spendByDate.get(d.date) ?? 0
            const barPct   = Math.max((d.value / max) * 100, 3)
            const isHovered = hoveredIdx === i

            return (
              <div
                key={i}
                className="relative flex-1 flex items-end"
                style={{ height: '100%', minWidth: 3 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Bar */}
                <div
                  className="w-full rounded-t-sm transition-opacity duration-100"
                  style={{
                    height: `${barPct}%`,
                    background: color,
                    opacity: isHovered ? 1 : 0.72,
                  }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-20 rounded-lg px-3 py-2.5 text-[11.5px]
                               whitespace-nowrap pointer-events-none shadow-xl"
                    style={{
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0c0a09',
                      border: '1px solid #44403c',
                      color: '#fafaf9',
                    }}
                  >
                    <div className="font-semibold mb-1" style={{ color: '#a8a29e' }}>{d.date}</div>
                    <div style={{ color }}>
                      {d.value} unit{d.value !== 1 ? 's' : ''} sold
                    </div>
                    {spend > 0
                      ? <div style={{ color: '#34d399' }}>${spend.toFixed(2)} ad spend</div>
                      : <div style={{ color: '#57534e' }}>No ads running</div>
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Green ad-spend strip — 3px, below bars */}
        <div className="flex gap-[2px] mt-[3px]">
          {dailyUnits.map((d, i) => {
            const hasSpend = (spendByDate.get(d.date) ?? 0) > 0
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: 3,
                  minWidth: 3,
                  background: hasSpend ? '#34d399' : 'transparent',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Date range */}
      <div className="flex justify-between mt-2 text-[10.5px]" style={{ color: '#57534e' }}>
        <span>{dailyUnits[0]?.date}</span>
        <span>{dailyUnits[dailyUnits.length - 1]?.date}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2.5 text-[10.5px]" style={{ color: '#78716c' }}>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 10, height: 10, background: color, borderRadius: 2, opacity: 0.8 }} />
          Units sold
        </span>
        <span style={{ color: '#44403c' }}>|</span>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 14, height: 3, background: '#34d399', borderRadius: 2 }} />
          Ad spend active
        </span>
      </div>

      {/* Correlation insight */}
      {correlation !== null && (
        <div
          className="mt-4 rounded-lg px-4 py-3 text-[12.5px] leading-snug"
          style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}
        >
          <span style={{ color: '#34d399' }}>
            Days with ads running:{' '}
            <strong>{correlation >= 0 ? '+' : ''}{correlation}% {correlation >= 0 ? 'higher' : 'lower'} sales</strong>
          </span>
          <span style={{ color: '#78716c' }}> than days without ads</span>
          {withAds.length > 0 && withoutAds.length > 0 && (
            <span style={{ color: '#57534e' }}>
              {' '}({avgWith.toFixed(1)} avg vs {avgWithout.toFixed(1)} avg)
            </span>
          )}
        </div>
      )}

      {/* No ROAS data note */}
      {roasLogs.length === 0 && (
        <p className="mt-3 text-[11.5px]" style={{ color: '#57534e' }}>
          Log your daily ad spend in the ROAS tracker to see the ad spend overlay.
        </p>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function KDPPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [roasLogs, setRoasLogs] = useState<RoasLog[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze').then(r => r.json()).catch(() => ({})),
      fetch('/api/roas').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([analyzeData, roasData]) => {
      if (analyzeData.analyses?.[0]) {
        setAnalysis(analyzeData.analyses[0].data || analyzeData.analyses[0])
      }
      setRoasLogs(roasData.logs ?? [])
    })
  }, [])

  const kdp   = analysis?.kdp
  const coach = (analysis as any)?.kdpCoach

  return (
    <DarkPage title="📚 KDP — Sales & Royalties" subtitle="Kindle Direct Publishing · Units sold, KENP reads, royalties">
      {!kdp ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📚</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>No KDP data yet</div>
          <p className="text-sm mb-4">Upload your KDP Excel report to see your analysis</p>
          <a href="/dashboard/upload" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>
            Upload Files →
          </a>
        </div>
      ) : (
        <>
          <DarkKPIStrip cols={5} items={[
            { label: 'Total Royalties', value: `$${kdp.totalRoyaltiesUSD}`, sub: 'USD this month',         color: '#fb7185' },
            { label: 'Total Units',     value: kdp.totalUnits,               sub: 'eBooks + paperback',     color: '#38bdf8' },
            { label: 'KENP Reads',      value: kdp.totalKENP?.toLocaleString(), sub: `~$${Math.round(kdp.totalKENP * 0.0045)} est. KU earnings`, color: '#fbbf24' },
            { label: 'MOLR Units',      value: kdp.books.find(b => b.asin === 'B0GSC2RTF8')?.units || 0,  sub: 'My Off-Limits Roommate',  color: '#34d399' },
            { label: 'FDMBP Units',     value: kdp.books.find(b => b.asin === 'B0GQD4J6VT')?.units || 0,  sub: 'Fake Dating Billionaire', color: '#a78bfa' },
          ]} />

          {coach && <DarkCoachBox color="#fbbf24">{coach}</DarkCoachBox>}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>Units by Book</h3>
              <BarChart
                items={kdp.books.map(b => ({ label: b.shortTitle, value: b.units, formatted: `${b.units}` }))}
                color="#fb7185"
              />
            </div>
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>KENP by Book</h3>
              <BarChart
                items={kdp.books.map(b => ({ label: b.shortTitle, value: b.kenp, formatted: b.kenp.toLocaleString() }))}
                color="#fbbf24"
              />
            </div>
          </div>

          <div className="rounded-xl p-5 mb-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
            <h3 className="text-[13.5px] font-semibold mb-1" style={{ color: '#d6d3d1' }}>Daily Units Sold</h3>
            <p className="text-[11px] mb-4" style={{ color: '#a8a29e' }}>
              Peak day:{' '}
              {[...kdp.dailyUnits].sort((a, b) => b.value - a.value)[0]?.date} —{' '}
              {[...kdp.dailyUnits].sort((a, b) => b.value - a.value)[0]?.value} units
              {' · '}
              Hover any bar for details
            </p>
            <AdOverlaySparkline
              dailyUnits={kdp.dailyUnits}
              roasLogs={roasLogs}
              color="#fb7185"
              height={64}
            />
          </div>
        </>
      )}
    </DarkPage>
  )
}
