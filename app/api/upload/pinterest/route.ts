// app/api/upload/pinterest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parsePinterest } from '@/lib/parsePinterest'

export async function POST(req: NextRequest) {
  console.log('[upload/pinterest] route hit')
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    console.log('[upload/pinterest] unauthorized — no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    console.log('[upload/pinterest] file received:', file.name, 'size:', file.size)
    const text = await file.text()
    const parsed = parsePinterest(text)
    console.log('[upload/pinterest] parsed:', {
      dateRange: parsed.dateRange,
      totalImpressions: parsed.totalImpressions,
      topBoards: parsed.topBoards.length,
      topPins: parsed.topPins.length,
    })

    const month = new Date().toISOString().slice(0, 7)
    const pinterestData = { ...parsed, uploadedAt: new Date().toISOString() }

    console.log('[upload/pinterest] attempting DB write for userId:', session.user.id, 'month:', month)

    try {
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

      console.log('[upload/pinterest] DB write success')
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
