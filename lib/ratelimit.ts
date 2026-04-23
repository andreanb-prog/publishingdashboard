import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
if (url && token) {
  redis = new Redis({ url, token })
} else {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production')
  }
  console.warn('[ratelimit] Upstash env vars missing — rate limiting disabled (dev mode)')
}

function makeLimiter(requests: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  })
}

export const analyzeLimiter = makeLimiter(5, 60)
export const metaSyncLimiter = makeLimiter(10, 60)
export const authLimiter = makeLimiter(10, 60)

export const RATE_LIMIT_RESPONSE = Response.json(
  { error: 'Too many requests, please try again shortly.' },
  { status: 429, headers: { 'Retry-After': '60' } }
)

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ limited: boolean }> {
  if (!limiter) return { limited: false }
  const result = await limiter.limit(identifier)
  return { limited: !result.success }
}
