// app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { logAdminAction } from '@/lib/adminAudit'

const BookSchema = z.object({
  title: z.string().min(1),
  asin: z.string().optional().nullable(),
  seriesName: z.string().optional().nullable(),
  seriesOrder: z.number().optional().nullable(),
  isLeadMagnet: z.boolean().optional(),
  coverUrl: z.string().optional().nullable(),
  pubDate: z.string().optional().nullable(),
})

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
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' },
    })

    console.log('[GET /api/books] userId:', session.user.id, '| books found:', existing.length)

    // Never auto-seed default books into an impersonated user's account
    if (existing.length === 0 && session.user.adminImpersonating) {
      return NextResponse.json({ books: [] })
    }

    // Fetch KdpSale format counts for all ASINs belonging to this user
    const formatGroups = await db.kdpSale.groupBy({
      by: ['asin', 'format'],
      where: { userId: session.user.id, format: { not: null } },
      _count: { id: true },
    })
    // Build a map: asin -> Set of formats with at least 1 record
    const asinFormats = new Map<string, Set<string>>()
    for (const row of formatGroups) {
      if (!row.format || row._count.id === 0) continue
      const s = asinFormats.get(row.asin) ?? new Set<string>()
      s.add(row.format.toLowerCase())
      asinFormats.set(row.asin, s)
    }

    const attachFormats = <T extends { asin: string | null }>(book: T) => {
      const formats = book.asin ? Array.from(asinFormats.get(book.asin) ?? []) : []
      return { ...book, formatBadges: formats }
    }

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
        console.log('[GET /api/books] after canonical fix, returning:', fixed.length, 'books')
        return NextResponse.json({ books: fixed.map(attachFormats) })
      }
      return NextResponse.json({ books: existing.map(attachFormats) })
    }

    // Auto-seed defaults on first load
    console.log('[GET /api/books] no books found — seeding defaults for userId:', session.user.id)
    await db.book.createMany({
      data: DEFAULT_BOOKS.map(b => ({ ...b, userId: session.user.id })),
    })

    const seeded = await db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' },
    })
    console.log('[GET /api/books] seeded', seeded.length, 'books')
    return NextResponse.json({ books: seeded.map(attachFormats) })
  } catch (err) {
    console.error('[GET /api/books] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a new book
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const count = await db.book.count({ where: { userId: session.user.id } })
    const rawBody = await req.json()
    const parsed = BookSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const body = parsed.data

    console.log('[POST /api/books] userId:', session.user.id)
    console.log('[POST /api/books] attempting create with data:', JSON.stringify(body, null, 2))

    const createData = {
      userId: session.user.id,
      title: String(body.title ?? '').trim(),
      asin: body.asin ? String(body.asin).trim() : null,
      seriesName: body.seriesName ? String(body.seriesName).trim() : null,
      seriesOrder: body.seriesOrder != null ? Number(body.seriesOrder) : null,
      isLeadMagnet: Boolean(body.isLeadMagnet),
      coverUrl: body.coverUrl ? String(body.coverUrl) : null,
      pubDate: body.pubDate ? new Date(body.pubDate) : null,
      sortOrder: count,
    }

    const book = await db.book.create({ data: createData })

    console.log('[POST /api/books] created book id:', book.id, '| title:', book.title)

    if (session.user.adminImpersonating && session.user.adminRealEmail) {
      logAdminAction(session.user.adminRealEmail, session.user.adminImpersonating, 'book_added', {
        asin: book.asin ?? null,
        title: book.title,
      })
    }

    return NextResponse.json({ book })
  } catch (err) {
    console.error('[POST /api/books] Prisma error:', err)
    // Surface the Prisma error code so we can diagnose constraint violations
    const code = (err as { code?: string })?.code
    console.error('[POST /api/books] Prisma error code:', code)
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'A book with this ASIN already exists in your catalog.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
