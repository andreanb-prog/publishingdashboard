// middleware.ts
// Refreshes the admin impersonation cookie on every dashboard/API request
// so the 30-minute window is based on inactivity, not time-from-start.
import { NextRequest, NextResponse } from 'next/server'

const IMPERSONATE_COOKIE = 'authordash_impersonate'
const THIRTY_MINUTES = 30 * 60 // seconds

const WEBHOOK_PATHS = [
  '/api/stripe/webhook',
  '/api/bookfunnel/webhook',
  '/api/webhooks/bookfunnel',
  '/api/email/inbound',
]

export function middleware(req: NextRequest) {
  if (WEBHOOK_PATHS.some(path => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const impersonating = req.cookies.get(IMPERSONATE_COOKIE)?.value
  if (!impersonating) return NextResponse.next()

  const res = NextResponse.next()
  res.cookies.set(IMPERSONATE_COOKIE, impersonating, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_MINUTES,
  })
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/content/:path*', '/api/:path*'],
}
