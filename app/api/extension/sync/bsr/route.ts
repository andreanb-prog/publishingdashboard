export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

interface BsrBook {
  asin: string
  title?: string
  bsr: number
  marketplace?: string
  direction?: string
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as {
    syncedAt?: string
    books?: BsrBook[]
  }

  const books: BsrBook[] = Array.isArray(body.books) ? body.books : []

  if (books.length === 0) {
    return NextResponse.json({ error: 'No books provided' }, { status: 400 })
  }

  // Load all ASINs the user has registered so we can match incoming books
  const userBooks = await db.book.findMany({
    where: { userId: auth.userId, asin: { not: null } },
    select: { asin: true, title: true },
  })

  const userAsinSet = new Set(userBooks.map((b) => b.asin!.trim().toUpperCase()))

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const dateValue = new Date(today + 'T00:00:00.000Z')

  let written = 0
  let skipped = 0

  for (const book of books) {
    if (!book.asin || typeof book.bsr !== 'number') {
      skipped++
      continue
    }

    const normalizedAsin = book.asin.trim().toUpperCase()

    if (!userAsinSet.has(normalizedAsin)) {
      skipped++
      continue
    }

    // Upsert: one BSR record per (userId, asin, date) from the extension
    const existing = await db.bsrLog.findFirst({
      where: { userId: auth.userId, asin: normalizedAsin, date: dateValue, source: 'extension' },
      select: { id: true },
    })

    if (existing) {
      await db.bsrLog.update({
        where: { id: existing.id },
        data: { rank: book.bsr, fetchedAt: new Date() },
      })
    } else {
      await db.bsrLog.create({
        data: {
          userId:    auth.userId,
          asin:      normalizedAsin,
          bookTitle: book.title ?? null,
          rank:      book.bsr,
          date:      dateValue,
          source:    'extension',
        },
      })
    }

    written++
  }

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'bsr', dataPoints: books.length, status: 'success' },
  })

  return NextResponse.json({ success: true, written, skipped })
}
