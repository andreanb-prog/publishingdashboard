// app/api/upload/pinterest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parsePinterest } from '@/lib/parsePinterest'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const parsed = parsePinterest(text)

    const month = new Date().toISOString().slice(0, 7)
    const pinterestData = { ...parsed, uploadedAt: new Date().toISOString() }

    const existing = await db.analysis.findFirst({
      where: { userId: session.user.id, month },
    })

    if (existing) {
      const existingData = (existing.data as Record<string, unknown>) ?? {}
      await db.analysis.update({
        where: { id: existing.id },
        data: { data: { ...existingData, pinterest: pinterestData } as any },
      })
    } else {
      await db.analysis.create({
        data: {
          userId: session.user.id,
          month,
          data: { month, pinterest: pinterestData } as any,
        },
      })
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('[upload/pinterest]', error)
    return NextResponse.json({ error: 'Failed to parse Pinterest file' }, { status: 500 })
  }
}
