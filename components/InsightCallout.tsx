'use client'
// components/InsightCallout.tsx — Dynamic AI insight boxes (#32)
// Shows "alarm" or "cheerleader" callouts based on data patterns

import { useState } from 'react'
import type { Analysis } from '@/types'

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

  if (meta && meta.avgCTR < 0.8 && meta.ads.length >= 2) {
    insights.push({
      mode: 'alarm',
      source: 'meta',
      text: `Your average ad **CTR is ${meta.avgCTR}%**, which is below the 1% threshold most authors aim for. Low CTR means your ad creative or targeting isn't resonating — consider testing new images or narrowing your audience. Think of this as your inciting incident — the moment that sets the next chapter in motion.`,
    })
  }

  if (ml && ml.unsubscribes > 50) {
    insights.push({
      mode: 'alarm',
      source: 'mailerlite',
      text: `You've had **${ml.unsubscribes} unsubscribes** recently — that's higher than usual. Check if a recent campaign had a spike, sometimes a subject line mismatch or too-frequent sends can trigger this. Consider this your cliffhanger — the unresolved thread that needs attention before the next chapter.`,
    })
  }

  if (ml && ml.listSize === 0) {
    insights.push({
      mode: 'alarm',
      source: 'mailerlite',
      text: `Your **email list size is 0**. This could mean your MailerLite API key isn't pulling data correctly, or you genuinely haven't started list building yet. Either way, this is the plot tension in your author journey — the good news is you're the author and you can rewrite it.`,
    })
  }

  if (meta) {
    const lowRoas = meta.ads.filter(a => a.spend > 5 && a.clicks > 0 && (a.spend / a.clicks) > 2)
    if (lowRoas.length >= 2) {
      insights.push({
        mode: 'alarm',
        source: 'meta',
        text: `**${lowRoas.length} ads** have a cost-per-click above $2.00 — that's expensive for book marketing. Consider pausing these and reallocating budget to your better-performing ads. Every story needs editing, and sometimes the bravest revision is cutting what isn't working.`,
      })
    }
  }

  // ── Cheerleader triggers ──
  if (ml && ml.openRate > 30) {
    insights.push({
      mode: 'cheer',
      source: 'mailerlite',
      text: `Your **${ml.openRate}% open rate** is outstanding — well above the 20-25% author average. Your subject lines are clearly resonating with your readers, and they're leaning in every time you show up in their inbox. That's the mark of a great storyteller.`,
    })
  }

  if (ml && ml.clickRate > 4) {
    insights.push({
      mode: 'cheer',
      source: 'mailerlite',
      text: `A **${ml.clickRate}% click rate** is exceptional. Your readers aren't just opening — they're taking action, following every thread you weave. This is your story's rising action, and it's working.`,
    })
  }

  if (meta && meta.bestAd && meta.bestAd.ctr > 2) {
    insights.push({
      mode: 'cheer',
      source: 'meta',
      text: `Plot twist — your top ad "**${meta.bestAd.name}**" is pulling a **${meta.bestAd.ctr}% CTR**, well above average. Your readers are showing up in a big way. Consider increasing its budget or creating similar variations to keep the momentum building.`,
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
    </div>
  )
}
