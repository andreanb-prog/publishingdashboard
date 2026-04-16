// app/api/books/bsr/summary/route.ts
// GET /api/books/bsr/summary
// Returns 4 KPIs for the summary strip: totalSpend, bestBsr, overallRoas, costPerSub
// All computed over the last 7 days across all books for the current user.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
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

  // Today's total spend (sum across all books including LM)
  const totalSpend = last7.reduce((s, r) => s + (r.adSpend ?? 0), 0) || null

  // Best BSR today: lowest rank logged today
  const todayWithRank = todayLogs.filter((r): r is typeof r & { rank: number } => r.rank != null)
  const bestBsrRow = todayWithRank.reduce<typeof todayWithRank[0] | null>(
    (best, r) => (best === null || r.rank < best.rank ? r : best),
    null
  )
  const bestBsr = bestBsrRow?.rank ?? null
  const bestBsrTitle = bestBsrRow?.bookTitle ?? null

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
    totalSpend: totalSpend !== null ? parseFloat(totalSpend.toFixed(2)) : null,
    bestBsr,
    bestBsrTitle,
    overallRoas: overallRoas !== null ? parseFloat(overallRoas.toFixed(2)) : null,
    costPerSub: costPerSub !== null ? parseFloat(costPerSub.toFixed(2)) : null,
  })
}
