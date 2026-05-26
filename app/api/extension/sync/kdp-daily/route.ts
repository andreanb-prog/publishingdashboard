export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

interface DailyRow {
  date: string
  title: string
  kenp?: number
  units?: number
}

function toDateString(raw: string): string | null {
  // Accept YYYY-MM-DD or anything Date can parse; normalize to YYYY-MM-DD
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as {
    type?: string
    rows?: DailyRow[]
  }

  const type = body.type
  if (type !== 'kenp' && type !== 'orders') {
    return NextResponse.json({ error: 'type must be "kenp" or "orders"' }, { status: 400 })
  }

  const rows: DailyRow[] = Array.isArray(body.rows) ? body.rows : []

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Load all books for this user (need title + asin for matching)
  const userBooks = await db.book.findMany({
    where: { userId: auth.userId, asin: { not: null } },
    select: { asin: true, title: true },
  })

  if (userBooks.length === 0) {
    await db.extensionSyncLog.create({
      data: { userId: auth.userId, platform: 'kdp_daily', dataPoints: rows.length, status: 'success' },
    })
    return NextResponse.json({ success: true, written: 0, skipped: rows.length })
  }

  let written = 0
  let skipped = 0

  for (const row of rows) {
    const dateStr = toDateString(row.date)
    if (!dateStr || !row.title) {
      skipped++
      continue
    }

    // Fuzzy title match: find first book whose title includes this row's title, or vice versa
    const rowTitleLower = row.title.toLowerCase()
    const matched = userBooks.find((b) => {
      const bookTitleLower = b.title.toLowerCase()
      return bookTitleLower.includes(rowTitleLower) || rowTitleLower.includes(bookTitleLower)
    })

    if (!matched?.asin) {
      skipped++
      continue
    }

    const asin = matched.asin!

    // Check if a CSV record already exists for this date+asin — if so, skip to preserve quality
    const csvRecord = await db.kdpSale.findUnique({
      where: { userId_asin_date_format: { userId: auth.userId, asin, date: dateStr, format: 'ebook' } },
      select: { id: true, source: true },
    })

    if (csvRecord && csvRecord.source === 'csv') {
      skipped++
      continue
    }

    if (type === 'kenp') {
      await db.kdpSale.upsert({
        where: { userId_asin_date_format: { userId: auth.userId, asin, date: dateStr, format: 'ebook' } },
        create: {
          userId: auth.userId,
          asin,
          title: matched.title,
          date: dateStr,
          format: 'ebook',
          kenp: row.kenp ?? 0,
          source: 'extension',
        },
        update: {
          kenp: row.kenp ?? 0,
          source: 'extension',
        },
      })
    } else {
      await db.kdpSale.upsert({
        where: { userId_asin_date_format: { userId: auth.userId, asin, date: dateStr, format: 'ebook' } },
        create: {
          userId: auth.userId,
          asin,
          title: matched.title,
          date: dateStr,
          format: 'ebook',
          units: row.units ?? 0,
          source: 'extension',
        },
        update: {
          units: row.units ?? 0,
          source: 'extension',
        },
      })
    }

    written++
  }

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'kdp_daily', dataPoints: rows.length, status: 'success' },
  })

  return NextResponse.json({ success: true, written, skipped })
}
