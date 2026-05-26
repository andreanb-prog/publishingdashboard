export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const ALLOWED_EMAIL = 'andreanbonilla@gmail.com'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id || session.user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = session.user.id

  const [kdpSales, uploadLogs] = await Promise.all([
    db.kdpSale.deleteMany({ where: { userId } }),
    db.uploadLog.deleteMany({ where: { userId, fileType: 'kdp' } }),
  ])

  return NextResponse.json({
    deleted: {
      kdpSaleRows: kdpSales.count,
      uploadLogRows: uploadLogs.count,
    },
  })
}
