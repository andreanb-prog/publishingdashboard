export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

function hasOnlyZeroOrNullNumbers(obj: Record<string, unknown>): boolean {
  const nums = Object.values(obj).filter((v) => typeof v === 'number' || v === null)
  if (nums.length === 0) return false
  return nums.every((v) => v === null || v === 0)
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  if (hasOnlyZeroOrNullNumbers(body)) {
    await db.extensionSyncLog.create({
      data: { userId: auth.userId, platform: 'kdp', dataPoints: 0, status: 'rejected_zeros' },
    })
    return NextResponse.json({ error: 'Rejected: zero-value payload' }, { status: 400 })
  }

  const dataPoints = Object.values(body).filter((v) => typeof v === 'number' && v !== 0).length
  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'kdp', dataPoints, status: 'success' },
  })

  // TODO: persist KDP data to KdpSale / BsrLog tables
  return NextResponse.json({ success: true })
}
