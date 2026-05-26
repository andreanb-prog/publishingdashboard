export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

function hasOnlyZeroOrNullNumbers(obj: Record<string, unknown>): boolean {
  const nums = Object.values(obj).filter((v) => typeof v === 'number' || v === null)
  if (nums.length === 0) return false
  return nums.every((v) => v === null || v === 0)
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as {
    page?: string
    syncedAt?: string
    data?: { kenp?: number; royalties?: number; units?: number; dateRange?: string | null }
  }

  const payload = body.data ?? {}

  if (hasOnlyZeroOrNullNumbers(payload as Record<string, unknown>)) {
    await db.extensionSyncLog.create({
      data: { userId: auth.userId, platform: 'kdp', dataPoints: 0, status: 'rejected_zeros' },
    })
    return NextResponse.json({ error: 'Rejected: zero-value payload' }, { status: 400 })
  }

  const dataPoints = Object.values(payload).filter((v) => typeof v === 'number' && v !== 0).length
  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'kdp', dataPoints, status: 'success' },
  })

  // Find the user's first Kindle eBook ASIN from their Books table
  const book = await db.book.findFirst({
    where: { userId: auth.userId, asin: { not: null }, isLeadMagnet: false },
    orderBy: { sortOrder: 'asc' },
    select: { asin: true, title: true },
  })

  if (!book?.asin) {
    return NextResponse.json({ success: true, written: 0, note: 'no_book_asin' })
  }

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Delete any prior extension-sourced records for today before writing fresh data.
  // This prevents doubles when the extension fires more than once on the same day.
  // CSV records (source = 'csv' or null) are never touched.
  await db.kdpSale.deleteMany({
    where: { userId: auth.userId, date: today, source: 'extension' },
  })

  await db.kdpSale.upsert({
    where: {
      userId_asin_date_format: {
        userId: auth.userId,
        asin:   book.asin,
        date:   today,
        format: 'ebook',
      },
    },
    update: {
      units:     payload.units     ?? 0,
      kenp:      payload.kenp      ?? 0,
      royalties: payload.royalties ?? 0,
      source:    'extension',
    },
    create: {
      userId:    auth.userId,
      asin:      book.asin,
      date:      today,
      title:     book.title,
      units:     payload.units     ?? 0,
      kenp:      payload.kenp      ?? 0,
      royalties: payload.royalties ?? 0,
      format:    'ebook',
      source:    'extension',
    },
  })

  // Record an UploadLog so "Last upload" reflects this sync
  await db.uploadLog.create({
    data: {
      userId:   auth.userId,
      fileType: 'kdp',
      fileName: 'extension-sync',
      rowCount: 1,
      status:   'success',
      details:  {},
    },
  })

  return NextResponse.json({ success: true, written: 1 })
}
