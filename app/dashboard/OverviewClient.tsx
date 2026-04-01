'use client'
// app/dashboard/OverviewClient.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Analysis, RankLog, RoasLog } from '@/types'
import { ActionItem } from '@/components/ui'

const CHANNEL_CARDS = [
  { key: 'kdp',        href: '/dashboard/kdp',        icon: '📚', name: 'KDP',        colorClass: 'border-t-amber-brand' },
  { key: 'meta',       href: '/dashboard/meta',        icon: '📣', name: 'Meta Ads',   colorClass: 'border-t-blue-500' },
  { key: 'mailerlite', href: '/dashboard/mailerlite',  icon: '📧', name: 'MailerLite', colorClass: 'border-t-emerald-500' },
  { key: 'swaps',      href: '/dashboard/swaps',       icon: '🔁', name: 'Swaps',      colorClass: 'border-t-pink-500' },
  { key: 'pinterest',  href: '/dashboard/pinterest',   icon: '📌', name: 'Pinterest',  colorClass: 'border-t-red-500' },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  GREEN: { bg: 'bg-emerald-50', text: 'text-emerald-800', label: '🟢 Growing' },
  AMBER: { bg: 'bg-amber-50',   text: 'text-amber-800',   label: '🟡 Watch' },
  RED:   { bg: 'bg-red-50',     text: 'text-red-800',     label: '🔴 Fix this' },
  NEW:   { bg: 'bg-blue-50',    text: 'text-blue-800',    label: '🔵 Starting' },
}

// Hardcoded swap calendar (matches swaps/page.tsx)
const SWAP_CALENDAR = [
  { partner: 'Mandy Baker + Madison Brooke',     date: 'Apr 1',  direction: 'Inbound',          list: '1,038 / 1,532', status: 'Applied' },
  { partner: 'Chloe Horne #3',                   date: 'Apr 6',  direction: 'Inbound + Outbound',list: '8,198',         status: 'Approved' },
  { partner: 'Zoe Dawson + Ava Bloome + 4 more', date: 'Apr 6',  direction: 'Outbound',          list: 'Various',       status: 'Approved' },
  { partner: 'Tessa Sloan',                      date: 'Apr 9',  direction: 'Inbound',           list: '4,288',         status: 'Applied — follow up' },
  { partner: 'Lisa Monroe + Lucy Barbee',        date: 'Apr 13', direction: 'Inbound',           list: 'Various',       status: 'Approved' },
  { partner: 'Rachel J. Green',                  date: 'Apr 18', direction: 'Inbound',           list: '9,451',         status: 'Applied — follow up' },
  { partner: 'Brandi Creek (FPA)',               date: 'Apr 21', direction: 'Inbound',           list: '2,703',         status: 'Approved' },
  { partner: 'Lily-Mae Montana',                 date: 'Apr 30', direction: 'Inbound + Outbound',list: '1,168',         status: 'Decision needed' },
]

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

