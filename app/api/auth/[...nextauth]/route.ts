// app/api/auth/[...nextauth]/route.ts
import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authLimiter, checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'

const handler = NextAuth(authOptions)

async function rateLimitedHandler(req: NextRequest, context: { params: { nextauth: string[] } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { limited } = await checkRateLimit(authLimiter, `auth:${ip}`)
  if (limited) return rateLimitResponse()
  return handler(req as any, context as any)
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST }
