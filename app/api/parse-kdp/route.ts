// app/api/parse-kdp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseKDPFile } from '@/lib/parsers/kdp'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = parseKDPFile(buffer)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('KDP parse error:', error)
    return NextResponse.json({ error: 'Failed to parse KDP file' }, { status: 500 })
  }
}
