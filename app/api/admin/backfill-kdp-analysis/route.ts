// app/api/admin/backfill-kdp-analysis/route.ts
//
// One-shot admin endpoint that walks every user's KdpSale rows, groups them by
// month, and refreshes each user's Analysis record's `kdp` slice so the
// dashboard reflects the latest parsed data. Use after deploying parser fixes
// to heal users who uploaded under the buggy parser and whose Analysis record
// wasn't refreshed by subsequent re-uploads.
//
// Preserves other channels (meta, mailerLite, pinterest, coaching output) on
// existing Analysis records — only the `kdp` field is replaced.
//
// POST /api/admin/backfill-kdp-analysis
// Body (optional): { dryRun?: boolean, userId?: string }
//   dryRun: if true, compute and report but don't write
//   userId: if set, only backfill that one user
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ADMIN_EMAILS } from '@/lib/getSession'

export const maxDuration = 300

interface BookAgg {
  asin: string
  title: string
  units: number
  kenp: number
  royalties: number
  format?: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { dryRun?: boolean; userId?: string } = {}
  try { body = await req.json() } catch { /* empty body allowed */ }
  const dryRun = body.dryRun === true

  const userWhere = body.userId ? { userId: body.userId } : {}
  const userIds = (await db.kdpSale.findMany({
    where: userWhere,
    distinct: ['userId'],
    select: { userId: true },
  })).map(r => r.userId)

  console.log(`[backfill] scanning ${userIds.length} users (dryRun=${dryRun})`)

  const report: Array<{
    userId: string
    month: string
    totalUnits: number
    totalKENP: number
    totalRoyaltiesUSD: number
    bookCount: number
    action: 'created' | 'updated' | 'skipped-dry-run'
  }> = []

  for (const userId of userIds) {
    const rows = await db.kdpSale.findMany({ where: { userId } })
    const byMonth = new Map<string, typeof rows>()
    for (const row of rows) {
      const month = row.date.substring(0, 7)
      const list = byMonth.get(month) ?? []
      list.push(row)
      byMonth.set(month, list)
    }

    for (const [month, monthRows] of Array.from(byMonth.entries())) {
      const bookMap = new Map<string, BookAgg>()
      const dailyUnitsMap = new Map<string, number>()
      const dailyKENPMap = new Map<string, number>()

      for (const r of monthRows) {
        const b = bookMap.get(r.asin)
        if (b) {
          b.units += r.units
          b.kenp += r.kenp
          b.royalties += r.royalties
        } else {
          bookMap.set(r.asin, {
            asin: r.asin,
            title: r.title,
            units: r.units,
            kenp: r.kenp,
            royalties: r.royalties,
            format: r.format ?? undefined,
          })
        }
        dailyUnitsMap.set(r.date, (dailyUnitsMap.get(r.date) ?? 0) + r.units)
        dailyKENPMap.set(r.date, (dailyKENPMap.get(r.date) ?? 0) + r.kenp)
      }

      const books = Array.from(bookMap.values())
        .sort((a, b) => b.units - a.units)
        .map(b => ({
          ...b,
          shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '...' : b.title,
          format: b.format as 'ebook' | 'paperback' | undefined,
        }))

      const dailyUnits = Array.from(dailyUnitsMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const dailyKENP = Array.from(dailyKENPMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const totalUnits = books.reduce((s, b) => s + b.units, 0)
      const totalKENP = books.reduce((s, b) => s + b.kenp, 0)
      const totalRoyaltiesUSD = books.reduce((s, b) => s + b.royalties, 0)
      const paperbackUnits = books.filter(b => b.format === 'paperback').reduce((s, b) => s + b.units, 0)
      const paidUnits = totalUnits - paperbackUnits

      const kdpData = {
        month,
        totalUnits,
        totalKENP,
        totalRoyaltiesUSD,
        books,
        dailyUnits,
        dailyKENP,
        summary: { paidUnits, freeUnits: 0, paperbackUnits },
        rowCount: monthRows.length,
      }

      const existing = await db.analysis.findFirst({ where: { userId, month } })
      let action: 'created' | 'updated' | 'skipped-dry-run'

      if (dryRun) {
        action = 'skipped-dry-run'
      } else if (existing) {
        const existingData = (existing.data as Record<string, unknown>) ?? {}
        await db.analysis.update({
          where: { id: existing.id },
          data: { data: { ...existingData, kdp: kdpData } as object },
        })
        action = 'updated'
      } else {
        await db.analysis.create({
          data: { userId, month, data: { month, kdp: kdpData } as object },
        })
        action = 'created'
      }

      report.push({
        userId,
        month,
        totalUnits,
        totalKENP,
        totalRoyaltiesUSD: Math.round(totalRoyaltiesUSD * 100) / 100,
        bookCount: books.length,
        action,
      })
    }
  }

  console.log(`[backfill] processed ${report.length} user-months`)
  return NextResponse.json({
    ok: true,
    dryRun,
    usersScanned: userIds.length,
    userMonthsProcessed: report.length,
    report,
  })
}
