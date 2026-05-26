export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

interface BsrPoint {
  date: string
  bsr: number
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as {
    asin?: string
    history?: BsrPoint[]
  }

  const asin = typeof body.asin === 'string' ? body.asin.trim().toUpperCase() : null
  const history: BsrPoint[] = Array.isArray(body.history) ? body.history : []

  if (!asin) {
    return NextResponse.json({ error: 'asin is required' }, { status: 400 })
  }

  if (history.length === 0) {
    return NextResponse.json({ error: 'No history provided' }, { status: 400 })
  }

  // Verify this ASIN belongs to the user
  const book = await db.book.findFirst({
    where: { userId: auth.userId, asin },
    select: { asin: true, title: true },
  })

  if (!book) {
    await db.extensionSyncLog.create({
      data: { userId: auth.userId, platform: 'bsr_history', dataPoints: history.length, status: 'success' },
    })
    return NextResponse.json({ success: true, written: 0, skipped: history.length })
  }

  let written = 0
  let skipped = 0

  for (const point of history) {
    if (typeof point.bsr !== 'number' || !point.date) {
      skipped++
      continue
    }

    const parsed = new Date(point.date)
    if (isNaN(parsed.getTime())) {
      skipped++
      continue
    }

    // Normalize to start-of-day UTC
    const dateValue = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
    )

    // Skip if any BsrLog already exists for this user+asin+date — don't overwrite
    const existing = await db.bsrLog.findFirst({
      where: { userId: auth.userId, asin, date: dateValue },
      select: { id: true },
    })

    if (existing) {
      skipped++
      continue
    }

    await db.bsrLog.create({
      data: {
        userId:    auth.userId,
        asin,
        bookTitle: book.title ?? null,
        rank:      point.bsr,
        date:      dateValue,
        source:    'extension',
      },
    })

    written++
  }

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'bsr_history', dataPoints: history.length, status: 'success' },
  })

  return NextResponse.json({ success: true, written, skipped })
}
