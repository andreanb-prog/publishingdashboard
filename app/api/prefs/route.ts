// app/api/prefs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { columnPrefs: true, onboardingDismissed: true, goals: true, layoutPrefs: true, mailerLiteKey: true, metaAccessToken: true },
  })

  return NextResponse.json({
    columnPrefs:         (user?.columnPrefs as Record<string, string[]>) ?? {},
    onboardingDismissed: user?.onboardingDismissed ?? false,
    goals:               (user?.goals as Record<string, number>) ?? {},
    layoutPrefs:         (user?.layoutPrefs as Record<string, string[]>) ?? {},
    mailerLiteConnected: !!user?.mailerLiteKey,
    metaConnected:       !!user?.metaAccessToken,
  })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Save column preferences for a specific page
  if (body.page && Array.isArray(body.columns)) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { columnPrefs: true },
    })
    const current = (user?.columnPrefs as Record<string, string[]>) ?? {}
    const updated = { ...current, [body.page]: body.columns }
    await db.user.update({ where: { id: session.user.id }, data: { columnPrefs: updated } })
    return NextResponse.json({ success: true })
  }

  // Dismiss onboarding banner
  if (body.action === 'dismiss-onboarding') {
    await db.user.update({ where: { id: session.user.id }, data: { onboardingDismissed: true } })
    return NextResponse.json({ success: true })
  }

  // Save goals
  if (body.action === 'save-goals' && body.goals && typeof body.goals === 'object') {
    await db.user.update({ where: { id: session.user.id }, data: { goals: body.goals } })
    return NextResponse.json({ success: true })
  }

  // Save notification preferences
  if (body.action === 'save-notifications') {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { goals: true },
    })
    const current = (user?.goals as Record<string, unknown>) ?? {}
    const updated = {
      ...current,
      weeklyDigest: body.weeklyDigest ?? true,
      digestDays: Array.isArray(body.digestDays) ? body.digestDays : ['monday'],
    }
    await db.user.update({ where: { id: session.user.id }, data: { goals: updated } })
    return NextResponse.json({ success: true })
  }

  // Save section layout order for a page
  if (body.action === 'save-layout' && body.page && Array.isArray(body.order)) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { layoutPrefs: true },
    })
    const current = (user?.layoutPrefs as Record<string, string[]>) ?? {}
    const updated = { ...current, [body.page]: body.order }
    await db.user.update({ where: { id: session.user.id }, data: { layoutPrefs: updated } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
