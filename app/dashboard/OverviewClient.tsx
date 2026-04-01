'use client'
// app/dashboard/OverviewClient.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Analysis } from '@/types'
import { ActionItem } from '@/components/ui'

const CHANNEL_CARDS = [
  { key: 'kdp',       href: '/dashboard/kdp',       icon: '📚', name: 'KDP',        colorClass: 'border-t-amber-brand' },
  { key: 'meta',      href: '/dashboard/meta',      icon: '📣', name: 'Meta Ads',   colorClass: 'border-t-blue-500' },
  { key: 'mailerlite',href: '/dashboard/mailerlite',icon: '📧', name: 'MailerLite', colorClass: 'border-t-emerald-500' },
  { key: 'swaps',     href: '/dashboard/swaps',     icon: '🔁', name: 'Swaps',      colorClass: 'border-t-pink-500' },
  { key: 'pinterest', href: '/dashboard/pinterest', icon: '📌', name: 'Pinterest',  colorClass: 'border-t-red-500' },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  GREEN: { bg: 'bg-emerald-50', text: 'text-emerald-800', label: '🟢 Growing' },
  AMBER: { bg: 'bg-amber-50',   text: 'text-amber-800',   label: '🟡 Watch' },
  RED:   { bg: 'bg-red-50',     text: 'text-red-800',     label: '🔴 Fix this' },
  NEW:   { bg: 'bg-blue-50',    text: 'text-blue-800',    label: '🔵 Starting' },
}

