'use client'
// app/dashboard/OverviewClient.tsx
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'dompurify'

function SafeMarkdown({ content }: { content: string }) {
  const safe = typeof window !== 'undefined' ? DOMPurify.sanitize(content) : content
  return <ReactMarkdown>{safe}</ReactMarkdown>
}
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

type SwapCalendarEntry = { id: string; partnerName: string; bookTitle: string; promoDate: string; direction: string; status: string }

function buildCoachPrompt(
  analysis: Analysis | null,
  rankLogs: RankLog[],
  roasLogs: RoasLog[],
  swaps: SwapCalendarEntry[],
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

  if (swaps.length) {
    lines.push('## Newsletter Swap Calendar')
    swaps.forEach(s => {
      const date = new Date(s.promoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      lines.push(`  • ${date} — ${s.partnerName} | ${s.direction} | Status: ${s.status}`)
    })
    lines.push('')
  }

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
  const [open, setOpen] = useState(true)
  useEffect(() => {
    setOpen(localStorage.getItem('what-happened-seen') !== current.month)
  }, [current.month])
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

// ── Boutique v2.3: channel cards row ────────────────────────────────────────
function BoutiqueDeltaChip({ curr, prev }: { curr?: number | null; prev?: number | null }) {
  if (curr == null || prev == null || prev === 0) return null
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const flat = Math.abs(pct) < 2
  const up = pct > 0
  return (
    <div style={{
      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
      fontSize: 10, letterSpacing: '0.08em',
      color: flat ? 'var(--ink4, #8a8076)' : up ? 'var(--green-text, #245c3f)' : '#dc2626',
      marginTop: 4,
    }}>
      {flat ? '— flat' : `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`}
    </div>
  )
}

function BoutiqueChannelCardsRow({
  analysis, liveML, analyses,
}: {
  analysis: any
  liveML: import('@/types').MailerLiteData | null
  analyses: any[]
}) {
  const prev = analyses[1] ?? null

  const kdpVal     = analysis?.kdp?.totalRoyaltiesUSD ?? null
  const prevKdpVal = prev?.kdp?.totalRoyaltiesUSD ?? null

  const metaSpend    = analysis?.meta?.totalSpend ?? 0
  const kdpKuRev     = analysis?.kdp ? ((analysis.kdp.totalKENP ?? 0) * 0.0045) : 0
  const totalRev     = (analysis?.kdp?.totalRoyaltiesUSD ?? 0) + kdpKuRev
  const metaRoas     = metaSpend > 0 ? totalRev / metaSpend : null
  const prevMetaSpd  = prev?.meta?.totalSpend ?? 0
  const prevKuRev    = prev?.kdp ? ((prev.kdp.totalKENP ?? 0) * 0.0045) : 0
  const prevTotalRev = (prev?.kdp?.totalRoyaltiesUSD ?? 0) + prevKuRev
  const prevMetaRoas = prevMetaSpd > 0 ? prevTotalRev / prevMetaSpd : null

  const mlList     = liveML?.listSize ?? analysis?.mailerLite?.listSize ?? null
  const prevMlList = prev?.mailerLite?.listSize ?? null
  const mlOpenRate = liveML?.openRate ?? analysis?.mailerLite?.openRate ?? null

  const pinSaves     = analysis?.pinterest?.totalSaves ?? null
  const prevPinSaves = prev?.pinterest?.totalSaves ?? null

  const cards = [
    {
      label: 'KDP Royalties',
      dot: '#F97B6B',
      href: '/dashboard/kdp',
      display: kdpVal != null
        ? `$${kdpVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null,
      curr: kdpVal, prev: prevKdpVal,
      velocity: analysis?.kdp?.totalUnits
        ? `${(analysis.kdp.totalUnits as number).toLocaleString()} units`
        : null,
    },
    {
      label: 'Meta ROAS',
      dot: '#F4A261',
      href: '/dashboard/meta',
      display: metaRoas != null ? `${metaRoas.toFixed(2)}×` : null,
      curr: metaRoas, prev: prevMetaRoas,
      velocity: metaSpend > 0
        ? `$${(metaSpend as number).toLocaleString(undefined, { maximumFractionDigits: 2 })} spend`
        : null,
    },
    {
      label: 'MailerLite List',
      dot: '#5BBFB5',
      href: '/dashboard/mailerlite',
      display: mlList != null ? (mlList as number).toLocaleString() : null,
      curr: mlList, prev: prevMlList,
      velocity: mlOpenRate != null ? `${mlOpenRate}% open` : null,
    },
    {
      label: 'Pinterest Saves',
      dot: '#60A5FA',
      href: '/dashboard/pinterest',
      display: pinSaves != null ? (pinSaves as number).toLocaleString() : null,
      curr: pinSaves, prev: prevPinSaves,
      velocity: analysis?.pinterest?.saveRate != null
        ? `${analysis.pinterest.saveRate}% save rate`
        : null,
    },
  ]

  return (
    <div className="boutique-channel-row" style={{
      border: '1px solid var(--line, #d8cfbd)',
      background: 'var(--card, white)',
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {cards.map((card, i) => (
        <Link key={card.label} href={card.href} style={{
          display: 'block', textDecoration: 'none',
          background: 'var(--card, white)',
          padding: '20px 22px',
          borderRight: i < cards.length - 1 ? '1px solid var(--line, #d8cfbd)' : 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--ink4, #8a8076)', marginBottom: 8,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: card.dot, flexShrink: 0, display: 'inline-block',
            }} />
            {card.label}
          </div>

          <div style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 32, fontWeight: 500, lineHeight: 1,
            color: card.display ? 'var(--ink, #14110f)' : 'var(--ink4, #8a8076)',
            marginBottom: 4,
          }}>
            {card.display ?? '—'}
          </div>

          <BoutiqueDeltaChip curr={card.curr} prev={card.prev} />

          {card.velocity && (
            <div style={{
              marginTop: 6, display: 'inline-block',
              border: '1px solid var(--line, #d8cfbd)', padding: '2px 6px',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink4, #8a8076)',
            }}>
              {card.velocity}
            </div>
          )}

          {!card.display && (
            <div style={{
              marginTop: 8, display: 'inline-block',
              border: '1px solid var(--line, #d8cfbd)', padding: '2px 8px',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink4, #8a8076)',
            }}>
              Connect to unlock
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

// ── Boutique v2.3: coach promoted panel ─────────────────────────────────────
function CoachPromotedPanel({ analysis }: { analysis: any }) {
  const topInsight: CoachingInsight | undefined =
    (analysis?.actionPlan as CoachingInsight[] | undefined)?.find((i: CoachingInsight) => i.type === 'RED') ??
    (analysis?.actionPlan as CoachingInsight[] | undefined)?.[0]
  if (!topInsight) return null

  let triggerNum: string | null = null
  let triggerLabel = ''
  let triggerIsNeg = true
  const ch = topInsight.channel
  if (ch === 'meta' && analysis.meta) {
    triggerNum = `${((analysis.meta.avgCTR ?? 0) as number).toFixed(1)}%`
    triggerLabel = 'CTR'
    triggerIsNeg = (analysis.meta.avgCTR ?? 0) < 1
  } else if ((ch === 'kdp' || ch === 'general') && analysis.kdp) {
    const rev = ((analysis.kdp.totalRoyaltiesUSD ?? 0) as number) +
                ((analysis.kdp.totalKENP ?? 0) as number) * 0.0045
    triggerNum = `$${rev.toFixed(2)}`
    triggerLabel = 'Est. Revenue'
    triggerIsNeg = rev < 100
  } else if (ch === 'email' && analysis.mailerLite) {
    triggerNum = `${((analysis.mailerLite.openRate ?? 0) as number).toFixed(1)}%`
    triggerLabel = 'Open Rate'
    triggerIsNeg = (analysis.mailerLite.openRate ?? 0) < 20
  }

  const href = ch === 'kdp' ? '/dashboard/kdp'
    : ch === 'meta' ? '/dashboard/meta'
    : ch === 'email' ? '/dashboard/mailerlite'
    : ch === 'pinterest' ? '/dashboard/pinterest'
    : '/dashboard?upload=1'

  const titleParts = topInsight.title.split(/\b(fix|scale|cut|improve|low|high|drop|weak|strong)\b/gi)

  return (
    <div className="coach-panel-responsive" style={{
      background: 'var(--card, white)',
      border: '1px solid var(--line, #d8cfbd)',
      borderLeft: '4px solid var(--amber, #E9A020)',
      marginBottom: 24,
      padding: '20px 24px',
      display: 'flex', gap: 24, alignItems: 'flex-start',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--amber-text, #a56b13)',
          }}>
            Coach
          </span>
          <span style={{
            background: 'var(--amber-soft, #f5deaa)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--amber-text, #a56b13)',
            padding: '2px 7px', borderRadius: 20,
          }}>
            New
          </span>
        </div>

        <p style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 'clamp(15px, 2vw, 22px)', fontStyle: 'italic', fontWeight: 400,
          color: 'var(--ink, #14110f)', lineHeight: 1.45,
          marginBottom: 16, marginTop: 0,
        }}>
          {titleParts.map((part, j) =>
            /^(fix|scale|cut|improve|low|high|drop|weak|strong)$/i.test(part)
              ? <em key={j} style={{ fontStyle: 'normal', color: 'var(--amber-text, #a56b13)', fontWeight: 500 }}>{part}</em>
              : part
          )}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={href} style={{
            display: 'inline-block', textDecoration: 'none',
            background: 'var(--navy, #1E2D3D)', color: 'var(--paper, #f7f1e5)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '8px 16px',
          }}>
            Fix this →
          </Link>
          <Link href={href} style={{
            display: 'inline-block', textDecoration: 'none',
            background: 'transparent', color: 'var(--ink3, #564e46)',
            border: '1px solid var(--line, #d8cfbd)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '8px 16px',
          }}>
            See full report
          </Link>
        </div>
      </div>

      {triggerNum && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--ink4, #8a8076)', marginBottom: 4,
          }}>
            {triggerLabel}
          </div>
          <div style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 34, fontWeight: 500, lineHeight: 1,
            color: triggerIsNeg ? '#dc2626' : 'var(--green-text, #245c3f)',
          }}>
            {triggerNum}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Boutique v2.3: right rail components ────────────────────────────────────
function RailLaunchCountdown() {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: 'var(--ink4, #8a8076)', marginBottom: 16,
      }}>
        Launch Countdown
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
        padding: '16px',
        border: '1px dashed var(--line, #d8cfbd)',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 15, fontWeight: 400, color: 'var(--ink3, #564e46)',
        }}>
          No launch scheduled
        </div>
        <Link href="/dashboard/launch" style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--amber-text, #a56b13)', textDecoration: 'none',
        }}>
          Plan a launch →
        </Link>
      </div>
    </div>
  )
}

function RailTasksSection({ tasks }: { tasks: import('@/types').Task[] }) {
  const doneTasks = tasks.filter(t => t.status === 'done').slice(0, 2)
  const openTasks = tasks.filter(t => t.status === 'todo')
  const topTask   = openTasks[0] ?? null
  const restTasks = openTasks.slice(1, 3)

  const doneCount = tasks.filter(t => t.status === 'done').length
  const total     = Math.min(tasks.length, 5)
  const r         = 15
  const circ      = 2 * Math.PI * r
  const dashOff   = total > 0 ? circ * (1 - doneCount / total) : circ

  function fmtCompletedTime(iso: string | null | undefined) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="17" cy="17" r={r} stroke="var(--line, #d8cfbd)" strokeWidth="2.5" />
          {total > 0 && (
            <circle
              cx="17" cy="17" r={r}
              stroke="var(--amber, #E9A020)" strokeWidth="2.5"
              strokeDasharray={circ}
              strokeDashoffset={dashOff}
              strokeLinecap="round"
              transform="rotate(-90 17 17)"
            />
          )}
        </svg>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--ink4, #8a8076)',
          }}>
            Today&apos;s Tasks
          </div>
          {total > 0 && (
            <div style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: 13, fontStyle: 'italic',
              color: 'var(--amber-text, #a56b13)',
            }}>
              {doneCount} / {total} done
            </div>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{
          padding: '12px 14px',
          border: '1px dashed var(--line, #d8cfbd)',
          fontFamily: 'var(--font-serif, Georgia, serif)',
          fontSize: 13, color: 'var(--ink3, #564e46)',
        }}>
          No tasks yet.{' '}
          <Link href="/dashboard/tasks" style={{ color: 'var(--amber-text, #a56b13)', textDecoration: 'none' }}>
            Add one →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {doneTasks.map(t => (
            <div key={t.id} style={{
              padding: '8px 12px', opacity: 0.7,
              border: '1px solid var(--line, #d8cfbd)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 12, fontStyle: 'italic', color: 'var(--ink3, #564e46)',
                textDecoration: 'line-through', flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.title}
              </span>
              {t.completedAt && (
                <span style={{
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 9, color: 'var(--ink4, #8a8076)', flexShrink: 0,
                }}>
                  {fmtCompletedTime(t.completedAt)}
                </span>
              )}
            </div>
          ))}

          {topTask && (
            <div style={{
              padding: '12px 14px',
              border: '1.5px solid var(--amber, #E9A020)',
              background: 'linear-gradient(135deg, rgba(233,160,32,0.05) 0%, rgba(233,160,32,0.01) 100%)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--amber-text, #a56b13)', marginBottom: 4,
              }}>
                Next up
              </div>
              <div style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 13, fontStyle: 'italic',
                color: 'var(--ink, #14110f)', marginBottom: 6,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {topTask.title}
              </div>
              {topTask.category && (
                <div style={{
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 9, color: 'var(--ink4, #8a8076)', marginBottom: 8,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {topTask.category}
                </div>
              )}
              <Link href="/dashboard/tasks" style={{
                display: 'inline-block', textDecoration: 'none',
                background: 'var(--navy, #1E2D3D)', color: 'var(--paper, #f7f1e5)',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '5px 10px',
              }}>
                Start →
              </Link>
            </div>
          )}

          {restTasks.map(t => (
            <div key={t.id} style={{
              padding: '10px 12px',
              border: '1px solid var(--line, #d8cfbd)',
              background: 'white',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 12, fontStyle: 'italic', color: 'var(--ink2, #2a2520)',
                flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t.title}
              </span>
              <Link href="/dashboard/tasks" style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--ink4, #8a8076)', textDecoration: 'none', flexShrink: 0,
              }}>
                Skip
              </Link>
            </div>
          ))}

          {openTasks.length > 3 && (
            <Link href="/dashboard/tasks" style={{
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--amber-text, #a56b13)', textDecoration: 'none', marginTop: 4,
              display: 'block',
            }}>
              +{openTasks.length - 3} more →
            </Link>
          )}
        </div>
      )}
    </div>
  )
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
  const [coachTitle, setCoachTitle] = useState('Your marketing coach says')
  useEffect(() => { setCoachTitle(getCoachTitle()) }, [])
  const [greeting, setGreeting] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')
  }, [])
  const [expandedPriority, setExpandedPriority] = useState<number | null>(null)
  const [donePriorities, setDonePriorities] = useState<Set<number>>(new Set())
  const [showCompleted, setShowCompleted] = useState(true)
  const [isFresh,     setIsFresh]     = useState(false)
  const [storyMode,   setStoryMode]   = useState(true)
  const [swapCalendar, setSwapCalendar] = useState<SwapCalendarEntry[]>([])

  function toggleStoryMode() {
    setStoryMode(prev => {
      const next = !prev
      localStorage.setItem('story-mode', String(next))
      return next
    })
  }

  // Fetch per-user swap calendar from DB (never hardcoded)
  useEffect(() => {
    fetch('/api/swaps/calendar')
      .then(r => r.json())
      .then(d => setSwapCalendar(d.swaps ?? []))
      .catch(() => setSwapCalendar([]))
  }, [])

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

  // Load done priorities from localStorage on mount (avoids hydration mismatch)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const stored = localStorage.getItem('priorities-done')
      if (!stored) return
      const { date, indices } = JSON.parse(stored)
      if (date !== today) return
      setDonePriorities(new Set<number>(indices))
    } catch {}
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('authordash_date_range')
      if (stored) {
        const parsed = JSON.parse(stored)
        const def = getDefaultDateRange()
        if (parsed.from !== def.from || parsed.to !== def.to) setRefreshKey(k => k + 1)
      }
    } catch {}
  }, [])

  const [refreshKey,   setRefreshKey]   = useState(0)
  const [liveML,       setLiveML]       = useState<import('@/types').MailerLiteData | null>(initialData?.mailerLiteData ?? null)
  const [metaLastSync, setMetaLastSync] = useState<string | null>(initialData?.metaLastSync ?? null)
  const [syncingMeta,  setSyncingMeta]  = useState(false)
  const [syncingML,    setSyncingML]    = useState(false)
  const [metaErrorBanner, setMetaErrorBanner] = useState(false)
  const [railTasks, setRailTasks] = useState<import('@/types').Task[]>([])

  useEffect(() => {
    fetch('/api/tasks?status=todo')
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (Array.isArray(data)) setRailTasks(data.slice(0, 6))
      })
      .catch(() => {})
  }, [])

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

    // Read the current date range from localStorage (Apply writes there before dispatching
    // the event, so this is always current regardless of React render timing).
    const { from, to } = (() => {
      try {
        const stored = localStorage.getItem('authordash_date_range')
        if (stored) return JSON.parse(stored) as { from: string; to: string }
      } catch {}
      return getDefaultDateRange()
    })()
    const dateParams = new URLSearchParams({ from, to }).toString()

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

  // Trigger a fresh Claude analysis after upload clears AI-generated fields.
  // Called when analysis has channel data but no actionPlan (happens after KDP upload
  // because parse-kdp clears stale coaching copy from the record).
  const hasTriggeredReanalysis = useRef(false)
  async function triggerReanalysis(currentAnalysis: any) {
    if (!currentAnalysis?.month) return
    setGenerating(true)
    try {
      const body = {
        kdp:        currentAnalysis.kdp        ?? undefined,
        meta:       currentAnalysis.meta       ?? undefined,
        mailerLite: currentAnalysis.mailerLite ?? undefined,
        pinterest:  currentAnalysis.pinterest  ?? undefined,
        month:      currentAnalysis.month,
      }
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok || !response.body) return
      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'complete' && event.analysis) setAnalysis(event.analysis)
          } catch { /* ignore partial SSE chunks */ }
        }
      }
    } catch { /* ignore */ }
    finally { setGenerating(false) }
  }

  // Auto-trigger reanalysis when analysis has channel data but no Claude output —
  // this is the state the record is in immediately after a KDP upload clears stale fields.
  useEffect(() => {
    if (!analysis) return
    if (analysis.actionPlan?.length) { hasTriggeredReanalysis.current = false; return }
    const hasChannelData = !!(analysis.kdp || analysis.meta || analysis.mailerLite)
    if (!hasChannelData) return
    if (hasTriggeredReanalysis.current) return
    hasTriggeredReanalysis.current = true
    triggerReanalysis(analysis)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])

  // Re-fetch when an upload completes (fired by UploadModal on any page)
  useEffect(() => {
    function onUploadComplete() { setRefreshKey(k => k + 1) }
    window.addEventListener('dashboard-data-refresh', onUploadComplete)
    return () => window.removeEventListener('dashboard-data-refresh', onUploadComplete)
  }, [])

  // Listen for date range changes fired by TopBar.
  // localStorage is updated by Apply before the event is dispatched,
  // so incrementing refreshKey is sufficient — the fetch effect reads
  // the current range directly from localStorage.
  useEffect(() => {
    function onDateRangeChange() {
      setRefreshKey(k => k + 1)
    }
    window.addEventListener('date-range-change', onDateRangeChange)
    return () => window.removeEventListener('date-range-change', onDateRangeChange)
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
      const prompt = buildCoachPrompt(analysis, rankLogs, roasLogs, swapCalendar)
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

      {/* ── Two-column layout: main content (flex-1) + right rail (320px at xl+) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]" style={{ gap: '0 32px', alignItems: 'start' }}>
      <div className="min-w-0">

      {/* Boutique v2.3 greeting line — shown when analysis is loaded */}
      {!loading && analysis && (
        <div className="mb-5">
          <p style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(20px, 2.5vw, 30px)',
            fontWeight: 500, lineHeight: 1.3,
            color: 'var(--ink, #14110f)', margin: 0,
          }}>
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            {buildStorySentence(analysis) && (
              <>
                {' — '}
                <em style={{ fontStyle: 'italic', color: 'var(--amber-text, #a56b13)' }}>
                  {buildStorySentence(analysis)}
                </em>
              </>
            )}
          </p>
        </div>
      )}

      {/* Empty state — new user with no data yet */}
      {!analysis && analyses.length === 0 && (
        <div className="mb-7">
          <div className="mb-1" style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(20px, 2.5vw, 28px)',
            fontWeight: 500, lineHeight: 1.3,
            color: 'var(--ink, #1E2D3D)',
          }}>
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}. Your dashboard is ready — it just needs your data.
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


      {/* Hero number — Boutique v2.3 */}
      <div className="rounded-xl mb-4"
        style={{ background: 'white', border: '1px solid var(--line, #d8cfbd)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '28px 28px 22px' }}>

        {/* Live label */}
        <div style={{
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'var(--green-text, #245c3f)',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-text, #245c3f)', display: 'inline-block', flexShrink: 0 }} />
          Est. Revenue · MTD · Live
        </div>

        {/* Big number */}
        {analysis?.kdp ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 500, color: 'var(--ink3, #564e46)', lineHeight: 1 }}>
              $
            </span>
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(64px, 9vw, 104px)', fontWeight: 500, color: 'var(--ink, #14110f)', lineHeight: 1 }}>
              {Math.floor(animRev).toLocaleString()}
            </span>
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 500, color: 'var(--ink3, #564e46)', lineHeight: 1 }}>
              .{String(Math.round((animRev % 1) * 100)).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 80, fontWeight: 300, color: 'var(--ink4, #8a8076)', lineHeight: 1 }}>
            —
          </div>
        )}

        {/* Breakdown line */}
        {analysis?.kdp && (
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: '1px dashed var(--line, #d8cfbd)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 11, color: 'var(--ink3, #564e46)',
          }}>
            <span>${(analysis.kdp.totalRoyaltiesUSD ?? 0).toLocaleString()} gross</span>
            {(analysis.meta?.totalSpend ?? 0) > 0 && (
              <>
                <span style={{ color: 'var(--ink4, #8a8076)' }}> · minus </span>
                <span style={{ color: '#dc2626' }}>${(analysis.meta.totalSpend).toLocaleString()}</span>
                <span style={{ color: 'var(--ink4, #8a8076)' }}> Meta spend</span>
              </>
            )}
            <span style={{ color: 'var(--ink4, #8a8076)' }}> · minus $0 returns = </span>
            <span style={{ color: 'var(--ink, #14110f)', fontWeight: 600 }}>
              ${Math.max(0, Math.round(animRev - (analysis.meta?.totalSpend ?? 0))).toLocaleString()} net
            </span>
          </div>
        )}

        {/* Secondary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line, #d8cfbd)' }}>
          {[
            { label: 'Units Sold', value: analysis?.kdp ? Math.round(animUnits).toLocaleString() : null },
            { label: 'KENP Reads', value: analysis?.kdp ? Math.round(animKenp).toLocaleString()  : null },
            { label: 'Best CTR',   value: analysis?.meta?.bestAd ? `${animCtr.toFixed(1)}%`       : null },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--ink4, #8a8076)', marginBottom: 3,
              }}>
                {stat.label}
              </div>
              {stat.value != null ? (
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--ink, #14110f)' }}>
                  {stat.value}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink4, #8a8076)', marginBottom: 2 }}>No data</div>
                  <Link href="/dashboard?upload=1" style={{ fontSize: 10, color: '#E9A020', textDecoration: 'none', fontWeight: 600 }}>
                    Upload →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════ COACH PROMOTED PANEL ════════════════════════════════ */}
      {analysis && <CoachPromotedPanel analysis={analysis} />}

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
                  <SafeMarkdown content={item} />
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
                  <SafeMarkdown content={item} />
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
                <BoutiqueChannelCardsRow analysis={analysis} liveML={liveML} analyses={analyses} />
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

      {/* ══════ COACHING NARRATIVE ════════════════════════════════ */}
      {analyses.length >= 2 && <WhatHappenedCard current={analyses[0]} previous={analyses[1]} actionPlan={analysis?.actionPlan} />}

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
                        <SafeMarkdown content={item} />
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

      </div>{/* /main content col */}

      {/* Right rail — visible only at xl+ (≥1280px) */}
      <aside
        className="hidden xl:flex"
        style={{
          flexDirection: 'column',
          borderLeft: '1px solid var(--line, #d8cfbd)',
          padding: '40px 28px',
          background: 'rgba(254,251,244,0.5)',
          alignSelf: 'start',
          position: 'sticky',
          top: 24,
        }}
      >
        <RailLaunchCountdown />
        <RailTasksSection tasks={railTasks} />
      </aside>
      </div>{/* /xl grid */}

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
