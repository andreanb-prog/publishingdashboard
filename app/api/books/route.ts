// app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Default books to pre-populate when a user has none
const DEFAULT_BOOKS = [
  {
    title: 'My Off-Limits Roommate',
    asin: 'B0GSC2RTF8',
    seriesName: null,
    seriesOrder: null,
    isLeadMagnet: false,
    coverUrl: null,
    pubDate: null,
    sortOrder: 0,
  },
  {
    title: 'Fake Dating My Billionaire Protector',
    asin: 'B0GQD4J6VT',
    seriesName: null,
    seriesOrder: null,
    isLeadMagnet: false,
    coverUrl: null,
    pubDate: null,
    sortOrder: 1,
  },
]

// ASINs that must always be at their canonical positions.
// B0GSC2RTF8 = My Off-Limits Roommate  → B1 (sortOrder 0, coral)
// B0GQD4J6VT = Fake Dating My Billionaire Protector → B2 (sortOrder 1, peach)
const CANONICAL_ORDER: Record<string, number> = {
  B0GSC2RTF8: 0,
  B0GQD4J6VT: 1,
}

// GET — list user's books; auto-seed defaults if none exist
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.book.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: 'asc' },
  })

  if (existing.length > 0) {
    // One-time fix: ensure canonical books are at the right sortOrder positions.
    const fixes: Promise<unknown>[] = []
    for (const book of existing) {
      const asin = book.asin?.trim().toUpperCase()
      if (asin && CANONICAL_ORDER[asin] !== undefined && book.sortOrder !== CANONICAL_ORDER[asin]) {
        fixes.push(db.book.update({ where: { id: book.id }, data: { sortOrder: CANONICAL_ORDER[asin] } }))
      }
    }
    if (fixes.length > 0) {
      await Promise.all(fixes)
      const fixed = await db.book.findMany({ where: { userId: session.user.id }, orderBy: { sortOrder: 'asc' } })
      return NextResponse.json({ books: fixed })
    }
    return NextResponse.json({ books: existing })
  }

  // Auto-seed defaults on first load
  await db.book.createMany({
    data: DEFAULT_BOOKS.map(b => ({ ...b, userId: session.user.id })),
  })

  const seeded = await db.book.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ books: seeded })
}

// POST — create a new book
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await db.book.count({ where: { userId: session.user.id } })

  const body = await req.json()
  const book = await db.book.create({
    data: {
      userId: session.user.id,
      title: String(body.title ?? '').trim(),
      asin: body.asin ? String(body.asin).trim() : null,
      seriesName: body.seriesName ? String(body.seriesName).trim() : null,
      seriesOrder: body.seriesOrder != null ? Number(body.seriesOrder) : null,
      isLeadMagnet: Boolean(body.isLeadMagnet),
      coverUrl: body.coverUrl ? String(body.coverUrl) : null,
      pubDate: body.pubDate ? new Date(body.pubDate) : null,
      sortOrder: count,
    },
  })

  return NextResponse.json({ book })
}
