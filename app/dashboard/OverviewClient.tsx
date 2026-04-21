'use client'
// app/dashboard/OverviewClient.tsx
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Analysis, RankLog, RoasLog, ChannelScore, CoachingInsight, CrossChannelPlan } from '@/types'
import type { DashboardData } from '@/lib/dashboard-data'
import { getCoachTitle } from '@/lib/coachTitle'
import { fmtPct, fmtCurrency } from '@/lib/utils'

// coach title is set per-mount so it changes on every page load
import { ActionItem } from '@/components/ui'
import { InsightCallouts } from '@/components/InsightCallout'
import { FreshBanner } from '@/components/FreshBanner'
import { OnboardingBanner } from '@/components/OnboardingBanner'
import { SetupChecklist } from '@/components/SetupChecklist'
import { SortablePage } from '@/components/SortablePage'
import { BookOpen, TrendingUp, Mail, Pin } from '@/components/icons'

const CHANNEL_CARDS = [
  { key: 'kdp',        href: '/dashboard/kdp',        icon: BookOpen,   iconColor: '#E9A020', name: 'KDP',        colorClass: 'border-t-amber-brand' },
  { key: 'meta',       href: '/dashboard/meta',        icon: TrendingUp, iconColor: '#60A5FA', name: 'Meta Ads',   colorClass: 'border-t-blue-500' },
  { key: 'mailerlite', href: '/dashboard/mailerlite',  icon: Mail,       iconColor: '#34d399', name: 'MailerLite', colorClass: 'border-t-emerald-500' },
  { key: 'pinterest',  href: '/dashboard/pinterest',   icon: Pin,        iconColor: '#fb7185', name: 'Pinterest',  colorClass: 'border-t-red-500' },
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

function fmtRelDate(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Trend({ curr, prev }: { curr?: number; prev?: number }) {
  if (curr == null || prev == null || prev === 0) return <span className="text-stone-500">—</span>
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
  flat: { icon: '—', color: '#6B7280', bg: 'rgba(0,0,0,0.03)' },
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
      style={{ background: 'white', border: '1px solid #EEEBE6', borderLeft: '3px solid #e9a020', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <button onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-transparent border-none cursor-pointer">
        <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
          What happened this month
        </span>
        <span className="text-[12px]" style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid #EEEBE6' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-2" style={{ color: '#6B7280' }}>
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
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
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

// ── Story sentence — human-voice summary of the hero numbers ────────────────
function buildStorySentence(analysis: any): string | null {
  if (!analysis) return null
  // Use Claude-generated sentence if available (from future analyses)
  if (analysis.storySentence) return analysis.storySentence

  const kdp  = analysis.kdp
  const meta = analysis.meta
  const units: number | undefined = kdp?.totalUnits
  const kenp:  number | undefined = kdp?.totalKENP
  const royalties: number | undefined = kdp?.totalRoyaltiesUSD
  const estRevenue = kdp ? Math.round(((royalties ?? 0) + (kenp ?? 0) * 0.0045) * 100) / 100 : null
  const ctr:   number | undefined = meta?.bestAd?.ctr ?? meta?.avgCTR
  const spend: number | undefined = meta?.totalSpend

  if (units && kenp) {
    if (kenp > units * 20) {
      return `${units.toLocaleString()} readers chose your books this month — and ${kenp.toLocaleString()} of them didn't stop reading.`
    }
    if (units >= 50) {
      return `${units.toLocaleString()} readers and ${kenp.toLocaleString()} pages read — your books are pulling people in and keeping them there.`
    }
    return `${units.toLocaleString()} readers showed up this month, reading ${kenp.toLocaleString()} pages between them.`
  }
  if (units && estRevenue != null) {
    return `${units.toLocaleString()} readers, $${estRevenue.toFixed(2)} earned — your books are working.`
  }
  if (units) {
    return `${units.toLocaleString()} readers chose your books this month — keep that momentum going.`
  }
  if (ctr != null && spend) {
    return `$${spend.toFixed(2)} spent, ${ctr}% of people clicked — your ads are cutting through the noise.`
  }
  return null
}

// ── Count-up hook — animates a number from 0 to `target` over `duration` ms ──
function useCountUp(target: number, active: boolean, duration = 800): number {
  const [val, setVal] = useState(active ? 0 : target)
  useEffect(() => {
    if (!active) { setVal(target); return }
    const start = Date.now()
    function tick() {
      const pct = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - pct, 3)
      setVal(target * eased)
      if (pct < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active])
  return val
}

// ── Other Observations — collapsible section for low-confidence action items ──
function OtherObservations({ items }: { items: CoachingInsight[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ background: 'white', border: '0.5px solid #EEEBE6' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-transparent border-none cursor-pointer">
        <span className="text-[12px] font-semibold" style={{ color: '#6B7280' }}>
          Other observations ({items.length})
        </span>
        <span className="text-[11px] transition-transform duration-200"
          style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '0.5px solid #EEEBE6' }}>
          {items.map((item, i) => (
            <div key={i} className="pt-3">
              <div className="text-[12.5px] font-semibold mb-1" style={{ color: '#6B7280' }}>{item.title}</div>
              <div className="text-[12px] leading-[1.6]" style={{ color: '#9CA3AF' }}>{item.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getDefaultDateRange() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { from, to }
}

// ── Main component ───────────────────────────────────────────────────────────
export function OverviewClient({ userName, initialData }: { userName?: string | null; initialData?: DashboardData } = {}) {
  const hasInitial = !!initialData
  const [analysis,  setAnalysis]  = useState<any>(initialData?.analysis ?? null)
  const [analyses,  setAnalyses]  = useState<Analysis[]>(initialData?.analyses ?? [])
  const [rankLogs,  setRankLogs]  = useState<RankLog[]>(initialData?.rankLogs ?? [])
  const [roasLogs,  setRoasLogs]  = useState<RoasLog[]>(initialData?.roasLogs ?? [])
  const [loading,   setLoading]   = useState(!hasInitial)
  const [generating, setGenerating] = useState(false)
  const [kdpLastUploadedAt, setKdpLastUploadedAt] = useState<string | null>(initialData?.kdpLastUploadedAt ?? null)
  const [copied,      setCopied]      = useState(false)
  const [copying,     setCopying]     = useState(false)
  const [coachTitle]  = useState(() => getCoachTitle())
  const [expandedPriority, setExpandedPriority] = useState<number | null>(null)
  const [donePriorities, setDonePriorities] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set()
    const today = new Date().toISOString().slice(0, 10)
    try {
      const stored = localStorage.getItem('priorities-done')
      if (!stored) return new Set<number>()
      const { date, indices } = JSON.parse(stored)
      if (date !== today) return new Set<number>()
      return new Set<number>(indices)
    } catch { return new Set<number>() }
  })
  const [showCompleted, setShowCompleted] = useState(true)
  const [isFresh,     setIsFresh]     = useState(false)
  const [storyMode,   setStoryMode]   = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('story-mode')
    return stored === null ? true : stored === 'true'
  })

  function toggleStoryMode() {
    setStoryMode(prev => {
      const next = !prev
      localStorage.setItem('story-mode', String(next))
      return next
    })
  }

  // Sync Story Mode from localStorage on mount + listen for TopBar toggle events
  useEffect(() => {
    try {
      const stored = localStorage.getItem('story-mode')
      if (stored !== null) setStoryMode(stored === 'true')
    } catch {}
    function onStoryModeChange(e: Event) {
      setStoryMode((e as CustomEvent<{ on: boolean }>).detail.on)
    }
    window.addEventListener('story-mode-change', onStoryModeChange)
    return () => window.removeEventListener('story-mode-change', onStoryModeChange)
  }, [])

  // Persist done priorities (date-stamped, resets daily)
  useEffect(() => {
    if (donePriorities.size === 0) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      localStorage.setItem('priorities-done', JSON.stringify({ date: today, indices: Array.from(donePriorities) }))
    } catch {}
  }, [donePriorities])

  function toggleDone(i: number) {
    setDonePriorities(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else { next.add(i); setExpandedPriority(null) }
      return next
    })
  }

  // Detect ?fresh=1 for post-upload celebration count-up
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('fresh') === '1') setIsFresh(true)
  }, [])

  // Count-up targets — 0 until analysis loads
  const _revTarget   = analysis?.kdp  ? Math.round(((analysis.kdp.totalRoyaltiesUSD ?? 0) + analysis.kdp.totalKENP * 0.0045) * 100) / 100 : 0
  const _unitsTarget = analysis?.kdp?.totalUnits ?? 0
  const _kenpTarget  = analysis?.kdp?.totalKENP  ?? 0
  const _ctrTarget   = analysis?.meta?.bestAd?.ctr ?? 0
  const animRev   = useCountUp(_revTarget,   isFresh && !!analysis?.kdp)
  const animUnits = useCountUp(_unitsTarget, isFresh && !!analysis?.kdp)
  const animKenp  = useCountUp(_kenpTarget,  isFresh && !!analysis?.kdp)
  const animCtr   = useCountUp(_ctrTarget,   isFresh && !!analysis?.meta?.bestAd)

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    if (typeof window === 'undefined') return getDefaultDateRange()
    try {
      const stored = localStorage.getItem('authordash_date_range')
      if (stored) return JSON.parse(stored)
    } catch {}
    return getDefaultDateRange()
  })

  const [refreshKey,   setRefreshKey]   = useState(0)
  const [liveML,       setLiveML]       = useState<import('@/types').MailerLiteData | null>(initialData?.mailerLiteData ?? null)
  const [metaLastSync, setMetaLastSync] = useState<string | null>(initialData?.metaLastSync ?? null)
  const [syncingMeta,  setSyncingMeta]  = useState(false)
  const [syncingML,    setSyncingML]    = useState(false)
  const [metaErrorBanner, setMetaErrorBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.search.includes('meta_error=true')) {
      setMetaErrorBanner(true)
      const clean = window.location.pathname + window.location.search.replace(/[?&]?meta_error=true/, '')
      window.history.replaceState(null, '', clean || window.location.pathname)
    }
  }, [])

  useEffect(() => {
    // Skip initial fetch if server-side data was provided (refreshKey === 0)
    if (hasInitial && refreshKey === 0) return

    const dateParams = new URLSearchParams({ from: dateRange.from, to: dateRange.to }).toString()

    Promise.all([
      fetch(`/api/analyze?${dateParams}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({})),
      fetch(`/api/rank?${dateParams}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({ logs: [] })),
      fetch(`/api/roas?${dateParams}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({ logs: [] })),
      fetch('/api/mailerlite').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([analyzeData, rankData, roasData, mlData]) => {
      const analysis = analyzeData.analysis ?? null
      setAnalysis(analysis)
      setKdpLastUploadedAt(analyzeData.kdpLastUploadedAt ?? null)
      setMetaLastSync(analyzeData.metaLastSync ?? null)

      const rows: Analysis[] = (analyzeData.analyses ?? [])
        .map((r: { data?: Analysis }) => r.data)
        .filter((d: unknown): d is Analysis => !!d && typeof d === 'object' && 'month' in (d as object))
      if (rows.length) setAnalyses(rows)

      setRankLogs(rankData.logs ?? [])
      setRoasLogs(roasData.logs ?? [])
      if (mlData?.data) setLiveML(mlData.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [refreshKey, hasInitial])

  async function handleSyncMeta() {
    setSyncingMeta(true)
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) {
        const data = await res.json()
        if (data.data) setAnalysis((prev: any) => prev ? { ...prev, meta: data.data } : { meta: data.data })
        setMetaLastSync(new Date().toISOString())
        window.dispatchEvent(new Event('meta:synced'))
      }
    } catch { /* ignore */ }
    setSyncingMeta(false)
  }

  async function handleSyncML() {
    setSyncingML(true)
    try {
      const res = await fetch('/api/mailerlite')
      if (res.ok) {
        const data = await res.json()
        if (data.data) setLiveML(data.data)
      }
    } catch { /* ignore */ }
    setSyncingML(false)
  }

  // Re-fetch when an upload completes (fired by UploadModal on any page)
  useEffect(() => {
    function onUploadComplete() { setRefreshKey(k => k + 1) }
    window.addEventListener('dashboard-data-refresh', onUploadComplete)
    return () => window.removeEventListener('dashboard-data-refresh', onUploadComplete)
  }, [])

  // Listen for date range changes fired by TopBar
  useEffect(() => {
    function onDateRangeChange(e: Event) {
      const { from, to } = (e as CustomEvent<{ from: string; to: string }>).detail
      setDateRange({ from, to })
      setRefreshKey(k => k + 1)
    }
    window.addEventListener('date-range-change', onDateRangeChange)
    return () => window.removeEventListener('date-range-change', onDateRangeChange)
  }, [])

  // On mount: if a custom date range is stored, trigger a fresh fetch to respect it
  useEffect(() => {
    const def = getDefaultDateRange()
    if (dateRange.from !== def.from || dateRange.to !== def.to) {
      setRefreshKey(k => k + 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Optimistic UI: if the user lands here right after uploading, show their
  //    parsed numbers immediately while the AI analysis finishes in the background.
  useEffect(() => {
    const isAnalyzing = new URLSearchParams(window.location.search).get('analyzing') === '1'
    if (!isAnalyzing) return

    let pendingData: any
    try {
      const raw = sessionStorage.getItem('pendingUpload')
      if (!raw) return
      pendingData = JSON.parse(raw)
    } catch { return }

    setGenerating(true)
    // Surface the raw parsed numbers before coaching arrives
    setAnalysis((prev: any) => prev ?? {
      month:      pendingData.month,
      kdp:        pendingData.kdp        ?? undefined,
      meta:       pendingData.meta       ?? undefined,
      pinterest:  pendingData.pinterest  ?? undefined,
      mailerLite: pendingData.mailerLite ?? undefined,
      channelScores: [],
      actionPlan:    [],
      insights:      [],
    })

    let pollCount = 0
    const pollId = setInterval(async () => {
      try {
        pollCount++
        if (pollCount > 60) { // 3 min max
          clearInterval(pollId)
          setGenerating(false)
          sessionStorage.removeItem('pendingUpload')
          return
        }
        const res = await fetch('/api/analyze')
        if (!res.ok) return
        const data = await res.json()
        const a = data.analysis
        // Fresh analysis from Claude has channelScores populated
        if (a?.channelScores?.length > 0) {
          clearInterval(pollId)
          setAnalysis(a)
          setKdpLastUploadedAt(data.kdpLastUploadedAt ?? null)
          setGenerating(false)
          sessionStorage.removeItem('pendingUpload')
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch { /* ignore poll errors */ }
    }, 3000)

    return () => clearInterval(pollId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Normalize channel keys: Claude returns "email" but our card key is "mailerlite"
  const channelScoresArr: ChannelScore[] = Array.isArray(analysis?.channelScores) ? analysis.channelScores : []
  function getChannelScore(key: string): ChannelScore | undefined {
    return channelScoresArr.find((s: ChannelScore) => (s.channel === 'email' ? 'mailerlite' : s.channel) === key)
  }


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

  // KDP data freshness — show amber warning if last KDP upload was more than 35 days ago
  const isKdpStale = !!kdpLastUploadedAt &&
    (Date.now() - new Date(kdpLastUploadedAt).getTime()) > 35 * 24 * 60 * 60 * 1000

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px]">
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-xl" style={{ background: '#FFF8F0' }} />
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: '#FFF8F0' }} />)}
          </div>
          <div className="h-40 rounded-xl" style={{ background: '#FFF8F0' }} />
          <div className="h-32 rounded-xl" style={{ background: '#FFF8F0' }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-36 rounded-xl" style={{ background: '#FFF8F0' }} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px]">

      <Suspense fallback={null}><FreshBanner /></Suspense>
      <OnboardingBanner
        bookCount={initialData?.bookCount ?? 0}
        hasKdpData={!!analysis?.kdp}
        hasMailerLiteKey={initialData?.hasMailerLiteKey ?? !!liveML}
      />
      <SetupChecklist analysis={analysis} />
      {/* Meta OAuth error banner */}
      {metaErrorBanner && (
        <div className="mb-4 rounded-xl px-5 py-3.5 flex items-center gap-3"
          style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 2L14.5 13H1.5L8 2Z" stroke="#E9A020" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6.5V9.5" stroke="#E9A020" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.75" fill="#E9A020" />
          </svg>
          <p className="flex-1 text-[13px]" style={{ color: '#92610a', margin: 0 }}>
            Facebook hit a snag — skip it for now and come back later. Everything else works great!{' '}
            <a href="/dashboard/settings" className="font-semibold underline" style={{ color: '#E9A020' }}>
              Try again from Settings →
            </a>
          </p>
          <button
            onClick={() => setMetaErrorBanner(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B07E1A', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Generating banner — shown while AI coaching is being created in the background */}
      {generating && (
        <div className="mb-4 rounded-xl px-5 py-3.5 flex items-center gap-3"
          style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#E9A020' }}>
            <circle cx="8" cy="8" r="6.5" stroke="#F0EDEA" strokeWidth="1.8" />
            <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-[13px]" style={{ color: '#92400E' }}>
            <strong>Generating your coaching session</strong> — your numbers are showing below. Insights will appear shortly.
          </span>
        </div>
      )}

      {isKdpStale && (
        <div className="mb-4 rounded-xl px-5 py-3.5 flex items-center gap-3"
          style={{ background: 'rgba(233,160,32,0.1)', border: '1px solid rgba(233,160,32,0.3)' }}>
          <span className="text-[16px]">⚠️</span>
          <span className="text-[13px] font-semibold" style={{ color: '#D97706' }}>
            Data may be outdated —{' '}
            <Link href="/dashboard?upload=1" className="underline hover:no-underline" style={{ color: '#E9A020' }}>
              upload your latest KDP report
            </Link>
          </span>
        </div>
      )}

      {/* Empty state — new user with no data yet */}
      {!analysis && analyses.length === 0 && (
        <div className="mb-7">
          <div className="text-[22px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening' })()}{userName ? `, ${userName}` : ''}. Your dashboard is ready — it just needs your data.
          </div>
          <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
            Connect your channels below to unlock your personalised coaching.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📊', title: 'KDP',        desc: 'Upload your sales report',   cta: 'Upload →',  href: '/dashboard?upload=1',            border: '#F97B6B' },
              { icon: '✉',  title: 'MailerLite', desc: 'Add your API key',           cta: 'Connect →', href: '/dashboard/settings#mailerlite', border: '#6EBF8B' },
              { icon: '📘', title: 'Meta Ads',   desc: 'Connect your ad account',    cta: 'Connect →', href: '/dashboard/settings#meta',       border: '#60A5FA' },
            ].map(card => (
              <div key={card.title} className="rounded-xl p-5 flex flex-col gap-3"
                style={{ background: 'white', border: '1px solid #EEEBE6', borderLeft: `3px solid ${card.border}` }}>
                <div className="text-2xl">{card.icon}</div>
                <div>
                  <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>{card.title}</div>
                  <div className="text-[12.5px]" style={{ color: '#6B7280' }}>{card.desc}</div>
                </div>
                <Link href={card.href}
                  className="inline-block text-[12.5px] font-semibold no-underline hover:opacity-80 mt-auto"
                  style={{ color: '#E9A020' }}>
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Happened card */}
      {analyses.length >= 2 && <WhatHappenedCard current={analyses[0]} previous={analyses[1]} actionPlan={analysis?.actionPlan} />}

      {/* Hero numbers strip — centered grid */}
      <div className="rounded-xl mb-4 py-6 px-4 sm:px-6"
        style={{ background: 'white', border: '1px solid #EEEBE6', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {[
            { label: 'Est. Revenue', value: analysis?.kdp ? `$${animRev.toFixed(2)}`             : null },
            { label: 'Units Sold',   value: analysis?.kdp ? Math.round(animUnits).toLocaleString() : null },
            { label: 'KENP Reads',   value: analysis?.kdp ? Math.round(animKenp).toLocaleString()  : null },
            { label: 'Best CTR',     value: analysis?.meta?.bestAd ? `${animCtr.toFixed(1)}%`      : null },
          ].map(stat => {
            const hasData = stat.value != null && stat.value !== '—'
            return (
              <div key={stat.label} className="text-center transition-colors rounded-lg py-2"
                style={{ background: hasData ? 'transparent' : undefined }}
                onMouseEnter={e => { if (!hasData) e.currentTarget.style.background = '#FFF8F0' }}
                onMouseLeave={e => { if (!hasData) e.currentTarget.style.background = 'transparent' }}>
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-1"
                  style={{ color: '#6B7280' }}>
                  {stat.label}
                </div>
                {hasData ? (
                  <div className="font-sans text-2xl sm:text-4xl font-semibold leading-none"
                    style={{ color: '#1E2D3D' }}>
                    {stat.value}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-2" style={{ opacity: 0.2 }}>
                      <rect x="3" y="14" width="4" height="7" rx="1" fill="#1E2D3D" />
                      <rect x="10" y="9" width="4" height="12" rx="1" fill="#1E2D3D" />
                      <rect x="17" y="4" width="4" height="17" rx="1" fill="#1E2D3D" />
                    </svg>
                    <div className="text-[12px] mb-1" style={{ color: '#6B7280' }}>No data yet</div>
                    <Link href="/dashboard?upload=1" className="text-[11px] font-semibold no-underline hover:underline"
                      style={{ color: '#E9A020' }}>
                      Upload to unlock →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {storyMode && buildStorySentence(analysis) && (
          <div className="mt-5 pt-4 text-center text-[13.5px] leading-relaxed"
            style={{ borderTop: '1px solid #EEEBE6', color: '#1E2D3D', fontStyle: 'italic' }}>
            {buildStorySentence(analysis)}
          </div>
        )}
      </div>

      {/* ══════ SECTION 1 — TODAY'S PRIORITIES ══════════════════════ */}
      {!loading && (
      <div className="mb-7">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="font-sans text-[22px] font-bold tracking-tight" style={{ color: '#1E2D3D' }}>
            Today&apos;s Priorities
          </h2>
          {donePriorities.size > 0 && (
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="text-[11.5px] font-semibold"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
            >
              {showCompleted ? 'Hide' : 'Show'} completed ({donePriorities.size})
            </button>
          )}
        </div>
        <p className="text-[12.5px] mb-5" style={{ color: '#6B7280' }}>
          Highest impact actions based on your real performance data
        </p>

        {analysis?.actionPlan?.length ? (() => {
          const allItems = analysis.actionPlan as CoachingInsight[]
          const mainItems  = allItems.filter(item => item.confidence !== 'low').slice(0, 3)
          const otherItems = allItems.filter(item => item.confidence === 'low')
          const highColors = ['#F97B6B', '#E9A020', '#60A5FA']
          const visibleItems = mainItems.filter((_, i) => showCompleted || !donePriorities.has(i))
          return (
            <>
              {mainItems.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '0.5px solid #EEEBE6' }}>
                  {visibleItems.map((item) => {
                    const i = mainItems.indexOf(item)
                    const href = item.channel === 'kdp' ? '/dashboard/kdp'
                      : item.channel === 'meta' ? '/dashboard/meta'
                      : item.channel === 'email' ? '/dashboard/mailerlite'
                      : item.channel === 'pinterest' ? '/dashboard/pinterest'
                      : '/dashboard?upload=1'
                    const isMedium = item.confidence === 'medium'
                    const color = isMedium ? '#E9A020' : (highColors[i] ?? highColors[2])
                    const isOpen = expandedPriority === i
                    const isDone = donePriorities.has(i)
                    return (
                      <div key={i}
                        style={{
                          borderBottom: i < mainItems.length - 1 ? '0.5px solid #EEEBE6' : 'none',
                          background: isDone ? '#FAFAF9' : isOpen ? '#FFF8F0' : 'white',
                          borderLeft: isDone ? '3px solid #D1D5DB' : isOpen ? `3px solid ${color}` : '3px solid transparent',
                          transition: 'background 0.2s ease, border-left-color 0.2s ease',
                          opacity: isDone ? 0.65 : 1,
                        }}>
                        <button
                          onClick={() => !isDone && setExpandedPriority(isOpen ? null : i)}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-transparent border-none"
                          style={{ cursor: isDone ? 'default' : 'pointer' }}
                        >
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                            style={{ background: isDone ? '#D1D5DB' : color, color: 'white' }}>
                            {isDone ? '✓' : i + 1}
                          </span>
                          <span className="flex-1 min-w-0">
                            {isMedium && !isDone && (
                              <span className="text-[10px] font-bold uppercase tracking-wide mr-1.5"
                                style={{ color: '#E9A020' }}>Worth checking:</span>
                            )}
                            <span className="text-[13.5px] font-bold"
                              style={{ color: isDone ? '#9CA3AF' : '#1E2D3D', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {item.title}
                            </span>
                            {isDone && (
                              <span className="ml-2 text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>Done</span>
                            )}
                          </span>
                          {!isDone && (
                            <span className="text-[12px] flex-shrink-0 transition-transform duration-200"
                              style={{ color: '#6B7280', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              ▾
                            </span>
                          )}
                          {isDone && (
                            <button
                              onClick={e => { e.stopPropagation(); toggleDone(i) }}
                              className="text-[10.5px] font-semibold flex-shrink-0"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                            >
                              Undo
                            </button>
                          )}
                        </button>
                        <div className="overflow-hidden transition-all duration-300 ease-out"
                          style={{ maxHeight: isOpen && !isDone ? '360px' : '0px', opacity: isOpen && !isDone ? 1 : 0 }}>
                          <div className="px-4 pb-4 pl-[60px]">
                            <div className="text-[12.5px] leading-[1.7] mb-3" style={{ color: '#374151' }}>
                              {item.body}
                              {item.action && (
                                <span className="ml-1">
                                  <strong style={{ color: '#E9A020' }}>Next step:</strong> {item.action}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Link href={href}
                                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[11.5px] font-bold no-underline transition-all hover:opacity-90"
                                style={{ background: color, color: 'white' }}>
                                Read the Full Story →
                              </Link>
                              <button
                                onClick={() => toggleDone(i)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11.5px] font-semibold transition-all hover:opacity-80"
                                style={{ background: '#F0FFF4', color: '#6EBF8B', border: '1px solid #A7F3C8', cursor: 'pointer' }}
                              >
                                <span>✓</span> Mark as done
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {otherItems.length > 0 && (
                <OtherObservations items={otherItems} />
              )}
            </>
          )
        })() : analysis ? (
          <InsightCallouts analysis={analysis} page="overview" />
        ) : (
          <div className="text-[13px] py-4" style={{ color: '#6B7280' }}>
            Upload your files to see your priorities.
          </div>
        )}
      </div>
      )}

      {/* ══════ SECTION 2 — WHAT'S WORKING (metric tiles) ═════════ */}
      {analysis && (
        <div className="mb-7">
          <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-[#EEEBE6]">
            {(() => {
              const kdp = analysis.kdp
              const meta = analysis.meta
              const ml = analysis.mailerLite
              const estRevenue = kdp ? Math.round(((kdp.totalRoyaltiesUSD ?? 0) + kdp.totalKENP * 0.0045) * 100) / 100 : null
              const royaltiesZero = kdp && (kdp.totalRoyaltiesUSD ?? 0) === 0
              const tiles = [
                {
                  stat: estRevenue != null ? `$${estRevenue.toFixed(2)}` : '—',
                  label: 'EST. REVENUE',
                  estimate: royaltiesZero,
                  sub: kdp?.totalUnits ? `${kdp.totalUnits} units sold` : 'No data yet',
                },
                { stat: meta?.avgCTR ? fmtPct(meta.avgCTR) : '—', label: 'META ADS CTR', estimate: false, sub: meta?.avgCTR && meta.avgCTR >= 2 ? 'Exceptional performance (top 10%)' : meta?.avgCTR ? 'Room to improve' : 'No data yet' },
                { stat: ml?.openRate ? fmtPct(ml.openRate) : '—', label: 'EMAIL OPEN RATE', estimate: false, sub: ml?.openRate && ml.openRate >= 25 ? 'Well above 20–25% author average' : ml?.openRate ? 'Near author average' : 'No data yet' },
                { stat: ml?.clickRate ? fmtPct(ml.clickRate) : '—', label: 'EMAIL CLICK RATE', estimate: false, sub: ml?.clickRate && ml.clickRate >= 4 ? 'Strong reader engagement' : ml?.clickRate ? 'Room to grow' : 'No data yet' },
              ]
              return tiles.map((t, i) => (
                <div key={i} className="px-4 py-1 first:pl-0 last:pr-0">
                  <div className="text-[28px] font-semibold leading-none mb-1" style={{ color: '#1E2D3D' }}>
                    {t.stat}
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: '#6EBF8B' }}>
                      {t.label}
                    </div>
                    {t.estimate && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}>
                        ⚠ Est.
                      </span>
                    )}
                  </div>
                  <div className="text-[12px]" style={{ color: '#6B7280' }}>{t.sub}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* ══════ SECTION 3 — NEEDS ATTENTION SOON ══════════════════ */}
      {analysis?.executiveSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
          <div>
            <div className="text-[11px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6EBF8B' }}>
              What&apos;s working
            </div>
            <div className="space-y-2.5">
              {analysis.executiveSummary.whatsWorking.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: '#374151' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#6EBF8B' }} />
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1E2D3D">$1</strong>') }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#F97B6B' }}>
              Needs attention soon
            </div>
            <div className="space-y-2.5">
              {analysis.executiveSummary.whereToStrengthen.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: '#374151' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#F97B6B' }} />
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1E2D3D">$1</strong>') }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SortablePage
        page="overview"
        theme="light"
        sections={[
          {
            id: 'channel-cards',
            content: (
              <div>
                <div className="mb-1 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-sans text-[18px] text-[#0d1f35] mb-1">
                      Your channels — click any for the full deep dive
                    </h2>
                    <p className="text-[12px] text-stone-500 mb-4">
                      Each channel has a detailed analysis with your coach&apos;s recommendations
                    </p>
                  </div>
                  <button
                    onClick={toggleStoryMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-all flex-shrink-0 mt-0.5"
                    style={{
                      background: storyMode ? '#E9A020' : '#F5F5F4',
                      color: storyMode ? 'white' : '#6B7280',
                      border: storyMode ? '1px solid #E9A020' : '1px solid #E5E7EB',
                    }}
                  >
                    📖 Story
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
                  {CHANNEL_CARDS.map(card => {
                    let score = getChannelScore(card.key)

                    // Fallback for KDP: if no channelScore from AI but KDP data is present
                    // (e.g. uploaded in a prior month and backfilled, or AI omitted it), build
                    // a synthetic score so the card always reflects real uploaded numbers.
                    if (!score && card.key === 'kdp' && analysis?.kdp) {
                      const k = analysis.kdp
                      const estRevenue = Math.round(((k.totalRoyaltiesUSD ?? 0) + (k.totalKENP ?? 0) * 0.0045) * 100) / 100
                      const status = k.totalUnits >= 50 ? 'GREEN' : k.totalUnits >= 10 ? 'AMBER' : 'NEW'
                      score = {
                        channel: 'kdp',
                        status,
                        headline: `${k.totalUnits.toLocaleString()} units sold`,
                        metric: `$${estRevenue.toFixed(2)}`,
                        subline: `${k.totalUnits.toLocaleString()} units · ${(k.totalKENP ?? 0).toLocaleString()} KENP reads`,
                        badge: status === 'GREEN' ? 'Growing' : status === 'AMBER' ? 'Watch' : 'Starting',
                      } as ChannelScore
                    }

                    // Fallback for Meta: if no channelScore exists but synced data is in the DB,
                    // build a synthetic score from the raw meta fields so the card shows real numbers.
                    if (!score && card.key === 'meta' && analysis?.meta) {
                      const m = analysis.meta
                      const ctr: number = m.avgCTR ?? 0
                      const status = ctr >= 2 ? 'GREEN' : ctr >= 1 ? 'AMBER' : 'RED'
                      score = {
                        channel: 'meta',
                        status,
                        headline: `$${(m.totalSpend ?? 0).toFixed(2)} spent`,
                        metric: `$${(m.totalSpend ?? 0).toFixed(2)}`,
                        subline: `CTR ${ctr}% · CPC $${m.avgCPC ?? 0} · ${(m.totalImpressions ?? 0).toLocaleString()} impressions`,
                        badge: status === 'GREEN' ? 'Growing' : status === 'AMBER' ? 'Watch' : 'Fix this',
                      } as ChannelScore
                    }

                    // Fallback for MailerLite using live API data if available
                    if (!score && card.key === 'mailerlite') {
                      const ml = liveML ?? analysis?.mailerLite
                      if (ml) {
                        const status = ml.openRate >= 25 ? 'GREEN' : ml.openRate >= 15 ? 'AMBER' : 'RED'
                        score = {
                          channel: 'mailerlite',
                          status,
                          headline: `${ml.listSize.toLocaleString()} subscribers`,
                          metric: ml.listSize.toLocaleString(),
                          subline: `${ml.openRate}% open · ${ml.clickRate}% click`,
                          badge: status === 'GREEN' ? 'Growing' : status === 'AMBER' ? 'Watch' : 'Fix this',
                        } as ChannelScore
                      }
                    }

                    const badge = (score?.status ? STATUS_BADGE[score.status] : null) ?? STATUS_BADGE.NEW
                    return (
                      <div key={card.key}
                        className={`card p-4 hover:-translate-y-0.5 transition-all border-t-[3px] ${card.colorClass} animate-fade-up relative`}>
                        <Link href={card.href} className="absolute inset-0 z-0 no-underline" aria-label={card.name} />
                        <span className="mb-2.5 block"><card.icon size={20} strokeWidth={1.75} color={card.iconColor} /></span>
                        <div className="text-[10.5px] font-bold tracking-[0.8px] uppercase text-stone-500 mb-1">
                          {card.name}
                        </div>
                        <div className="font-sans text-[22px] text-[#0d1f35] tracking-tight leading-none mb-1.5">
                          {score?.metric || '—'}
                        </div>
                        <div className="text-[11px] text-stone-500 leading-snug mb-2.5">
                          {score?.subline || 'Add your files to see this'}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        {storyMode && score?.storyBullets && (
                          <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '0.5px solid #EEEBE6' }}>
                            <p className="text-[11px] leading-snug" style={{ color: '#374151' }}>
                              🟢 {score.storyBullets.win}
                            </p>
                            <p className="text-[11px] leading-snug" style={{ color: '#374151' }}>
                              📈 {score.storyBullets.trend}
                            </p>
                            <p className="text-[11px] leading-snug" style={{ color: '#374151' }}>
                              ➡️ {score.storyBullets.nextAction}
                            </p>
                          </div>
                        )}
                        {/* Data freshness footer */}
                        <div className="mt-2 pt-1.5 flex items-center gap-2" style={{ borderTop: '0.5px solid #EEEBE6' }}>
                          {card.key === 'kdp' && (
                            kdpLastUploadedAt
                              ? <span className="text-[9.5px] text-stone-400">Last upload: {fmtRelDate(kdpLastUploadedAt)}</span>
                              : <span className="text-[9.5px] text-stone-400">No upload yet</span>
                          )}
                          {card.key === 'mailerlite' && (
                            <>
                              <span className="text-[9.5px] font-bold" style={{ color: '#34d399' }}>● Live</span>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSyncML() }}
                                disabled={syncingML}
                                className="relative z-10 text-[9.5px] font-medium transition-colors"
                                style={{ color: syncingML ? '#9CA3AF' : '#6B7280', cursor: syncingML ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0 }}
                              >
                                {syncingML ? '↻ Syncing…' : '↻ Sync'}
                              </button>
                            </>
                          )}
                          {card.key === 'meta' && (
                            <>
                              <span className="text-[9.5px] text-stone-400">
                                {metaLastSync ? `Synced ${fmtRelDate(metaLastSync)}` : 'Not synced'}
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSyncMeta() }}
                                disabled={syncingMeta}
                                className="relative z-10 text-[9.5px] font-medium transition-colors"
                                style={{ color: syncingMeta ? '#9CA3AF' : '#6B7280', cursor: syncingMeta ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0 }}
                              >
                                {syncingMeta ? '↻ Syncing…' : '↻ Sync'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
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
                  <h2 className="font-sans text-[18px] text-[#0d1f35]">Your action plan — do these in order</h2>
                  <span className="text-[12px] text-stone-500">Based on your real data</span>
                </div>
                {loading ? (
                  <div className="card p-8 text-center">
                    <div className="text-[14px] font-sans text-[#0d1f35] animate-pulse">
                      {coachTitle.replace(' says', '')} is reading everything…
                    </div>
                  </div>
                ) : !analysis?.actionPlan?.length ? (
                  <div className="card p-8 text-center">
                    <div className="mb-3 flex justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#1E2D3D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="font-sans text-lg text-[#0d1f35] mb-2">
                      Upload your files to get your coaching session
                    </div>
                    <p className="text-sm text-stone-500 mb-4">
                      Drop your KDP report, Meta export, and Pinterest CSV to get a personalized action plan.
                    </p>
                    <Link href="/dashboard?upload=1" className="btn-primary no-underline inline-block">
                      Upload Files →
                    </Link>
                  </div>
                ) : (
                  <div className="card overflow-hidden mb-7">
                    <div className="px-5 py-3.5" style={{ background: '#FFF8F0', borderBottom: '1px solid #EEEBE6' }}>
                      <div className="font-sans text-[16px]" style={{ color: '#1E2D3D' }}>
                        {coachTitle.replace(' says', '')} reviewed everything. Here&apos;s what to do next.
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
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
                          style={{ background: '#F5F5F4', color: '#6B7280' }}>
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

      {/* ══════ SECTION 5 — YOUR GROWTH ROADMAP ═══════════════════ */}
      {analysis?.executiveSummary?.topActions && analysis.executiveSummary.topActions.length > 0 && (
        <div className="mb-7">
          <h2 className="font-sans text-[18px] text-[#0d1f35] mb-4">Your Growth Roadmap</h2>
          <div className="space-y-3">
            {analysis.executiveSummary.topActions.map((action: { label: string; href: string }, i: number) => {
              const isDone = false // future: track completion
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                    style={{
                      background: isDone ? '#1E2D3D' : 'transparent',
                      border: isDone ? 'none' : '2px solid #E9A020',
                      color: isDone ? 'white' : '#E9A020',
                    }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold" style={{ color: '#1E2D3D' }}>{action.label}</div>
                  </div>
                  <Link href={action.href}
                    className="text-[11.5px] font-semibold no-underline hover:underline"
                    style={{ color: '#E9A020' }}>
                    Start here →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════ SECTION 6 — CROSS-CHANNEL ACTION PLAN ═════════════ */}
      <div className="mb-7">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-sans text-[18px] text-[#0d1f35]">Cross-Channel Action Plan</h2>
          <span className="text-[12px] text-stone-500">AI-generated from your data</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'scale', label: 'SCALE',     icon: '▲', color: '#6EBF8B', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.scale },
            { key: 'fix',   label: 'FIX',       icon: '⚠', color: '#E9A020', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.fix },
            { key: 'cut',   label: 'CUT',       icon: '✕', color: '#F97B6B', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.cut },
            { key: 'test',  label: 'TEST NEXT', icon: '◆', color: '#60A5FA', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.test },
          ].map(col => (
            <div key={col.key} className="rounded-xl overflow-hidden"
              style={{ background: '#FFF8F0', border: '1px solid #EEEBE6', borderTop: `3px solid ${col.color}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EEEBE6' }}>
                <span className="text-[14px]" style={{ color: col.color }}>{col.icon}</span>
                <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: col.color }}>
                  {col.label}
                </span>
              </div>
              <div className="px-4 py-3">
                {col.items?.length ? (
                  <ul className="space-y-2 list-none p-0 m-0">
                    {col.items.map((item: string, i: number) => (
                      <li key={i} className="text-[12.5px] leading-relaxed" style={{ color: '#374151' }}>
                        <span className="mr-1.5" style={{ color: col.color }}>•</span>
                        <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>
                    Upload your files to unlock this insight
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History table — only shown when we have 2+ months */}
      {analyses.length >= 2 && (
        <>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-sans text-[18px] text-[#0d1f35]">How you're tracking over time</h2>
            <span className="text-[12px] text-stone-500">Last {analyses.length} months</span>
          </div>
          <div className="card overflow-hidden mb-7">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: '#FFF8F0', borderBottom: '1px solid #EEEBE6' }}>
                  {['Month', 'Royalties', 'Units', 'KENP', 'Ad Spend', 'Subscribers'].map((h, i) => (
                    <th key={h}
                      className={`py-3 font-semibold ${i === 0 ? 'text-left px-5' : 'text-right px-4'}`}
                      style={{ color: '#6B7280' }}>
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
                        <div className="font-semibold text-[#0d1f35]">{a.kdp ? fmtCurrency(a.kdp.totalRoyaltiesUSD) : '—'}</div>
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
                        <div className="font-semibold text-[#0d1f35]">{a.meta ? fmtCurrency(a.meta.totalSpend) : '—'}</div>
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

      {/* ── AI Coach panel — compact strip ── */}
      <div className="-mx-8 -mb-8 mt-2" style={{ background: '#FFF8F0', borderTop: '1px solid #EEEBE6' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-5">

          <div>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>
              Export your data to any AI
            </div>
            <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
              Formatted summary — paste into Claude, ChatGPT, or Gemini
            </p>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[13px]
                         font-bold transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:brightness-110 active:scale-[0.98]"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              {copying ? 'Copying…' : copied ? '✓ Copied' : 'Copy summary'}
            </button>

            {[
              { label: 'Claude', href: 'https://claude.ai' },
              { label: 'ChatGPT', href: 'https://chat.openai.com' },
              { label: 'Gemini', href: 'https://gemini.google.com' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] no-underline hover:underline hidden sm:inline"
                style={{ color: '#9CA3AF' }}
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
