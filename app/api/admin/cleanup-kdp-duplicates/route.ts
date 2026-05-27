import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ADMIN_EMAILS } from '@/lib/getSession'

// DELETE all extension-source kdpSale rows for any ASIN/month that also has a csv-source row.
// Run once via GET /api/admin/cleanup-kdp-duplicates to fix existing double-counted rows.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Find all distinct userId+asin+month combos that have a csv row
  const csvRows = await db.kdpSale.findMany({
    where: { source: 'csv' },
    select: { userId: true, asin: true, date: true },
  })

  const monthKeysArr = Array.from(new Set(csvRows.map(r => `${r.userId}::${r.asin}::${r.date.substring(0, 7)}`)))

  let deleted = 0
  for (const key of monthKeysArr) {
    const [userId, asin, month] = key.split('::')
    const [yr, mo] = month.split('-').map(Number)
    const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`

    const result = await db.kdpSale.deleteMany({
      where: {
        userId,
        asin,
        date: { gte: `${month}-01`, lt: `${nextMo}-01` },
        source: 'extension',
      },
    })
    deleted += result.count
  }

  return NextResponse.json({ ok: true, deletedExtensionRows: deleted, monthsChecked: monthKeysArr.length })
}
