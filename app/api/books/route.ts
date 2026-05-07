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

// GET — list the current user's books
export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' },
    })

    console.log('[GET /api/books] userId:', session.user.id, '| books found:', existing.length)

    const formatGroups = await db.kdpSale.groupBy({
      by: ['asin', 'format'],
      where: { userId: session.user.id, format: { not: null } },
      _count: { id: true },
    })
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

    return NextResponse.json({ books: existing.map(attachFormats) })
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