function buildCoachPrompt(
  analysis: Analysis | null,
  rankLogs: RankLog[],
  roasLogs: RoasLog[],
): string {
  const lines: string[] = []
  const month = analysis?.month ?? new Date().toISOString().substring(0, 7)

  lines.push(`# My Publishing Marketing Data — ${month}`)
  lines.push(`I'm an indie romance author. Here's my full marketing data for the month. Please help me understand what it means and what I should do next.`)
  lines.push('')

  // ── KDP ──────────────────────────────────────────────
  if (analysis?.kdp) {
    const k = analysis.kdp
    lines.push('## KDP (Amazon Publishing) Results')
    lines.push(`Total royalties: $${k.totalRoyaltiesUSD}`)
    lines.push(`Total units sold: ${k.totalUnits}`)
    lines.push(`Total KENP reads: ${k.totalKENP?.toLocaleString()}`)
    if (k.summary) {
      lines.push(`Paid units: ${k.summary.paidUnits} | Free units: ${k.summary.freeUnits} | Paperback: ${k.summary.paperbackUnits}`)
    }
    if (k.books?.length) {
      lines.push('Books breakdown:')
      k.books.forEach(b => {
        lines.push(`  • ${b.title}: ${b.units} units, ${b.kenp} KENP reads, $${b.royalties} royalties`)
      })
    }
    lines.push('')
  }

  // ── Meta Ads ──────────────────────────────────────────
  if (analysis?.meta) {
    const m = analysis.meta
    lines.push('## Meta (Facebook) Ads')
    lines.push(`Total spend: $${m.totalSpend}`)
    lines.push(`Total clicks: ${m.totalClicks}`)
    lines.push(`Average CTR: ${m.avgCTR}%`)
    lines.push(`Average CPC: $${m.avgCPC}`)
    if (m.bestAd) {
      lines.push(`Best performing ad: "${m.bestAd.name}" — ${m.bestAd.ctr}% CTR, $${m.bestAd.cpc} CPC, ${m.bestAd.clicks} clicks`)
    }
    if (m.ads?.length) {
      lines.push('All ads:')
      m.ads.forEach(a => {
        lines.push(`  • "${a.name}": $${a.spend} spend, ${a.clicks} clicks, ${a.ctr}% CTR, $${a.cpc} CPC — Status: ${a.status}`)
      })
    }
    lines.push('')
  }

  // ── MailerLite ───────────────────────────────────────
  if (analysis?.mailerLite) {
    const ml = analysis.mailerLite
    lines.push('## Email List (MailerLite)')
    lines.push(`Subscribers: ${ml.listSize}`)
    lines.push(`Open rate: ${ml.openRate}%`)
    lines.push(`Click rate: ${ml.clickRate}%`)
    lines.push(`Unsubscribes: ${ml.unsubscribes}`)
    if (ml.campaigns?.length) {
      lines.push('Recent campaigns:')
      ml.campaigns.forEach(c => {
        lines.push(`  • "${c.name}" (${c.sentAt}): ${c.openRate}% open, ${c.clickRate}% click, ${c.unsubscribes} unsubs`)
      })
    }
    lines.push('')
  }

  // ── Newsletter Swaps ─────────────────────────────────
  lines.push('## Newsletter Swap Calendar (April)')
  SWAP_CALENDAR.forEach(s => {
    lines.push(`  • ${s.date} — ${s.partner} | ${s.direction} | List: ${s.list} | Status: ${s.status}`)
  })
  lines.push('')

  // ── Pinterest ─────────────────────────────────────────
  if (analysis?.pinterest) {
    const p = analysis.pinterest
    lines.push('## Pinterest')
    lines.push(`Total impressions: ${p.totalImpressions}`)
    lines.push(`Total saves: ${p.totalSaves}`)
    lines.push(`Total clicks: ${p.totalClicks}`)
    lines.push(`Pin count: ${p.pinCount}`)
    lines.push(`Save rate: ${p.saveRate}%`)
    lines.push(`Account age: ${p.accountAge}`)
    lines.push('')
  }

  // ── Rank Tracker ─────────────────────────────────────
  if (rankLogs.length) {
    lines.push('## Rank Tracker (Last 30 Days)')
    rankLogs.forEach(r => {
      const date = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      lines.push(`  • ${date} — ${r.book}: rank #${r.rank}`)
    })
    lines.push('')
  }

  // ── ROAS Log ─────────────────────────────────────────
  if (roasLogs.length) {
    lines.push('## Daily ROAS Log (Last 30 Days)')
    roasLogs.forEach(r => {
      const date = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const note = r.notes ? ` — Note: ${r.notes}` : ''
      lines.push(`  • ${date}: $${r.spend} spend, $${r.earnings} earnings, ${r.roas}x ROAS${note}`)
    })
    lines.push('')
  }

  // ── AI Coach's Existing Insights ─────────────────────
  if (analysis?.channelScores?.length) {
    lines.push('## Channel Health Scores (from my dashboard)')
    analysis.channelScores.forEach(s => {
      lines.push(`  • ${s.channel.toUpperCase()}: ${s.status} — ${s.metric} — ${s.subline}`)
    })
    lines.push('')
  }

  if (analysis?.actionPlan?.length) {
    lines.push('## Current Action Plan (from my dashboard)')
    analysis.actionPlan.forEach((item, i) => {
      lines.push(`  ${i + 1}. [${item.type}] ${item.title}: ${item.body}`)
    })
    lines.push('')
  }

  lines.push('---')
  lines.push('Based on this data, I want to ask you: [CURSOR]')

  return lines.join('\n')
}

