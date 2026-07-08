// lib/cronReliability.ts
// Shared reliability helpers for the Vercel Cron sync routes.
import { Prisma } from '@prisma/client'
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

// Neon scales to zero when idle; the first query after a cold start can fail with
// PrismaClientInitializationError / P1001 ("Can't reach database server") while the
// compute spins back up. Both past incidents show Neon was up within a minute.
export function isColdStartError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true
  const e = err as { code?: string; errorCode?: string; message?: string } | null
  if (e?.code === 'P1001' || e?.errorCode === 'P1001') return true
  if (typeof e?.message === 'string' && e.message.includes('P1001')) return true
  return false
}

// ~20s of backoff across 3 retries (4 attempts total). Only cold-start errors are
// retried; any other error rethrows immediately.
const COLD_START_BACKOFF_MS = [5_000, 7_000, 8_000]

export async function withColdStartRetry<T>(fn: () => Promise<T>, label = 'query'): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= COLD_START_BACKOFF_MS.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isColdStartError(err) || attempt === COLD_START_BACKOFF_MS.length) throw err
      const wait = COLD_START_BACKOFF_MS[attempt]
      console.warn(`[cron] ${label} hit cold-start DB error (attempt ${attempt + 1}/${COLD_START_BACKOFF_MS.length + 1}), retrying in ${wait}ms`)
      await new Promise(resolve => setTimeout(resolve, wait))
    }
  }
  throw lastErr
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
