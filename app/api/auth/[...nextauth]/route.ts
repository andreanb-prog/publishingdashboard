// app/api/auth/[...nextauth]/route.ts
import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authLimiter, checkRateLimit, RATE_LIMIT_RESPONSE } from '@/lib/ratelimit'

const handler = NextAuth(authOptions)

async function rateLimitedHandler(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { limited } = await checkRateLimit(authLimiter, `auth:${ip}`)
  if (limited) return RATE_LIMIT_RESPONSE
  return handler(req as any)
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST }
