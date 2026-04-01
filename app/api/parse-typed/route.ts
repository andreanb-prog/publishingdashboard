// app/api/parse-typed/route.ts
// Parses a file with a user-specified type (bypasses auto-detection)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { parseMetaFile } from '@/lib/parsers/meta'
import { parsePinterestFile } from '@/lib/parsers/pinterest'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!type) return NextResponse.json({ error: 'No type provided' }, { status: 400 })

    if (type === 'kdp') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const data = parseKDPFile(buffer)
      return NextResponse.json({
        success: true, type: 'kdp', data,
        summary: `${data.totalUnits} units · ${data.totalKENP?.toLocaleString()} KENP · $${data.totalRoyaltiesUSD} royalties`,
      })
    }

    if (type === 'meta') {
      const text = await file.text()
      const data = parseMetaFile(text)
      return NextResponse.json({
        success: true, type: 'meta', data,
        summary: `${data.ads.length} ads · $${data.totalSpend} spend · ${data.totalClicks} clicks`,
      })
    }

    if (type === 'pinterest') {
      const text = await file.text()
      const data = parsePinterestFile(text)
      return NextResponse.json({
        success: true, type: 'pinterest', data,
        summary: `${data.totalImpressions} impressions · ${data.pinCount} pins`,
      })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err) {
    console.error('[parse-typed] error:', err)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
