// app/api/books/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// PUT — update a book
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.book.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const book = await db.book.update({
    where: { id: params.id },
    data: {
      title: body.title != null ? String(body.title).trim() : existing.title,
      asin: body.asin !== undefined ? (body.asin ? String(body.asin).trim() : null) : existing.asin,
      seriesName: body.seriesName !== undefined ? (body.seriesName ? String(body.seriesName).trim() : null) : existing.seriesName,
      seriesOrder: body.seriesOrder !== undefined ? (body.seriesOrder != null ? Number(body.seriesOrder) : null) : existing.seriesOrder,
      isLeadMagnet: body.isLeadMagnet !== undefined ? Boolean(body.isLeadMagnet) : existing.isLeadMagnet,
      coverUrl: body.coverUrl !== undefined ? (body.coverUrl || null) : existing.coverUrl,
      pubDate: body.pubDate !== undefined ? (body.pubDate ? new Date(body.pubDate) : null) : existing.pubDate,
    },
  })

  return NextResponse.json({ book })
}

// DELETE — remove a book
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
}
