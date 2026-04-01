'use client'
// app/(dashboard)/meta/page.tsx
import { useEffect, useState } from 'react'
import { DarkPage, DarkKPIStrip, DarkCoachBox } from '@/components/DarkPage'
import type { Analysis, MetaAd } from '@/types'

const STATUS_STYLE: Record<MetaAd['status'], { bg: string; text: string; label: string }> = {
  SCALE: { bg: 'rgba(52,211,153,0.12)', text: '#34d399', label: '🟢 SCALE' },
  WATCH: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', label: '🟡 WATCH' },
  CUT: { bg: 'rgba(251,113,133,0.12)', text: '#fb7185', label: '🔴 CUT' },
  DELETE: { bg: 'rgba(251,113,133,0.15)', text: '#fb7185', label: '🔴 DELETE' },
  LOW_DATA: { bg: 'rgba(56,189,248,0.12)', text: '#38bdf8', label: '◇ LOW DATA' },
}

export default function MetaPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.json())
      .then(d => { if (d.analyses?.[0]) setAnalysis(d.analyses[0].data || d.analyses[0]) })
  }, [])

  const meta = analysis?.meta
  const coach = (analysis as any)?.metaCoach

  return (
    <DarkPage title="📣 Meta Ads" subtitle="Facebook Ads · Performance · Hook Scoring · Action Plan">
      {!meta ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📣</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>No Meta data yet</div>
          <p className="text-sm mb-4">Upload your Meta Ads CSV to see your ad analysis</p>
          <a href="/dashboard/upload" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>Upload Files →</a>
        </div>
      ) : (
        <>
          <DarkKPIStrip cols={4} items={[
            { label: 'Total Spend', value: `$${meta.totalSpend}`, sub: 'This period', color: '#fb7185' },
            { label: 'Best CTR', value: `${meta.bestAd?.ctr || 0}%`, sub: meta.bestAd?.name || '—', color: '#34d399' },
            { label: 'Best CPC', value: `$${meta.bestAd?.cpc || 0}`, sub: 'Cost per click', color: '#fbbf24' },
            { label: 'Total Clicks', value: meta.totalClicks, sub: `${meta.avgCPC} avg CPC`, color: '#38bdf8' },
          ]} />

          {coach && <DarkCoachBox color="#fb7185">{coach}</DarkCoachBox>}

          {/* Ads Table */}
          <div className="rounded-xl overflow-hidden mb-5"
            style={{ background: '#1c1917', border: '1px solid #292524' }}>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: '#292524' }}>
                  {['Ad Name', 'Spend', 'Clicks', 'CTR', 'CPC', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                      style={{ color: '#a8a29e' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meta.ads.map((ad, i) => {
                  const s = STATUS_STYLE[ad.status]
                  const maxCTR = Math.max(...meta.ads.map(a => a.ctr), 1)
                  return (
                    <tr key={i} className="border-t hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold" style={{ color: '#fafaf9' }}>{ad.name}</div>
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#a8a29e' }}>${ad.spend}</td>
                      <td className="px-4 py-3 font-mono font-bold"
                        style={{ color: ad.clicks === 0 ? '#fb7185' : '#34d399' }}>
                        {ad.clicks}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono mb-1" style={{ color: ad.ctr >= 15 ? '#34d399' : ad.ctr >= 8 ? '#fbbf24' : '#fb7185' }}>
                          {ad.ctr}%
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: '#292524', width: '60px' }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${(ad.ctr / maxCTR) * 100}%`,
                              background: ad.ctr >= 15 ? '#34d399' : ad.ctr >= 8 ? '#fbbf24' : '#fb7185',
                            }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#a8a29e' }}>
                        {ad.cpc > 0 ? `$${ad.cpc}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: s.bg, color: s.text }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { type: 'scale', title: '↑ Scale', color: '#34d399', bg: 'rgba(52,211,153,0.05)', border: 'rgba(52,211,153,0.2)',
                items: ['Put $10+/day behind your best ad only', 'You have a proven winner — fund it', `${meta.bestAd?.name || 'Best ad'} at ${meta.bestAd?.ctr || 0}% CTR — extraordinary`] },
              { type: 'cut', title: '✕ Cut Now', color: '#fb7185', bg: 'rgba(251,113,133,0.05)', border: 'rgba(251,113,133,0.2)',
                items: meta.worstAds.map(a => `${a.name} — ${a.clicks === 0 ? 'zero clicks in 30 days' : 'underperforming'}`) },
              { type: 'fix', title: '⚠ Fix', color: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)',
                items: [`Increase daily budget from $${(meta.totalSpend / 30).toFixed(2)}/day to $10+/day`, 'Facebook needs volume to optimize', 'One winner + real budget = results'] },
              { type: 'test', title: '◇ Test Next', color: '#38bdf8', bg: 'rgba(56,189,248,0.05)', border: 'rgba(56,189,248,0.2)',
                items: ['Grumpy protector hook — untested', 'Carousel version of your winner', 'Slow-burn yearning static image'] },
            ].map(card => (
              <div key={card.type} className="rounded-xl p-4"
                style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                <h3 className="text-[11px] font-bold uppercase tracking-[1px] mb-3"
                  style={{ color: card.color }}>{card.title}</h3>
                <ul className="list-none p-0 space-y-1.5">
                  {card.items.map((item, i) => (
                    <li key={i} className="text-[12px] leading-snug" style={{ color: '#d6d3d1' }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </DarkPage>
  )
}
