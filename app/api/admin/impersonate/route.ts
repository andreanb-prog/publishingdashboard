// app/api/admin/impersonate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ADMIN_EMAILS, IMPERSONATE_COOKIE } from '@/lib/getSession'
import { logAdminAction } from '@/lib/adminAudit'

const THIRTY_MINUTES = 30 * 60 // seconds

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { email }, select: { id: true, email: true } })
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  logAdminAction(session.user.email, email, 'started')

  const res = NextResponse.json({ ok: true, email: target.email })
  res.cookies.set(IMPERSONATE_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_MINUTES,
  })
  return res
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Read which user was being impersonated from the request cookie
  const impersonatedEmail = req.cookies.get(IMPERSONATE_COOKIE)?.value
  if (impersonatedEmail) {
    logAdminAction(session.user.email, impersonatedEmail, 'ended')
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(IMPERSONATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
