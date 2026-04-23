'use server'

import { getAugmentedSession } from '@/lib/getSession'
import type { Analysis, RankLog, RoasLog } from '@/types'

type SwapCalendarEntry = { id: string; partnerName: string; bookTitle: string; promoDate: string; direction: string; status: string }

export async function buildCoachPromptAction(
  analysis: Analysis | null,
  rankLogs: RankLog[],
  roasLogs: RoasLog[],
  swaps: SwapCalendarEntry[],
): Promise<string> {
  const session = await getAugmentedSession()
  if (!session?.user?.id) throw new Error('Unauthorized')

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
