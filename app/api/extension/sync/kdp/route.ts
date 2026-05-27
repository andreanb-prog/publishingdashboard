// SOURCE PRIORITY RULE: csv > extension > manual
// Never overwrite a higher-priority source with a lower-priority one
// This allows users to upload CSV history at any time without conflicts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'
import { shouldOverwrite } from '@/lib/kdpDataPriority'

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
  const currentMonth = today.substring(0, 7) // YYYY-MM
  const [yr, mo] = currentMonth.split('-').map(Number)
  const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`

  // If ANY csv-source row exists for this ASIN in the current month, skip —
  // the extension sends MTD totals which would double-count alongside daily CSV rows
  const csvRowExistsThisMonth = await db.kdpSale.findFirst({
    where: {
      userId: auth.userId,
      asin: book.asin,
      date: { gte: `${currentMonth}-01`, lt: `${nextMo}-01` },
      source: 'csv',
    },
    select: { id: true },
  })

  if (csvRowExistsThisMonth) {
    // Remove any stale extension row for this month — it duplicates the CSV data
    await db.kdpSale.deleteMany({
      where: {
        userId: auth.userId,
        asin: book.asin,
        date: { gte: `${currentMonth}-01`, lt: `${nextMo}-01` },
        source: 'extension',
      },
    })
    console.log(`KDP: skipping extension write, CSV data already exists for ${currentMonth}`)
    return NextResponse.json({ success: true, written: 0, note: 'csv_data_exists_for_month' })
  }

  // Check existing record before writing — respect source priority on same date
  const existing = await db.kdpSale.findUnique({
    where: { userId_asin_date_format: { userId: auth.userId, asin: book.asin, date: today, format: 'ebook' } },
    select: { source: true },
  })

  if (!shouldOverwrite(existing?.source ?? null, 'extension')) {
    console.log(`KDP: skipping extension write, CSV record exists for this date (${today})`)
    return NextResponse.json({ success: true, written: 0, note: 'csv_priority' })
  }

  await db.kdpSale.upsert({
    where: { userId_asin_date_format: { userId: auth.userId, asin: book.asin, date: today, format: 'ebook' } },
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
    update: {
      units:     payload.units     ?? 0,
      kenp:      payload.kenp      ?? 0,
      royalties: payload.royalties ?? 0,
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
