// lib/cronReliability.ts
// Shared reliability helpers for the Vercel Cron sync routes.

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
