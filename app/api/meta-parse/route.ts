import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAugmentedSession } from '@/lib/getSession'

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

    return NextResponse.json({ rows })
  } catch (err) {
    console.error('[meta-parse]', err)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