function fmt(n: number | undefined, prefix = '', decimals = 0) {
  if (n == null) return '—'
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}`
}

function Trend({ curr, prev }: { curr?: number; prev?: number }) {
  if (curr == null || prev == null || prev === 0) return <span className="text-stone-400">—</span>
  const pct = ((curr - prev) / prev) * 100
  const up  = pct >= 0
  return (
    <span className={`text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export function OverviewClient() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.json())
      .then(d => {
        if (d.analyses?.length) {
          setAnalyses(d.analyses.map((a: { data?: Analysis }) => a.data || a))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const analysis = analyses[0] ?? null
  const channelScoreMap = new Map(analysis?.channelScores?.map(s => [s.channel, s]) || [])

  // Month label — show from the analysis or fall back to current month
  const monthLabel = analysis?.month
    ? new Date(analysis.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Banner */}
      <div className="rounded-xl p-6 mb-6 flex items-center justify-between"
        style={{ background: '#0d1f35' }}>
        <div>
          <div className="text-[10px] font-bold tracking-[2px] uppercase mb-2" style={{ color: '#e9a020' }}>
            {monthLabel}
          </div>
          <div className="font-serif text-[22px] text-white leading-snug mb-1">
            {analysis?.overallVerdict || 'Your books are growing. One ad is your winner. Build on it.'}
          </div>
          <div className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {analysis
              ? `Analyzed ${new Date(analysis.generatedAt).toLocaleDateString()}`
              : 'Upload your files to get started'}
            {' · '}
            <Link href="/dashboard/upload" className="text-amber-brand no-underline hover:underline">
              Upload new files →
            </Link>
          </div>
        </div>
        <div className="flex gap-2.5">
          {[
            { label: 'Units Sold',  value: fmt(analysis?.kdp?.totalUnits) },
            { label: 'KENP Reads',  value: fmt(analysis?.kdp?.totalKENP) },
            { label: 'Royalties',   value: analysis?.kdp ? `$${analysis.kdp.totalRoyaltiesUSD}` : '—' },
          ].map(stat => (
            <div key={stat.label} className="px-4 py-3 text-center rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="font-serif text-[22px] text-white tracking-tight">{stat.value}</div>
              <div className="text-[9.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Cards */}
      <div className="mb-1">
        <h2 className="font-serif text-[18px] text-[#0d1f35] mb-1">
          Your channels — click any for the full deep dive
        </h2>
        <p className="text-[12px] text-stone-400 mb-4">
          Each channel has a detailed analysis with your coach's recommendations
        </p>
      </div>
      <div className="grid grid-cols-5 gap-3 mb-7">
        {CHANNEL_CARDS.map(card => {
          const score = channelScoreMap.get(card.key)
          const badge = score ? STATUS_BADGE[score.status] : STATUS_BADGE.NEW
          return (
            <Link key={card.key} href={card.href}
              className={`card p-4 cursor-pointer hover:-translate-y-0.5 transition-all
                          border-t-[3px] ${card.colorClass} no-underline animate-fade-up`}>
              <span className="text-2xl mb-2.5 block">{card.icon}</span>
              <div className="text-[10.5px] font-bold tracking-[0.8px] uppercase text-stone-400 mb-1">
                {card.name}
              </div>
              <div className="font-serif text-[22px] text-[#0d1f35] tracking-tight leading-none mb-1.5">
                {score?.metric || '—'}
              </div>
              <div className="text-[11px] text-stone-500 leading-snug mb-2.5">
                {score?.subline || 'Upload files to analyze'}
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Action Plan */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif text-[18px] text-[#0d1f35]">Your action plan — do these in order</h2>
        <span className="text-[12px] text-stone-400">Based on your real data</span>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-stone-400 text-sm">Loading your analysis...</div>
      ) : !analysis?.actionPlan?.length ? (
        <div className="card p-8 text-center">
          <div className="text-2xl mb-3">⚡</div>
          <div className="font-serif text-lg text-[#0d1f35] mb-2">
            Upload your files to get your coaching session
          </div>
          <p className="text-sm text-stone-500 mb-4">
            Drop your KDP report, Meta export, and Pinterest CSV to get a personalized action plan.
          </p>
          <Link href="/dashboard/upload" className="btn-primary no-underline inline-block">
            Upload Files →
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden mb-7">
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ background: '#0d1f35' }}>
            <div>
              <div className="font-serif text-[16px] text-white">
                What your marketing coach says to do right now
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Ranked by priority · Based on your real numbers
              </div>
            </div>
          </div>
          <div>
            {analysis.actionPlan.map((item, i) => (
              <ActionItem
                key={i}
                priority={item.priority}
                type={item.type}
                title={item.title}
                body={item.body}
                action={item.action}
              />
            ))}
          </div>
        </div>
      )}

      {/* History section — only shown when we have 2+ months */}
      {analyses.length >= 2 && (
        <>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-[18px] text-[#0d1f35]">How you're tracking over time</h2>
            <span className="text-[12px] text-stone-400">Last {analyses.length} months</span>
          </div>
          <div className="card overflow-hidden mb-6">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: '#0d1f35' }}>
                  <th className="text-left px-5 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Month
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Royalties
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Units
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    KENP
                  </th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Ad Spend
                  </th>
                  <th className="text-right px-5 py-3 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Subscribers
                  </th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a, i) => {
                  const prev = analyses[i + 1]
                  const label = new Date(a.month + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  const isCurrent = i === 0
                  return (
                    <tr key={a.month}
                      className="border-t border-stone-100"
                      style={{ background: isCurrent ? 'rgba(233,160,32,0.04)' : undefined }}>
                      <td className="px-5 py-3.5 font-semibold text-[#0d1f35]">
                        {label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(233,160,32,0.15)', color: '#e9a020' }}>
                            Latest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">
                          {a.kdp ? `$${a.kdp.totalRoyaltiesUSD}` : '—'}
                        </div>
                        {!isCurrent ? null : (
                          <Trend curr={a.kdp?.totalRoyaltiesUSD} prev={prev?.kdp?.totalRoyaltiesUSD} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.kdp?.totalUnits)}</div>
                        {!isCurrent ? null : (
                          <Trend curr={a.kdp?.totalUnits} prev={prev?.kdp?.totalUnits} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.kdp?.totalKENP)}</div>
                        {!isCurrent ? null : (
                          <Trend curr={a.kdp?.totalKENP} prev={prev?.kdp?.totalKENP} />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">
                          {a.meta ? `$${a.meta.totalSpend}` : '—'}
                        </div>
                        {!isCurrent ? null : (
                          <Trend curr={a.meta?.totalSpend} prev={prev?.meta?.totalSpend} />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.mailerLite?.listSize)}</div>
                        {!isCurrent ? null : (
                          <Trend curr={a.mailerLite?.listSize} prev={prev?.mailerLite?.listSize} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
