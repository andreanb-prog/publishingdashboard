// app/api/books/bsr/export/route.ts
// GET /api/books/bsr/export
// Returns all BsrLog entries for the user grouped by book slot for client-side Excel export.
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

function dateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function computeRows(logs: Awaited<ReturnType<typeof db.bsrLog.findMany>>) {
  return logs.map((log, i) => {
    const prevRank = i > 0 ? (logs[i - 1].rank ?? null) : null
    const rankChange =
      log.rank != null && prevRank != null ? prevRank - log.rank : null
    const cpc =
      log.adSpend && log.clicks && log.clicks > 0
        ? log.adSpend / log.clicks
        : null
    const roas =
      log.revenue && log.adSpend && log.adSpend > 0
        ? log.revenue / log.adSpend
        : null
    const costPerSub =
      log.adSpend && log.newSubs && log.newSubs > 0
        ? log.adSpend / log.newSubs
        : null
    return {
      date: dateKey(new Date(log.date)),
      rank: log.rank,
      rankChange,
      adSpend: log.adSpend,
      clicks: log.clicks,
      cpc,
      ctr: null as null,
      revenue: log.revenue,
      roas,
      pageReads: log.pageReads,
      orders: log.orders,
      newSubs: log.newSubs,
      lpv: log.lpv,
      notes: log.notes,
      costPerSub,
    }
  })
}

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Get user's books in slot order (first 3 non-LM books)
  const books = await db.book.findMany({
    where: { userId, isLeadMagnet: false },
    orderBy: { sortOrder: 'asc' },
    take: 3,
  })

  // Fetch all BsrLog entries for this user
  const allLogs = await db.bsrLog.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  })

  // Group logs by asin
  const byAsin = new Map<string, typeof allLogs>()
  for (const log of allLogs) {
    if (!byAsin.has(log.asin)) byAsin.set(log.asin, [])
    byAsin.get(log.asin)!.push(log)
  }

  // Build per-slot data
  const slots: Record<string, ReturnType<typeof computeRows>> = {}
  for (let i = 0; i < 3; i++) {
    const book = books[i]
    const bookLogs = book?.asin ? (byAsin.get(book.asin) ?? []) : []
    slots[`b${i + 1}`] = computeRows(bookLogs)
  }

  // Lead Magnet
  const lmLogs = byAsin.get('LM') ?? []
  slots.lm = computeRows(lmLogs)

  return NextResponse.json({
    date: dateKey(new Date()),
    books: books.map((b, i) => ({
      slot: `b${i + 1}`,
      title: b.title,
      asin: b.asin,
    })),
    b1: slots.b1,
    b2: slots.b2,
    b3: slots.b3,
    lm: slots.lm,
  })
}
