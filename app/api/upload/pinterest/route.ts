// app/api/upload/pinterest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parsePinterest } from '@/lib/parsePinterest'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const parsed = parsePinterest(text)
    const month = new Date().toISOString().slice(0, 7)
    const pinterestData = { ...parsed, uploadedAt: new Date().toISOString() }

    try {
      const existing = await db.analysis.findUnique({
        where: { userId_month: { userId: session.user.id, month } },
      })
      const currentData = (existing?.data as Record<string, unknown>) ?? {}
      const merged = { ...currentData, pinterest: pinterestData }

      await db.analysis.upsert({
        where: { userId_month: { userId: session.user.id, month } },
        update: { data: merged },
        create: { userId: session.user.id, month, data: merged },
      })
    } catch (dbErr) {
      console.error('[upload/pinterest] DB write failed:', dbErr)
      return NextResponse.json({ error: 'DB write failed', detail: String(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('[upload/pinterest] parse error:', error)
    return NextResponse.json({ error: 'Failed to parse Pinterest file' }, { status: 500 })
  }
}
