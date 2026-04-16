// app/api/books/bsr/log/route.ts
// POST /api/books/bsr/log — upsert a BsrLog entry (one per user+asin per day)
// Accepts all ROAS Hub fields; auto-fills adSpend and newSubs from stored data when not provided.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/** Normalize a date string (YYYY-MM-DD) or today to midnight UTC */
function toMidnightUTC(dateStr?: string | null): Date {
  if (dateStr) {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0])) {
      return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    }
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    asin,
    bookTitle,
    rank,
    adSpend,
    clicks,
    revenue,
    pageReads,
    orders,
    newSubs,
    lpv,
    notes,
    date: dateStr,
  } = body

  if (!asin) return NextResponse.json({ error: 'Missing asin' }, { status: 400 })

  const date = toMidnightUTC(dateStr)
  const userId = session.user.id
  const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000)

  // Auto-fill adSpend from MetaAdStat if not provided in body
  let resolvedAdSpend: number | null = adSpend !== undefined ? (adSpend ?? null) : null
  let adSpendAutoFilled = false
  if (resolvedAdSpend === null) {
    const metaStats = await db.metaAdStat.findMany({
      where: { userId, date: { gte: date, lt: dayEnd } },
    })
    if (metaStats.length > 0) {
      resolvedAdSpend = metaStats.reduce((s, r) => s + r.spend, 0)
      adSpendAutoFilled = true
    }
    // Fallback: MetaAdData if MetaAdStat is empty
    if (resolvedAdSpend === null) {
      const metaAdRows = await db.metaAdData.findMany({
        where: { userId, date: { gte: date, lt: dayEnd } },
      })
      if (metaAdRows.length > 0) {
        resolvedAdSpend = metaAdRows.reduce((s, r) => s + r.spend, 0)
        adSpendAutoFilled = true
      }
    }
  }

  // Auto-fill newSubs from MailerLiteSnapshot daily diff if not provided
  let resolvedNewSubs: number | null = newSubs !== undefined ? (newSubs ?? null) : null
  let newSubsAutoFilled = false
  if (resolvedNewSubs === null) {
    const snapshot = await db.mailerLiteSnapshot.findFirst({
      where: { userId, date: { gte: date, lt: dayEnd } },
      orderBy: { date: 'desc' },
    })
    if (snapshot) {
      const prevDate = new Date(date.getTime() - 24 * 60 * 60 * 1000)
      const prevSnapshot = await db.mailerLiteSnapshot.findFirst({
        where: { userId, date: { gte: prevDate, lt: date } },
        orderBy: { date: 'desc' },
      })
      if (prevSnapshot) {
        resolvedNewSubs = Math.max(0, snapshot.activeCount - prevSnapshot.activeCount)
        newSubsAutoFilled = true
      }
    }
  }

  // Find existing record for this user+asin+date (window: midnight to midnight)
  const existing = await db.bsrLog.findFirst({
    where: { userId, asin, date: { gte: date, lt: dayEnd } },
  })

  // Build update payload — only include fields explicitly present in the request body
  // (so a cell-level edit doesn't overwrite other fields with null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    bookTitle: bookTitle ?? existing?.bookTitle ?? null,
    date,
    fetchedAt: new Date(),
  }
  if ('rank' in body) updateData.rank = rank ?? null
  if (resolvedAdSpend !== null) {
    updateData.adSpend = resolvedAdSpend
    updateData.adSpendAutoFilled = adSpendAutoFilled
  } else if ('adSpend' in body && adSpend === null) {
    // Explicit null clear
    updateData.adSpend = null
    updateData.adSpendAutoFilled = false
  }
  if ('clicks' in body) updateData.clicks = clicks ?? null
  if ('revenue' in body) updateData.revenue = revenue ?? null
  if ('pageReads' in body) updateData.pageReads = pageReads ?? null
  if ('orders' in body) updateData.orders = orders ?? null
  if (resolvedNewSubs !== null) {
    updateData.newSubs = resolvedNewSubs
    updateData.newSubsAutoFilled = newSubsAutoFilled
  } else if ('newSubs' in body && newSubs === null) {
    updateData.newSubs = null
    updateData.newSubsAutoFilled = false
  }
  if ('lpv' in body) updateData.lpv = lpv ?? null
  if ('notes' in body) updateData.notes = notes ? String(notes).substring(0, 100) : null

  let log
  if (existing) {
    log = await db.bsrLog.update({ where: { id: existing.id }, data: updateData })
  } else {
    log = await db.bsrLog.create({
      data: { userId, asin, ...updateData },
    })
  }

  // Compute derived fields for response
  const cpc = log.adSpend && log.clicks && log.clicks > 0 ? log.adSpend / log.clicks : null
  const roas = log.revenue && log.adSpend && log.adSpend > 0 ? log.revenue / log.adSpend : null
  const costPerSub =
    log.adSpend && log.newSubs && log.newSubs > 0 ? log.adSpend / log.newSubs : null

  return NextResponse.json({ success: true, log: { ...log, cpc, roas, costPerSub } })
}
