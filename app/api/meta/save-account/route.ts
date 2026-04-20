// app/api/meta/save-account/route.ts — Save user's selected Meta ad account to DB
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

// POST — called from client-side fetch
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId } = await req.json()
  if (!accountId || typeof accountId !== 'string') {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`
  await db.user.update({ where: { id: session.user.id }, data: { metaAdAccountId: id } })
  console.log('[Meta Save Account] POST saved', id, 'for user', session.user.id)
  return NextResponse.json({ ok: true })
}

// GET — fallback: /api/meta/save-account?accountId=act_xxx — saves and hard-redirects
export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  const base = process.env.NEXTAUTH_URL ?? 'https://authordash.io'

  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/login`)
  }

  const accountId = req.nextUrl.searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.redirect(`${base}/dashboard/meta/select-account`)
  }

  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`
  await db.user.update({ where: { id: session.user.id }, data: { metaAdAccountId: id } })
  console.log('[Meta Save Account] GET saved', id, 'for user', session.user.id)
  return NextResponse.redirect(`${base}/dashboard/settings?meta=connected`)
}
