'use client'
// app/dashboard/OverviewClient.tsx
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Analysis, RankLog, RoasLog, ChannelScore, CoachingInsight } from '@/types'
import { getCoachTitle } from '@/lib/coachTitle'

// coach title is set per-mount so it changes on every page load
import { ActionItem } from '@/components/ui'
import { FreshBanner } from '@/components/FreshBanner'
import { OnboardingBanner } from '@/components/OnboardingBanner'
import { SortablePage } from '@/components/SortablePage'
import { IconKDP, IconMeta, IconMailerLite, IconSwaps, IconPinterest } from '@/components/icons'
import { OnboardingFlow } from '@/components/OnboardingFlow'

const CHANNEL_CARDS = [
  { key: 'kdp',        href: '/dashboard/kdp',        icon: IconKDP,       iconColor: '#E9A020', name: 'KDP',        colorClass: 'border-t-amber-brand' },
  { key: 'meta',       href: '/dashboard/meta',        icon: IconMeta,      iconColor: '#38bdf8', name: 'Meta Ads',   colorClass: 'border-t-blue-500' },
  { key: 'mailerlite', href: '/dashboard/mailerlite',  icon: IconMailerLite, iconColor: '#34d399', name: 'MailerLite', colorClass: 'border-t-emerald-500' },
  { key: 'swaps',      href: '/dashboard/swaps',       icon: IconSwaps,     iconColor: '#E9A020', name: 'Swaps',      colorClass: 'border-t-amber-brand' },
  { key: 'pinterest',  href: '/dashboard/pinterest',   icon: IconPinterest, iconColor: '#fb7185', name: 'Pinterest',  colorClass: 'border-t-red-500' },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  GREEN:  { bg: 'bg-emerald-50', text: 'text-emerald-800', label: '🟢 Growing' },
  AMBER:  { bg: 'bg-amber-50',   text: 'text-amber-800',   label: '🟡 Watch' },
  YELLOW: { bg: 'bg-amber-50',   text: 'text-amber-800',   label: '🟡 Watch' },
  RED:    { bg: 'bg-red-50',     text: 'text-red-800',     label: '🔴 Fix this' },
  NEW:    { bg: 'bg-blue-50',    text: 'text-blue-800',    label: '🔵 Starting' },
}

// Hardcoded swap calendar (matches swaps/page.tsx)
const SWAP_CALENDAR = [
  { partner: 'Mandy Baker + Madison Brooke',     date: 'Apr 1',  direction: 'Inbound',           list: '1,038 / 1,532', status: 'Applied' },
  { partner: 'Chloe Horne #3',                   date: 'Apr 6',  direction: 'Inbound + Outbound', list: '8,198',         status: 'Approved' },
  { partner: 'Zoe Dawson + Ava Bloome + 4 more', date: 'Apr 6',  direction: 'Outbound',           list: 'Various',       status: 'Approved' },
  { partner: 'Tessa Sloan',                      date: 'Apr 9',  direction: 'Inbound',            list: '4,288',         status: 'Applied — follow up' },
  { partner: 'Lisa Monroe + Lucy Barbee',        date: 'Apr 13', direction: 'Inbound',            list: 'Various',       status: 'Approved' },
  { partner: 'Rachel J. Green',                  date: 'Apr 18', direction: 'Inbound',            list: '9,451',         status: 'Applied — follow up' },
  { partner: 'Brandi Creek (FPA)',               date: 'Apr 21', direction: 'Inbound',            list: '2,703',         status: 'Approved' },
  { partner: 'Lily-Mae Montana',                 date: 'Apr 30', direction: 'Inbound + Outbound', list: '1,168',         status: 'Decision needed' },
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
  lines.push(`I'm an indie author. Here's my full marketing data for the month.`)
  lines.push('')

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

  if (analysis?.meta) {
    const m = analysis.meta
    lines.push('## Meta (Facebook) Ads')
    lines.push(`Total spend: $${m.totalSpend}`)
    lines.push(`Total clicks: ${m.totalClicks}`)
    lines.push(`Average CTR: ${m.avgCTR}%`)
    lines.push(`Average CPC: $${m.avgCPC}`)
    if (m.bestAd) {
      lines.push(`Best ad: "${m.bestAd.name}" — ${m.bestAd.ctr}% CTR, $${m.bestAd.cpc} CPC, ${m.bestAd.clicks} clicks`)
    }
    if (m.ads?.length) {
      lines.push('All ads:')
      m.ads.forEach(a => {
        lines.push(`  • "${a.name}": $${a.spend} spend, ${a.clicks} clicks, ${a.ctr}% CTR, $${a.cpc} CPC — ${a.status}`)
      })
    }
    lines.push('')
  }

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

  lines.push('## Newsletter Swap Calendar (April)')
  SWAP_CALENDAR.forEach(s => {
    lines.push(`  • ${s.date} — ${s.partner} | ${s.direction} | List: ${s.list} | Status: ${s.status}`)
  })
  lines.push('')

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

  if (rankLogs.length) {
    lines.push('## Rank Tracker (Last 30 Days)')
    rankLogs.forEach(r => {
      const date = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      lines.push(`  • ${date} — ${r.book}: rank #${r.rank}`)
    })
    lines.push('')
  }

  if (roasLogs.length) {
    lines.push('## Daily ROAS Log (Last 30 Days)')
    roasLogs.forEach(r => {
      const date = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const note = r.notes ? ` — ${r.notes}` : ''
      lines.push(`  • ${date}: $${r.spend} spend, $${r.earnings} earnings, ${r.roas}x ROAS${note}`)
    })
    lines.push('')
  }

  if (analysis?.channelScores?.length) {
    lines.push('## Channel Health Scores')
    analysis.channelScores.forEach(s => {
      lines.push(`  • ${s.channel.toUpperCase()}: ${s.status} — ${s.metric} — ${s.subline}`)
    })
    lines.push('')
  }

  if (analysis?.actionPlan?.length) {
    lines.push('## Current Action Plan')
    analysis.actionPlan.forEach((item, i) => {
      lines.push(`  ${i + 1}. [${item.type}] ${item.title}: ${item.body}`)
    })
    lines.push('')
  }

  lines.push('---')
  lines.push('Based on everything above, I want to ask you:')

  return lines.join('\n')
}

