// lib/cronReliability.ts
// Shared reliability helpers for the Vercel Cron sync routes.
import { db } from '@/lib/db'
import { ADMIN_EMAILS } from '@/lib/getSession'

// Up to this many users run concurrently per stage. Each concurrent user opens a
// Browserbase browser session, so this is effectively the Browserbase concurrency
// used by a cron stage — keep it at or below the plan's session cap.
export const BATCH_SIZE = 10

export type UserResult = { userId: string; status: 'fulfilled' | 'rejected'; error?: string }

export async function runInBatches(
  userIds: string[],
  fn: (userId: string) => Promise<void>,
): Promise<UserResult[]> {
  const results: UserResult[] = []
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE)
    const settled = await Promise.allSettled(batch.map(fn))
    settled.forEach((result, idx) => {
      const userId = batch[idx]
      if (result.status === 'rejected') {
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason)
        results.push({ userId, status: 'rejected', error })
      } else {
        results.push({ userId, status: 'fulfilled' })
      }
    })
  }
  return results
}

// SyncLog.userId is required (FK to User), so a route-level "global" abort has to be
// attached to a real user. Prefer an admin — their row is always visible on
// /admin/sync-health — falling back to any user so the abort is never invisible.
async function resolveCronLogOwner(): Promise<string | null> {
  if (ADMIN_EMAILS.length) {
    const admin = await db.user.findFirst({
      where: { email: { in: ADMIN_EMAILS } },
      select: { id: true },
    })
    if (admin) return admin.id
  }
  const anyUser = await db.user.findFirst({ select: { id: true } })
  return anyUser?.id ?? null
}

// Write a route-level abort to SyncLog so /admin/sync-health shows the failure instead
// of it vanishing into expired Vercel logs. Best-effort: if the DB itself is the reason
// we aborted, the write throws and we swallow it (nothing more we can do).
export async function logCronAbort(source: string, err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err)
  try {
    const ownerId = await resolveCronLogOwner()
    if (!ownerId) return
    await db.syncLog.create({
      data: {
        userId: ownerId,
        source,
        status: 'failed',
        completedAt: new Date(),
        errorType: 'cron_abort',
        errorDetail: msg.slice(0, 1000),
      },
    })
  } catch {
    // DB unreachable — the very failure we were trying to record. Give up quietly.
  }
}
