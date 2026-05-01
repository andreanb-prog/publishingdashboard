// app/api/books/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

// PUT — update a book
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await db.book.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    console.log('[PUT /api/books/[id]] id:', params.id, '| body:', JSON.stringify(body).slice(0, 200))

    const book = await db.book.update({
      where: { id: params.id },
      data: {
        title: body.title != null ? String(body.title).trim() : existing.title,
        asin: body.asin !== undefined ? (body.asin ? String(body.asin).trim() : null) : existing.asin,
        asinPaperback: body.asinPaperback !== undefined ? (body.asinPaperback ? String(body.asinPaperback).trim() : null) : existing.asinPaperback,
        asinAudiobook: body.asinAudiobook !== undefined ? (body.asinAudiobook ? String(body.asinAudiobook).trim() : null) : existing.asinAudiobook,
        isbnPaperback: body.isbnPaperback !== undefined ? (body.isbnPaperback ? String(body.isbnPaperback).trim() : null) : existing.isbnPaperback,
        isbnHardcover: body.isbnHardcover !== undefined ? (body.isbnHardcover ? String(body.isbnHardcover).trim() : null) : existing.isbnHardcover,
        seriesName: body.seriesName !== undefined ? (body.seriesName ? String(body.seriesName).trim() : null) : existing.seriesName,
        seriesOrder: body.seriesOrder !== undefined ? (body.seriesOrder != null ? Number(body.seriesOrder) : null) : existing.seriesOrder,
        isLeadMagnet: body.isLeadMagnet !== undefined ? Boolean(body.isLeadMagnet) : existing.isLeadMagnet,
        coverUrl: body.coverUrl !== undefined ? (body.coverUrl || null) : existing.coverUrl,
        pubDate: body.pubDate !== undefined ? (body.pubDate ? new Date(body.pubDate) : null) : existing.pubDate,
        excludeFromDashboard: body.excludeFromDashboard !== undefined ? Boolean(body.excludeFromDashboard) : existing.excludeFromDashboard,
      },
    })

    console.log('[PUT /api/books/[id]] updated book id:', book.id)
    return NextResponse.json({ book })
  } catch (err) {
    console.error('[PUT /api/books/[id]] Prisma error:', err)
    const code = (err as { code?: string })?.code
    console.error('[PUT /api/books/[id]] Prisma error code:', code)
    if (code === 'P2002') {
      return NextResponse.json({ error: 'A book with this ASIN already exists in your catalog.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a book
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await db.book.findFirst({ where: { id: params.id, userId: session.user.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.book.delete({ where: { id: params.id } })

    // Repack sort_order for remaining books
    const remaining = await db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' },
    })
    await Promise.all(
      remaining.map((b, i) => db.book.update({ where: { id: b.id }, data: { sortOrder: i } }))
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/books/[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
