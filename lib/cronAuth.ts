// lib/cronAuth.ts
// Vercel Cron authenticates scheduled requests with `Authorization: Bearer ${CRON_SECRET}`.
// It cannot send custom headers, so this is the only header a cron job will carry.
import type { NextRequest } from 'next/server'

export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}
