// app/api/parse-pinterest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { parsePinterestFile } from '@/lib/parsers/pinterest'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const data = parsePinterestFile(text)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Pinterest parse error:', error)
    return NextResponse.json({ error: 'Failed to parse Pinterest file' }, { status: 500 })
  }
}
