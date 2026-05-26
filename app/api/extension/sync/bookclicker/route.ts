export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/extensionRateLimit'

function hasOnlyZeroOrNullNumbers(obj: Record<string, unknown>): boolean {
  const nums = Object.values(obj).filter((v) => typeof v === 'number' || v === null)
  if (nums.length === 0) return false
  return nums.every((v) => v === null || v === 0)
}

export async function POST(req: NextRequest) {
  const extensionKey = req.headers.get('x-extension-key') ?? req.headers.get('extensionkey')

  if (!extensionKey) {
    return NextResponse.json({ error: 'Missing extension key' }, { status: 401 })
  }

  if (!checkRateLimit(extensionKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const user = await db.user.findUnique({
    where: { extensionKey },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid extension key' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  if (hasOnlyZeroOrNullNumbers(body)) {
    await db.extensionSyncLog.create({
      data: { userId: user.id, platform: 'bookclicker', dataPoints: 0, status: 'rejected_zeros' },
    })
    return NextResponse.json({ error: 'Rejected: zero-value payload' }, { status: 400 })
  }

  const dataPoints = Object.values(body).filter((v) => typeof v === 'number' && v !== 0).length

  await db.extensionSyncLog.create({
    data: { userId: user.id, platform: 'bookclicker', dataPoints, status: 'success' },
  })

  // TODO: persist BookClicker data
  return NextResponse.json({ success: true })
}
