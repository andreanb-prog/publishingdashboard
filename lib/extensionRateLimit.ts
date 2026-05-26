// In-memory rate limiter: max 10 requests per extensionKey per 60-second window.
// Resets per-key when the window expires. Acceptable for a single-instance deploy.

interface RateEntry {
  count: number
  resetAt: number
}

const counters = new Map<string, RateEntry>()

export function checkRateLimit(extensionKey: string): boolean {
  const now = Date.now()
  const entry = counters.get(extensionKey)

  if (!entry || now > entry.resetAt) {
    counters.set(extensionKey, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 10) return false

  entry.count += 1
  return true
}
