'use client'
// components/InsightCallout.tsx — Dynamic AI insight boxes (#32)
// Shows "alarm" or "cheerleader" callouts based on data patterns

import { useState, useEffect } from 'react'
import type { Analysis } from '@/types'
import pepTalkBank from '@/pep-talk-bank.json'

interface Insight {
  mode: 'alarm' | 'cheer'
  text: string
  source: 'kdp' | 'meta' | 'mailerlite'
}

function detectInsights(analysis: Analysis): Insight[] {
  const insights: Insight[] = []
  const kdp = analysis.kdp
  const meta = analysis.meta
  const ml = analysis.mailerLite

  // ── Alarm triggers ──
  if (kdp && kdp.totalRoyaltiesUSD === 0 && kdp.totalKENP === 0 && kdp.totalUnits > 0) {
    insights.push({
      mode: 'alarm',
      source: 'kdp',
      text: `You sold **${kdp.totalUnits} units** this month but earned **$0 in royalties**. This usually means your books are priced at $0.00 or enrolled in a free promo. If that's intentional, great — but if not, check your KDP pricing immediately. Every great story has a dark moment before the breakthrough — this is yours to fix.`,
    })
  }

  // Royalty-per-unit check — only flag as a crisis when pricing clearly can't explain it.
  // 99¢ books at 35% royalty earn ~$0.347/unit, which is normal and intentional.
  // Only alarm when royaltiesPerUnit < $0.20 AND sold > 20 units (not explainable by 99¢ pricing).
  if (kdp && kdp.totalUnits > 20 && kdp.totalRoyaltiesUSD > 0) {
    const royaltiesPerUnit = kdp.totalRoyaltiesUSD / kdp.totalUnits
    if (royaltiesPerUnit < 0.20) {
      insights.push({
        mode: 'alarm',
        source: 'kdp',
        text: `Your royalties look lower than expected — **$${royaltiesPerUnit.toFixed(3)} per unit** across ${kdp.totalUnits} sales. This sometimes happens with a partial upload or books priced near $0. Check that your KDP export covers the full date range and that your book pricing in KDP is set correctly.`,
      })
    }
  }

  if (meta && meta.avgCTR < 0.8 && meta.ads.length >= 2) {
    insights.push({
      mode: 'alarm',
      source: 'meta',
      text: `Your average ad **CTR is ${meta.avgCTR}%**, which is below the 1% threshold most authors aim for. Low CTR means your ad creative isn't stopping the scroll. Go to Meta Ads Manager, duplicate your lowest-CTR ad, and test a new cover image or ad hook. Think of this as your inciting incident — the moment that sets the next chapter in motion.`,
    })
  }

  if (ml && ml.unsubscribes > 50) {
    insights.push({
      mode: 'alarm',
      source: 'mailerlite',
      text: `You've had **${ml.unsubscribes} unsubscribes** recently — that's higher than usual. Go to MailerLite, pull your last 3 campaigns, and check which send had the unsubscribe spike — a subject line mismatch or back-to-back sends in the same week is usually the culprit. Fix the send cadence before your next campaign goes out.`,
    })
  }

  if (ml && ml.listSize === 0) {
    insights.push({
      mode: 'alarm',
      source: 'mailerlite',
      text: `Your **email list size is 0**. This could mean your MailerLite API key isn't pulling data correctly, or you genuinely haven't started list building yet. Go to Settings and reconnect your MailerLite account — if the key is valid and the count still shows 0, upload a subscriber CSV directly in MailerLite to verify your list is active.`,
    })
  }

  if (meta) {
    const lowRoas = meta.ads.filter(a => a.spend > 5 && a.clicks > 0 && (a.spend / a.clicks) > 2)
    if (lowRoas.length >= 2) {
      insights.push({
        mode: 'alarm',
        source: 'meta',
        text: `**${lowRoas.length} ads** have a cost-per-click above $2.00 — that's expensive for book marketing. Go to Meta Ads Manager, pause these ${lowRoas.length} ads today, and shift that budget to your lowest-CPC ad. Every story needs editing, and the bravest revision is cutting what isn't earning.`,
      })
    }
  }

  // ── Cheerleader triggers ──
  if (ml && ml.openRate > 30) {
    insights.push({
      mode: 'cheer',
      source: 'mailerlite',
      text: `Your **${ml.openRate}% open rate** is outstanding — well above the 20-25% author average. Your subject lines are clearly resonating with your email subscribers. Go to MailerLite, note the subject line patterns from your top-performing campaigns, and replicate that format in your next send.`,
    })
  }

  if (ml && ml.clickRate > 4) {
    insights.push({
      mode: 'cheer',
      source: 'mailerlite',
      text: `A **${ml.clickRate}% click rate** is exceptional. Your email subscribers aren't just opening — they're clicking through and taking action. Go to MailerLite, identify which CTA placement and button copy drove this, and replicate it in your next campaign.`,
    })
  }

  if (meta && meta.bestAd && meta.bestAd.ctr > 2) {
    insights.push({
      mode: 'cheer',
      source: 'meta',
      text: `Plot twist — your top ad "**${meta.bestAd.name}**" is pulling a **${meta.bestAd.ctr}% CTR**, well above average. Buyers are clicking at a strong rate. Go to Meta Ads Manager, duplicate this ad, scale the budget 20%, and test one variation with a different ad hook to see if you can push it higher.`,
    })
  }

  if (kdp && kdp.totalUnits > 0 && kdp.totalRoyaltiesUSD > 0) {
    const perUnit = kdp.totalRoyaltiesUSD / kdp.totalUnits
    if (perUnit > 3) {
      insights.push({
        mode: 'cheer',
        source: 'kdp',
        text: `You're earning **$${perUnit.toFixed(2)} per unit** — that's a healthy royalty rate and your pricing strategy is landing exactly where it should. This is the moment your protagonist finds their power — keep going.`,
      })
    }
  }

  return insights
}

