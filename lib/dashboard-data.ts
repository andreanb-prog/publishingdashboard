// lib/dashboard-data.ts
// Server-side data fetching for the main dashboard.
// Runs all queries in parallel to eliminate sequential waterfalls.
import { db } from '@/lib/db'
import { fetchMailerLiteStats } from '@/lib/mailerlite'
import { cache } from 'react'
import type { Analysis, RankLog, RoasLog, MailerLiteData } from '@/types'

export type DashboardData = {
  analysis: Analysis | null
  analyses: Analysis[]
  rankLogs: RankLog[]
  roasLogs: RoasLog[]
  mailerLiteData: MailerLiteData | null
  kdpLastUploadedAt: string | null
  metaLastSync: string | null
  bookCount: number
  hasMailerLiteKey: boolean
}

// React cache() deduplicates within a single server render,
// so multiple components calling this get the same result.
export const fetchDashboardData = cache(async (userId: string): Promise<DashboardData> => {
  // Run ALL queries in parallel — this is the key perf win.
  const [recentRecords, userRow, rankLogs, roasLogs, mailerLiteData, kdpUploadLog, bookCount] = await Promise.all([
    // 1. Analysis records (replaces /api/analyze GET)
    db.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),

    // 2. User meta sync timestamp
    db.user.findUnique({
      where: { id: userId },
      select: { metaLastSync: true, mailerLiteKey: true },
    }),

    // 3. Rank logs (replaces /api/rank GET)
    db.rankLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 60,
    }),

    // 4. ROAS logs (replaces /api/roas GET)
    db.roasLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 21,
    }),

    // 5. MailerLite (live fetch — will be null if no key)
    (async (): Promise<MailerLiteData | null> => {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { mailerLiteKey: true },
        })
        if (!user?.mailerLiteKey) return null
        return await fetchMailerLiteStats(user.mailerLiteKey)
      } catch {
        return null
      }
    })(),

    // 6. KDP upload timestamp
    db.uploadLog.findFirst({
      where: { userId, fileType: 'kdp' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }).catch(() => null),

    // 7. Book count (for first-run detection)
    db.book.count({ where: { userId } }).catch(() => 0),
  ])

  // Process analysis data (same logic as /api/analyze GET)
  const analyses: Analysis[] = recentRecords.slice(0, 6)
    .map(r => r.data as unknown)
    .filter((d): d is Analysis => !!d && typeof d === 'object' && 'month' in (d as object))

  const record = recentRecords[0] ?? null
  let analysis = (record?.data ?? null) as Analysis | null

  // Backfill KDP from most recent analysis that has it
  const kdpRecord = recentRecords.find(r => (r.data as any)?.kdp)
  if (kdpRecord && !analysis?.kdp) {
    analysis = analysis
      ? { ...analysis, kdp: (kdpRecord.data as any).kdp }
      : (kdpRecord.data as any)
  }

  // KDP last uploaded timestamp
  let kdpLastUploadedAt: string | null = null
  if (kdpUploadLog) {
    kdpLastUploadedAt = kdpUploadLog.createdAt.toISOString()
  } else if (kdpRecord) {
    kdpLastUploadedAt = (kdpRecord.data as any)?.kdpUploadedAt ?? kdpRecord.createdAt.toISOString()
  }

  const metaLastSync = userRow?.metaLastSync ? userRow.metaLastSync.toISOString() : null

  return {
    analysis,
    analyses,
    rankLogs: rankLogs as unknown as RankLog[],
    roasLogs: roasLogs as unknown as RoasLog[],
    mailerLiteData,
    kdpLastUploadedAt,
    metaLastSync,
    bookCount,
    hasMailerLiteKey: !!userRow?.mailerLiteKey,
  }
})
