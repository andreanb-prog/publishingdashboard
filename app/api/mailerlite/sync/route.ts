// app/api/mailerlite/sync/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { syncMailerLiteToAnalysis } from '@/lib/mailerlite'

export async function POST(_req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let user: { mailerLiteKey: string | null; mailerLiteLists: unknown } | null = null
  try {
    user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { mailerLiteKey: true, mailerLiteLists: true },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mailerlite/sync] db.user.findUnique failed:', msg)
    return NextResponse.json({ error: `DB lookup failed: ${msg}` }, { status: 500 })
  }

  if (!user?.mailerLiteKey) return NextResponse.json({ error: 'not_connected' }, { status: 400 })
  if ((user.mailerLiteLists as unknown[] ?? []).length === 0) return NextResponse.json({ success: true, updated: 0 })

  try {
    await syncMailerLiteToAnalysis(session.user.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mailerlite/sync] syncMailerLiteToAnalysis failed:', msg)
    return NextResponse.json({ error: `Sync failed: ${msg}` }, { status: 500 })
  }

  let updatedLists: { id: string; activeCount: number; unsubCount: number }[] = []
  try {
    updatedLists = await db.mailerLiteList.findMany({
      where: { userId: session.user.id },
      select: { id: true, activeCount: true, unsubCount: true },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mailerlite/sync] mailerLiteList.findMany failed:', msg)
    return NextResponse.json({ error: `DB read failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: updatedLists.length, lists: updatedLists })
}
