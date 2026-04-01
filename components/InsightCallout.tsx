'use client'
// components/InsightCallout.tsx — Dynamic AI insight boxes (#32)
// Shows "alarm" or "cheerleader" callouts based on data patterns

import type { Analysis } from '@/types'

interface Insight {
  mode: 'alarm' | 'cheer'
  text: string
}

function detectInsights(analysis: Analysis): Insight[] {
  const insights: Insight[] = []
  const kdp = analysis.kdp
  const meta = analysis.meta
  const ml = analysis.mailerLite

  // ── Alarm triggers ──
  if (kdp && kdp.totalRoyaltiesUSD === 0 && kdp.totalUnits > 0) {
    insights.push({
      mode: 'alarm',
      text: `You sold **${kdp.totalUnits} units** this month but earned **$0 in royalties**. This usually means your books are priced at $0.00 or enrolled in a free promo. If that's intentional, great — but if not, check your KDP pricing immediately.`,
    })
  }

  if (meta && meta.avgCTR < 0.8 && meta.ads.length >= 2) {
    insights.push({
      mode: 'alarm',
      text: `Your average ad **CTR is ${meta.avgCTR}%**, which is below the 1% threshold most authors aim for. Low CTR means your ad creative or targeting isn't resonating. Consider testing new images or narrowing your audience.`,
    })
  }

  if (ml && ml.unsubscribes > 50) {
    insights.push({
      mode: 'alarm',
      text: `You've had **${ml.unsubscribes} unsubscribes** recently — that's higher than usual. Check if a recent campaign had a spike. Sometimes a subject line mismatch or too-frequent sends can trigger this.`,
    })
  }

  if (ml && ml.listSize === 0) {
    insights.push({
      mode: 'alarm',
      text: `Your **email list size is 0**. This could mean your MailerLite API key isn't pulling data correctly, or you genuinely haven't started list building yet. Either way, this is your most important channel to grow.`,
    })
  }

  if (meta) {
    const lowRoas = meta.ads.filter(a => a.spend > 5 && a.clicks > 0 && (a.spend / a.clicks) > 2)
    if (lowRoas.length >= 2) {
      insights.push({
        mode: 'alarm',
        text: `**${lowRoas.length} ads** have a cost-per-click above $2.00. That's expensive for book marketing. Consider pausing these and reallocating budget to your better-performing ads.`,
      })
    }
  }

  // ── Cheerleader triggers ──
  if (ml && ml.openRate > 30) {
    insights.push({
      mode: 'cheer',
      text: `Your **${ml.openRate}% open rate** is outstanding — well above the 20-25% author average. Your subject lines are clearly resonating with your readers. Keep doing what you're doing!`,
    })
  }

  if (ml && ml.clickRate > 4) {
    insights.push({
      mode: 'cheer',
      text: `A **${ml.clickRate}% click rate** is exceptional. Your readers aren't just opening — they're taking action. This means your email content and CTAs are highly relevant.`,
    })
  }

  if (meta && meta.bestAd && meta.bestAd.ctr > 2) {
    insights.push({
      mode: 'cheer',
      text: `Your top ad "**${meta.bestAd.name}**" is crushing it with a **${meta.bestAd.ctr}% CTR**. That's well above average. Consider increasing its budget or creating similar variations.`,
    })
  }

  if (kdp && kdp.totalUnits > 0 && kdp.totalRoyaltiesUSD > 0) {
    const perUnit = kdp.totalRoyaltiesUSD / kdp.totalUnits
    if (perUnit > 3) {
      insights.push({
        mode: 'cheer',
        text: `You're earning **$${perUnit.toFixed(2)} per unit** — that's a healthy royalty rate. Your pricing strategy is working well for your current genre and format mix.`,
      })
    }
  }

  return insights
}

// Per-page insight filters
const PAGE_FILTERS: Record<string, (i: Insight) => boolean> = {
  overview: () => true,
  kdp: (i) => i.text.includes('unit') || i.text.includes('royalt') || i.text.includes('per unit') || i.text.includes('KDP'),
  meta: (i) => i.text.includes('ad') || i.text.includes('CTR') || i.text.includes('click') || i.text.includes('Meta'),
  mailerlite: (i) => i.text.includes('open rate') || i.text.includes('click rate') || i.text.includes('unsubscribe') || i.text.includes('list size') || i.text.includes('email'),
  pinterest: () => false,
}

export function InsightCallouts({ analysis, page = 'overview' }: { analysis: Analysis; page?: string }) {
  const all = detectInsights(analysis)
  const filter = PAGE_FILTERS[page] || (() => true)
  const insights = all.filter(filter)

  if (insights.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      {insights.map((insight, i) => {
        const isAlarm = insight.mode === 'alarm'
        return (
          <div key={i} className="rounded-xl p-4"
            style={{
              background: '#FFF8F0',
              border: '1px solid #EEEBE6',
              borderLeft: `4px solid ${isAlarm ? '#E9A020' : '#6EBF8B'}`,
            }}>
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-1.5"
              style={{ color: isAlarm ? '#E9A020' : '#6EBF8B' }}>
              {isAlarm ? '⚠️ Watch this' : '🎉 Nice work'}
            </div>
            <div className="text-[13px] leading-[1.7]" style={{ color: '#374151' }}
              dangerouslySetInnerHTML={{
                __html: insight.text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1E2D3D">$1</strong>'),
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