// Per-page insight filters — use source tag, not text matching
const PAGE_FILTERS: Record<string, (i: Insight) => boolean> = {
  overview: () => true,
  kdp: (i) => i.source === 'kdp',
  meta: (i) => i.source === 'meta',
  mailerlite: (i) => i.source === 'mailerlite',
  pinterest: () => false,
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const [collapsed, setCollapsed] = useState(true)
  const isAlarm = insight.mode === 'alarm'
  const borderColor = isAlarm ? '#E9A020' : '#6EBF8B'
  const pillBg      = isAlarm ? '#E9A020' : '#6EBF8B'
  const cardBg      = isAlarm ? 'rgba(233,160,32,0.06)' : 'rgba(110,191,139,0.06)'

  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: cardBg,
        border: '1px solid #EEEBE6',
        borderLeft: `3px solid ${borderColor}`,
      }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-transparent border-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span style={{
            background: pillBg,
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            {isAlarm ? 'Watch This' : 'Nice Work'}
          </span>
          {collapsed && (
            <span className="text-[11px] truncate max-w-[300px]" style={{ color: '#6B7280' }}>
              {insight.text.replace(/\*\*/g, '').slice(0, 60)}…
            </span>
          )}
        </div>
        <span className="text-[11px] flex-shrink-0 ml-2 transition-transform duration-200"
          style={{ color: '#6B7280', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 -mt-1">
          <div className="text-[13px] leading-[1.7]" style={{ color: '#374151' }}
            dangerouslySetInnerHTML={{
              __html: insight.text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1E2D3D">$1</strong>'),
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Pep Talk Bank ────────────────────────────────────────────────────────────
type PepCategory = 'flat_day' | 'ad_spend_fear' | 'small_wins' | 'we_see_you'
interface PepEntry { quote: string; source: string }

function pickPepCategory(analysis: Analysis): PepCategory | null {
  const units   = analysis.kdp?.totalUnits ?? 0
  const spend   = analysis.meta?.totalSpend ?? 0
  const royalties = analysis.kdp?.totalRoyaltiesUSD ?? 0
  const roas    = spend > 0 ? royalties / spend : null

  // Never show when data is strongly positive
  if (units > 20 && roas != null && roas > 2) return null

  if (units === 0) return 'flat_day'
  if (roas != null && roas < 1 && spend > 0) return 'ad_spend_fear'

  // All metrics positive but values under 20
  if (units > 0 && units < 20) return 'small_wins'

  return 'we_see_you'
}

function PepTalkCard({ analysis }: { analysis: Analysis }) {
  const [storyMode, setStoryMode] = useState(true)

  // Stable random pick — one per mount
  const [entry] = useState<PepEntry | null>(() => {
    const cat = pickPepCategory(analysis)
    if (!cat) return null
    const pool = pepTalkBank[cat] as PepEntry[]
    return pool[Math.floor(Math.random() * pool.length)]
  })

  useEffect(() => {
    const stored = localStorage.getItem('story-mode')
    if (stored !== null) setStoryMode(stored === 'true')

    function handler(e: Event) {
      setStoryMode((e as CustomEvent<{ on: boolean }>).detail.on)
    }
    window.addEventListener('story-mode-change', handler)
    return () => window.removeEventListener('story-mode-change', handler)
  }, [])

  if (!storyMode || !entry) return null

  return (
    <div style={{
      background: '#FFF8F0',
      borderLeft: '3px solid #E9A020',
      borderRadius: '0.75rem',
      padding: '14px 18px',
    }}>
      <p style={{ margin: 0, fontSize: 15, fontStyle: 'italic', color: '#1E2D3D', lineHeight: 1.65 }}>
        &ldquo;{entry.quote}&rdquo;
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9CA3AF' }}>
        — {entry.source}
      </p>
    </div>
  )
}

export function InsightCallouts({ analysis, page = 'overview' }: { analysis: Analysis; page?: string }) {
  const all = detectInsights(analysis)
  const filter = PAGE_FILTERS[page] || (() => true)
  const insights = all.filter(filter)

  if (insights.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {insights.map((insight, i) => (
        <InsightCard key={i} insight={insight} index={i} />
      ))}
      <PepTalkCard analysis={analysis} />
    </div>
  )
}
