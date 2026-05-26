// app/api/books/migrate-paperbacks/route.ts
// One-shot migration: merges standalone paperback Book entries into their matching
// eBook entry (asinPaperback field), then deletes the duplicate paperback row.
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const books = await db.book.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  })

  if (books.length < 2) return NextResponse.json({ merged: 0, deleted: 0 })

  // Build format map from KdpSale records
  const formatGroups = await db.kdpSale.groupBy({
    by: ['asin', 'format'],
    where: { userId, format: { not: null } },
    _count: { id: true },
  })
  const asinFormats = new Map<string, Set<string>>()
  for (const row of formatGroups) {
    if (!row.format || row._count.id === 0) continue
    const s = asinFormats.get(row.asin) ?? new Set<string>()
    s.add(row.format.toLowerCase())
    asinFormats.set(row.asin, s)
  }

  // Group by normalized title
  const byTitle = new Map<string, typeof books>()
  for (const book of books) {
    const key = book.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const group = byTitle.get(key) ?? []
    group.push(book)
    byTitle.set(key, group)
  }

  let merged = 0
  const toDelete: string[] = []

  for (const group of Array.from(byTitle.values())) {
    if (group.length < 2) continue

    let ebook: (typeof books)[0] | null = null
    let paperback: (typeof books)[0] | null = null

    for (const book of group) {
      const formats = book.asin ? asinFormats.get(book.asin) : null
      if (formats?.has('ebook')) {
        ebook = book
      } else if (formats?.has('paperback') && !formats.has('ebook')) {
        paperback = book
      }
    }

    // Fallback: if no format data, assume first by sortOrder = ebook
    if (!ebook && !paperback && group.length === 2) {
      ebook = group[0]
      paperback = group[1]
    }

    if (!ebook || !paperback) continue

    const pbAsin = paperback.asin ?? null
    if (pbAsin && !ebook.asinPaperback) {
      await db.book.update({
        where: { id: ebook.id },
        data: { asinPaperback: pbAsin },
      })
    }

    toDelete.push(paperback.id)
    merged++
  }

  for (const id of toDelete) {
    await db.book.delete({ where: { id } }).catch(() => {})
  }

  // Repack sortOrders
  const remaining = await db.book.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  })
  await Promise.all(
    remaining.map((b, i) => db.book.update({ where: { id: b.id }, data: { sortOrder: i } }))
  )

  return NextResponse.json({ merged, deleted: toDelete.length })
}