// ── Modal ────────────────────────────────────────────────────────────────────
function CoachModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,31,53,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
          style={{ background: 'rgba(233,160,32,0.12)' }}>
          ✅
        </div>

        {/* Heading */}
        <h2 className="font-serif text-[22px] text-[#0d1f35] text-center leading-snug mb-2">
          Copied! Now open any AI and paste.
        </h2>
        <p className="text-[13px] text-stone-500 text-center leading-relaxed mb-7">
          Your data is on your clipboard. Open any AI assistant, paste it in, and type your question
          at the end where it says <span className="font-semibold text-[#0d1f35]">[CURSOR]</span>.
          Works with Claude, ChatGPT, Gemini — any AI you like.
        </p>

        {/* AI buttons */}
        <div className="space-y-2.5 mb-5">
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-5 py-3.5 rounded-xl font-semibold
                       text-[14px] transition-all duration-150 no-underline hover:opacity-90"
            style={{ background: '#0d1f35', color: '#fff' }}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-lg">🟠</span> Open Claude.ai
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
          </a>
          <a
            href="https://chat.openai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-5 py-3.5 rounded-xl font-semibold
                       text-[14px] transition-all duration-150 no-underline hover:opacity-90"
            style={{ background: '#10a37f', color: '#fff' }}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-lg">🟢</span> Open ChatGPT
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
          </a>
          <a
            href="https://gemini.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-5 py-3.5 rounded-xl font-semibold
                       text-[14px] transition-all duration-150 no-underline hover:opacity-90"
            style={{ background: '#4285f4', color: '#fff' }}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-lg">🔵</span> Open Gemini
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full text-[13px] text-stone-400 hover:text-stone-600 transition-colors py-1"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function OverviewClient() {
  const [analyses,  setAnalyses]  = useState<Analysis[]>([])
  const [rankLogs,  setRankLogs]  = useState<RankLog[]>([])
  const [roasLogs,  setRoasLogs]  = useState<RoasLog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [copying,   setCopying]   = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze').then(r => r.json()).catch(() => ({})),
      fetch('/api/rank').then(r => r.json()).catch(() => ({ logs: [] })),
      fetch('/api/roas').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([analyzeData, rankData, roasData]) => {
      if (analyzeData.analyses?.length) {
        setAnalyses(analyzeData.analyses.map((a: { data?: Analysis }) => a.data || a))
      }
      setRankLogs(rankData.logs ?? [])
      setRoasLogs(roasData.logs ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const analysis = analyses[0] ?? null
  const channelScoreMap = new Map(analysis?.channelScores?.map(s => [s.channel, s]) || [])

  const monthLabel = analysis?.month
    ? new Date(analysis.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  async function handleCopyPrompt() {
    setCopying(true)
    try {
      const prompt = buildCoachPrompt(analysis, rankLogs, roasLogs)
      await navigator.clipboard.writeText(prompt)
      setShowModal(true)
    } catch {
      // Fallback for browsers that block clipboard
      alert('Could not copy automatically. Try right-clicking and copying manually.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Modal */}
      {showModal && <CoachModal onClose={() => setShowModal(false)} />}

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
            { label: 'Units Sold', value: fmt(analysis?.kdp?.totalUnits) },
            { label: 'KENP Reads', value: fmt(analysis?.kdp?.totalKENP) },
            { label: 'Royalties',  value: analysis?.kdp ? `$${analysis.kdp.totalRoyaltiesUSD}` : '—' },
          ].map(stat => (
            <div key={stat.label} className="px-4 py-3 text-center rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="font-serif text-[22px] text-white tracking-tight">{stat.value}</div>
              <div className="text-[9.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Coach button */}
      <div className="mb-7">
        <button
          onClick={handleCopyPrompt}
          disabled={copying || !analysis}
          className="flex items-center gap-3 px-6 py-4 rounded-xl text-[15px] font-bold
                     transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                     hover:-translate-y-0.5 hover:shadow-lg w-full justify-between"
          style={{ background: 'linear-gradient(135deg, #1a3352 0%, #0d1f35 100%)', color: '#fff', border: '1px solid rgba(233,160,32,0.3)' }}
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <span>
              <span className="block text-[15px]">Talk to an AI coach about this data</span>
              <span className="block text-[11.5px] font-normal mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Copies all your numbers to clipboard — paste into any AI assistant
              </span>
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold flex-shrink-0"
            style={{ color: '#e9a020' }}>
            {copying ? 'Copying...' : 'Copy & open →'}
          </span>
        </button>
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
          <div className="px-5 py-3.5" style={{ background: '#0d1f35' }}>
            <div className="font-serif text-[16px] text-white">
              What your marketing coach says to do right now
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Ranked by priority · Based on your real numbers
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

      {/* History table — only shown when we have 2+ months */}
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
                  {['Month', 'Royalties', 'Units', 'KENP', 'Ad Spend', 'Subscribers'].map((h, i) => (
                    <th key={h}
                      className={`py-3 font-semibold ${i === 0 ? 'text-left px-5' : 'text-right px-4'}`}
                      style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyses.map((a, i) => {
                  const prev = analyses[i + 1]
                  const label = new Date(a.month + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  const isCurrent = i === 0
                  return (
                    <tr key={a.month} className="border-t border-stone-100"
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
                        <div className="font-semibold text-[#0d1f35]">{a.kdp ? `$${a.kdp.totalRoyaltiesUSD}` : '—'}</div>
                        {isCurrent && <Trend curr={a.kdp?.totalRoyaltiesUSD} prev={prev?.kdp?.totalRoyaltiesUSD} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.kdp?.totalUnits)}</div>
                        {isCurrent && <Trend curr={a.kdp?.totalUnits} prev={prev?.kdp?.totalUnits} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.kdp?.totalKENP)}</div>
                        {isCurrent && <Trend curr={a.kdp?.totalKENP} prev={prev?.kdp?.totalKENP} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{a.meta ? `$${a.meta.totalSpend}` : '—'}</div>
                        {isCurrent && <Trend curr={a.meta?.totalSpend} prev={prev?.meta?.totalSpend} />}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.mailerLite?.listSize)}</div>
                        {isCurrent && <Trend curr={a.mailerLite?.listSize} prev={prev?.mailerLite?.listSize} />}
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
