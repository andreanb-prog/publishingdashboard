export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateExtensionRequest } from '@/lib/extensionAuth'
import { db } from '@/lib/db'

// 60-second in-memory cache keyed by userId
const statusCache = new Map<string, { data: object; cachedAt: number }>()
const CACHE_TTL = 60_000

export async function GET(req: NextRequest) {
  let userId: string

  // Session auth first (AuthorDash page calls via cookie)
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    userId = session.user.id
  } else {
    // Extension key auth (Chrome extension calls via Bearer header)
    const auth = await validateExtensionRequest(req)
    if ('errorResponse' in auth) return auth.errorResponse
    userId = auth.userId
  }

  const cached = statusCache.get(userId)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { extensionKey: true },
  })

  const hasExtension = !!user?.extensionKey
  const perPlatform: Record<string, string | null> = { kdp: null, meta: null, bookclicker: null }

  if (hasExtension) {
    const logs = await db.extensionSyncLog.findMany({
      where: { userId, platform: { in: ['kdp', 'meta', 'bookclicker'] } },
      orderBy: { syncedAt: 'desc' },
      take: 100,
    })
    for (const log of logs) {
      if (!perPlatform[log.platform]) {
        perPlatform[log.platform] = log.syncedAt.toISOString()
      }
    }
  }

  const data = {
    hasExtension,
    kdp: { lastSync: perPlatform.kdp },
    meta: { lastSync: perPlatform.meta },
    bookclicker: { lastSync: perPlatform.bookclicker },
  }

  statusCache.set(userId, { data, cachedAt: Date.now() })
  return NextResponse.json(data)
}
