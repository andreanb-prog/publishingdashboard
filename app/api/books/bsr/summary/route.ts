// app/api/books/bsr/summary/route.ts
// GET /api/books/bsr/summary
// Returns 4 KPIs for the summary strip: totalSpend, bestBsr, overallRoas, costPerSub
// All computed over the last 7 days across all books for the current user.
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  since.setUTCHours(0, 0, 0, 0)

  const today = new Date()
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const [last7, todayLogs] = await Promise.all([
    db.bsrLog.findMany({
      where: { userId, date: { gte: since } },
    }),
    db.bsrLog.findMany({
      where: { userId, date: { gte: todayStart, lt: todayEnd } },
    }),
  ])

  // Today's total spend (sum across all books logged today)
  let totalSpend = todayLogs.reduce((s, r) => s + (r.adSpend ?? 0), 0)
  // If no BsrLog entries exist for today, fall back to MetaAdStat / MetaAdData directly
  if (totalSpend === 0) {
    const metaStats = await db.metaAdStat.findMany({
      where: { userId, date: { gte: todayStart, lt: todayEnd } },
    })
    if (metaStats.length > 0) {
      totalSpend = metaStats.reduce((s, r) => s + r.spend, 0)
    } else {
      const metaAdRows = await db.metaAdData.findMany({
        where: { userId, date: { gte: todayStart, lt: todayEnd } },
      })
      totalSpend = metaAdRows.reduce((s, r) => s + r.spend, 0)
    }
  }
  const totalSpendOrNull = totalSpend > 0 ? totalSpend : null

  // Best BSR: lowest rank logged today, falling back to most recent log ever
  const todayWithRank = todayLogs.filter((r): r is typeof r & { rank: number } => r.rank != null)
  let bestBsrRow: (typeof todayWithRank[0]) | null = todayWithRank.reduce<typeof todayWithRank[0] | null>(
    (best, r) => (best === null || r.rank < best.rank ? r : best),
    null
  )
  if (!bestBsrRow) {
    const mostRecentRankLog = await db.bsrLog.findFirst({
      where: { userId, rank: { not: null } },
      orderBy: { date: 'desc' },
    })
    if (mostRecentRankLog?.rank != null) {
      bestBsrRow = mostRecentRankLog as typeof todayWithRank[0]
    }
  }
  const bestBsr = bestBsrRow?.rank ?? null
  const bestBsrTitle = bestBsrRow?.bookTitle ?? null
  const bestBsrDate = bestBsrRow?.date ? (bestBsrRow.date as Date).toISOString().split('T')[0] : null

  // Overall ROAS last 7 days: total revenue ÷ total spend (all books)
  const totalRevenue = last7.reduce((s, r) => s + (r.revenue ?? 0), 0)
  const totalSpendAll = last7.reduce((s, r) => s + (r.adSpend ?? 0), 0)
  const overallRoas = totalSpendAll > 0 ? totalRevenue / totalSpendAll : null

  // Cost Per Subscriber: LM ad spend ÷ LM new subs (last 7 days)
  const lmRows = last7.filter(r => r.asin === 'LM')
  const lmSpend = lmRows.reduce((s, r) => s + (r.adSpend ?? 0), 0)
  const lmSubs = lmRows.reduce((s, r) => s + (r.newSubs ?? 0), 0)
  const costPerSub = lmSubs > 0 ? lmSpend / lmSubs : null

  return NextResponse.json({
    totalSpend: totalSpendOrNull !== null ? parseFloat(totalSpendOrNull.toFixed(2)) : null,
    bestBsr,
    bestBsrTitle,
    bestBsrDate,
    overallRoas: overallRoas !== null ? parseFloat(overallRoas.toFixed(2)) : null,
    costPerSub: costPerSub !== null ? parseFloat(costPerSub.toFixed(2)) : null,
  })
}
