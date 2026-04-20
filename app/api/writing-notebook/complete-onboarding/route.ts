import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.user.update({
    where: { id: session.user.id },
    data: { writingOnboardingComplete: true },
  })

  return NextResponse.json({ success: true })
}
