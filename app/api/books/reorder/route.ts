// app/api/books/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

// POST — update sort_order for all books
// Body: { order: string[] }  (array of book IDs in new order)
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const order: string[] = Array.isArray(body.order) ? body.order : []

  // Verify all IDs belong to this user
  const userBooks = await db.book.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  })
  const ownedIds = new Set(userBooks.map(b => b.id))

  await Promise.all(
    order
      .filter(id => ownedIds.has(id))
      .map((id, i) => db.book.update({ where: { id }, data: { sortOrder: i } }))
  )

  return NextResponse.json({ success: true })
}