// ── What Happened card ──────────────────────────────────────────────────────
function buildChanges(current: Analysis, previous: Analysis) {
  const changes: { label: string; direction: 'up' | 'down' | 'flat'; detail: string }[] = []

  if (current.kdp && previous.kdp) {
    const cr = current.kdp.totalRoyaltiesUSD, pr = previous.kdp.totalRoyaltiesUSD
    const pct = pr > 0 ? Math.round(((cr - pr) / pr) * 100) : 0
    changes.push({
      label: 'Royalties',
      direction: pct > 3 ? 'up' : pct < -3 ? 'down' : 'flat',
      detail: pct > 3 ? `Up ${pct}% vs last month ($${cr} vs $${pr})`
        : pct < -3 ? `Down ${Math.abs(pct)}% vs last month ($${cr} vs $${pr})`
        : `Flat ($${cr} vs $${pr})`,
    })

    const cu = current.kdp.totalUnits, pu = previous.kdp.totalUnits
    const upct = pu > 0 ? Math.round(((cu - pu) / pu) * 100) : 0
    changes.push({
      label: 'Units Sold',
      direction: upct > 3 ? 'up' : upct < -3 ? 'down' : 'flat',
      detail: upct > 3 ? `Up ${upct}% (${cu} vs ${pu})`
        : upct < -3 ? `Down ${Math.abs(upct)}% (${cu} vs ${pu})`
        : `Flat (${cu} vs ${pu})`,
    })

    const ck = current.kdp.totalKENP ?? 0, pk = previous.kdp.totalKENP ?? 0
    const kpct = pk > 0 ? Math.round(((ck - pk) / pk) * 100) : 0
    changes.push({
      label: 'KENP Reads',
      direction: kpct > 3 ? 'up' : kpct < -3 ? 'down' : 'flat',
      detail: kpct > 3 ? `Up ${kpct}% (${ck.toLocaleString()} vs ${pk.toLocaleString()})`
        : kpct < -3 ? `Down ${Math.abs(kpct)}% (${ck.toLocaleString()} vs ${pk.toLocaleString()})`
        : `Flat (${ck.toLocaleString()} vs ${pk.toLocaleString()})`,
    })
  }

  if (current.meta && previous.meta) {
    const cc = current.meta.bestAd?.ctr ?? 0, pc = previous.meta.bestAd?.ctr ?? 0
    if (cc > 0 || pc > 0) {
      changes.push({
        label: 'Best CTR',
        direction: cc > pc + 1 ? 'up' : cc < pc - 1 ? 'down' : 'flat',
        detail: cc > pc + 1 ? `Improved from ${pc}% to ${cc}%`
          : cc < pc - 1 ? `Dropped from ${pc}% to ${cc}%`
          : `Holding at ${cc}%`,
      })
    }
  }

  if (current.mailerLite) {
    const ls = current.mailerLite.listSize
    if (ls === 0) {
      changes.push({ label: 'Email List', direction: 'down', detail: 'Still showing 0 — needs attention' })
    } else if (previous.mailerLite) {
      const pls = previous.mailerLite.listSize
      changes.push({
        label: 'Email List',
        direction: ls > pls ? 'up' : ls < pls ? 'down' : 'flat',
        detail: ls > pls ? `Grew to ${ls} (from ${pls})` : ls === pls ? `Steady at ${ls}` : `Dropped to ${ls} (from ${pls})`,
      })
    }
  }

  return changes
}

const DIR_STYLE = {
  up:   { icon: '▲', color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  down: { icon: '▼', color: '#fb7185', bg: 'rgba(251,113,133,0.08)' },
  flat: { icon: '—', color: '#9CA3AF', bg: 'rgba(0,0,0,0.03)' },
}

function WhatHappenedCard({ current, previous, actionPlan }: { current: Analysis; previous: Analysis; actionPlan?: any[] }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('what-happened-seen') !== current.month
  })
  const changes = buildChanges(current, previous)
  const topActions = (actionPlan ?? []).slice(0, 3)

  function handleToggle() {
    setOpen(prev => {
      if (prev) localStorage.setItem('what-happened-seen', current.month ?? '')
      return !prev
    })
  }

  if (changes.length === 0) return null

  return (
    <div className="rounded-xl mb-4 overflow-hidden"
      style={{ background: 'white', border: '1px solid #E8DDD0', borderLeft: '3px solid #e9a020' }}>
      <button onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-transparent border-none cursor-pointer">
        <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
          What happened this month
        </span>
        <span className="text-[12px]" style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid #F0E0C8' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-2" style={{ color: '#9CA3AF' }}>
            What changed
          </div>
          <div className="space-y-1.5 mb-4">
            {changes.map(c => {
              const s = DIR_STYLE[c.direction]
              return (
                <div key={c.label} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px]"
                  style={{ background: s.bg }}>
                  <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.icon}</span>
                  <span style={{ color: '#1E2D3D' }}><strong>{c.label}:</strong> {c.detail}</span>
                </div>
              )
            })}
          </div>

          {topActions.length > 0 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                What needs action
              </div>
              <div className="space-y-1.5">
                {topActions.map((item: any, i: number) => {
                  const typeColor = item.type === 'RED' ? '#fb7185' : item.type === 'YELLOW' ? '#fbbf24' : '#34d399'
                  return (
                    <div key={i} className="flex items-start gap-2 text-[12.5px]">
                      <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                      <span style={{ color: '#374151' }}>{item.title}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function OverviewClient() {
  const [analysis,  setAnalysis]  = useState<any>(null)
  const [analyses,  setAnalyses]  = useState<Analysis[]>([])
  const [rankLogs,  setRankLogs]  = useState<RankLog[]>([])
  const [roasLogs,  setRoasLogs]  = useState<RoasLog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [copied,      setCopied]      = useState(false)
  const [copying,     setCopying]     = useState(false)
  const [coachTitle]  = useState(() => getCoachTitle())
  const [onboardingSkipped, setOnboardingSkipped] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze').then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({})),
      fetch('/api/rank').then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({ logs: [] })),
      fetch('/api/roas').then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({ logs: [] })),
    ]).then(([analyzeData, rankData, roasData]) => {
      // Read the single latest analysis blob
      const analysis = analyzeData.analysis ?? null
      console.log('[Overview] analysis keys:', analysis ? Object.keys(analysis) : 'null')
      console.log('[Overview] kdp:', analysis?.kdp ? `units=${analysis.kdp.totalUnits} kenp=${analysis.kdp.totalKENP} royalties=${analysis.kdp.totalRoyaltiesUSD}` : 'MISSING')
      setAnalysis(analysis)

      // Keep analyses array for history table — each item's .data field has the blob
      const rows: Analysis[] = (analyzeData.analyses ?? [])
        .map((r: { data?: Analysis }) => r.data)
        .filter((d: unknown): d is Analysis => !!d && typeof d === 'object' && 'month' in (d as object))
      if (rows.length) setAnalyses(rows)

      setRankLogs(rankData.logs ?? [])
      setRoasLogs(roasData.logs ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Normalize channel keys: Claude returns "email" but our card key is "mailerlite"
  const channelScoreMap = new Map(
    (analysis?.channelScores as ChannelScore[] | undefined)?.map((s: ChannelScore) => {
      const key = s.channel === 'email' ? 'mailerlite' : s.channel
      return [key, s] as [string, ChannelScore]
    }) || []
  )

  const monthLabel = analysis?.month
    ? new Date(analysis.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  async function handleCopy() {
    setCopying(true)
    try {
      const prompt = buildCoachPrompt(analysis, rankLogs, roasLogs)
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 4000)
    } catch {
      alert('Could not copy automatically — please try again.')
    } finally {
      setCopying(false)
    }
  }

  // First-time user: show guided onboarding instead of empty dashboard
  const isFirstVisit = !loading && analyses.length === 0 && !analysis && !onboardingSkipped

  if (isFirstVisit) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px]">
        <OnboardingFlow onSkip={() => setOnboardingSkipped(true)} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px]">

      <Suspense fallback={null}><FreshBanner /></Suspense>
      <OnboardingBanner analysesCount={analyses.length} />

      {/* What Happened card */}
      {analyses.length >= 2 && <WhatHappenedCard current={analyses[0]} previous={analyses[1]} actionPlan={analysis?.actionPlan} />}

      {/* Hero numbers strip */}
      {analysis?.kdp && (
        <div className="rounded-xl mb-4 p-6 grid grid-cols-2 md:grid-cols-4 gap-4"
          style={{ background: 'white', border: '1px solid #E8DDD0' }}>
          {[
            { label: 'Revenue',     value: `$${analysis.kdp.totalRoyaltiesUSD}`, color: '#1E2D3D' },
            { label: 'Units Sold',  value: fmt(analysis.kdp.totalUnits),         color: '#1E2D3D' },
            { label: 'KENP Reads',  value: fmt(analysis.kdp.totalKENP),          color: '#1E2D3D' },
            { label: 'Best CTR',    value: analysis.meta?.bestAd ? `${analysis.meta.bestAd.ctr}%` : '—', color: '#1E2D3D' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-1"
                style={{ color: '#9CA3AF' }}>
                {stat.label}
              </div>
              <div className="font-serif text-[48px] font-medium leading-none tracking-tight"
                style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verdict banner */}
      <div className="rounded-xl mb-6 px-6 py-4 flex items-center justify-between"
        style={{ background: '#0d1f35' }}>
        <div>
          <div className="text-[10px] font-bold tracking-[2px] uppercase mb-1.5" style={{ color: '#e9a020' }}>
            {monthLabel}
          </div>
          <div className="font-serif text-[16px] text-white leading-snug">
            {analysis?.overallVerdict || 'Upload your files to get your first analysis.'}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-6">
          <div className="text-[11.5px] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {analysis
              ? `Analyzed ${new Date(analysis.generatedAt).toLocaleDateString()}`
              : 'No analysis yet'}
          </div>
          <Link href="/dashboard/upload" className="text-[11px] font-semibold no-underline hover:underline"
            style={{ color: '#e9a020' }}>
            Upload new files →
          </Link>
        </div>
      </div>

      <SortablePage
        page="overview"
        theme="light"
        sections={[
          {
            id: 'channel-cards',
            content: (
              <div>
                <div className="mb-1">
                  <h2 className="font-serif text-[18px] text-[#0d1f35] mb-1">
                    Your channels — click any for the full deep dive
                  </h2>
                  <p className="text-[12px] text-stone-400 mb-4">
                    Each channel has a detailed analysis with your coach&apos;s recommendations
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
                  {CHANNEL_CARDS.map(card => {
                    const score = channelScoreMap.get(card.key) as ChannelScore | undefined
                    const badge = (score?.status ? STATUS_BADGE[score.status] : null) ?? STATUS_BADGE.NEW
                    return (
                      <Link key={card.key} href={card.href}
                        className={`card p-4 cursor-pointer hover:-translate-y-0.5 transition-all
                                    border-t-[3px] ${card.colorClass} no-underline animate-fade-up`}>
                        <span className="mb-2.5 block"><card.icon size={28} color={card.iconColor} /></span>
                        <div className="text-[10.5px] font-bold tracking-[0.8px] uppercase text-stone-400 mb-1">
                          {card.name}
                        </div>
                        <div className="font-serif text-[22px] text-[#0d1f35] tracking-tight leading-none mb-1.5">
                          {score?.metric || '—'}
                        </div>
                        <div className="text-[11px] text-stone-500 leading-snug mb-2.5">
                          {score?.subline || 'Add your files to see this'}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ),
          },
          {
            id: 'action-plan',
            content: (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-serif text-[18px] text-[#0d1f35]">Your action plan — do these in order</h2>
                  <span className="text-[12px] text-stone-400">Based on your real data</span>
                </div>
                {loading ? (
                  <div className="card p-8 text-center">
                    <div className="text-[14px] font-serif text-[#0d1f35] animate-pulse">
                      {coachTitle.replace(' says', '')} is reading everything…
                    </div>
                  </div>
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
                        {coachTitle.replace(' says', '')} reviewed everything. Here&apos;s what to do next.
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Ranked by priority · Based on your real numbers
                      </div>
                    </div>
                    <div>
                      {(analysis.actionPlan as CoachingInsight[]).map((item: CoachingInsight, i: number) => (
                        <ActionItem
                          key={i}
                          priority={item.priority}
                          type={item.type}
                          title={item.title}
                          body={item.body}
                          action={item.action}
                        />
                      ))}
                      {analysis.confidenceNote && (
                        <div className="mt-4 px-4 py-2.5 rounded-lg text-[12px]"
                          style={{ background: '#F5F5F4', color: '#9CA3AF' }}>
                          {analysis.confidenceNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* History table — only shown when we have 2+ months */}
      {analyses.length >= 2 && (
        <>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-[18px] text-[#0d1f35]">How you're tracking over time</h2>
            <span className="text-[12px] text-stone-400">Last {analyses.length} months</span>
          </div>
          <div className="card overflow-hidden mb-7">
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
                  const prev      = analyses[i + 1]
                  const label     = new Date(a.month + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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

      {/* ── AI Coach panel — full-width, dark, editorial ── */}
      <div className="-mx-8 -mb-8 mt-2" style={{ background: '#0d1f35' }}>
        <div className="max-w-2xl mx-auto px-8 py-14 text-center">

          {/* Eyebrow */}
          <div className="text-[10px] font-bold tracking-[2.5px] uppercase mb-5"
            style={{ color: 'rgba(233,160,32,0.7)' }}>
            Go deeper
          </div>

          {/* Headline */}
          <h2 className="font-serif text-[28px] leading-snug text-white mb-4">
            Want to go deeper? Bring your data to any AI.
          </h2>

          {/* Subtext */}
          <p className="text-[14px] leading-relaxed mb-8 max-w-lg mx-auto"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            Your numbers, insights, and action plan — formatted and ready to paste into
            Claude, ChatGPT, Gemini, or any AI you use.
          </p>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={copying}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-[14px]
                       font-bold transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:brightness-110 active:scale-[0.98]"
            style={{ background: '#e9a020', color: '#0d1f35' }}
          >
            {copying
              ? 'Copying...'
              : copied
              ? 'Copied to clipboard'
              : 'Copy my full data summary'}
          </button>

          {/* Quiet confirmation */}
          <div className={`mt-3 text-[12px] transition-opacity duration-500 ${copied ? 'opacity-100' : 'opacity-0'}`}
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            Paste it into any AI and type your question at the end.
          </div>

          {/* Text links */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {[
              { label: 'Open Claude', href: 'https://claude.ai' },
              { label: 'Open ChatGPT', href: 'https://chat.openai.com' },
              { label: 'Open Gemini', href: 'https://gemini.google.com' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12.5px] no-underline transition-colors duration-150 hover:underline"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                {label} →
              </a>
            ))}
          </div>

        </div>
      </div>

    </div>
  )
}
