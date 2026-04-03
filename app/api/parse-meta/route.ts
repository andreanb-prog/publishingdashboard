// app/api/parse-meta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseMetaFile } from '@/lib/parsers/meta'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    let csvText: string
    const isXlsx = file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    if (isXlsx) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      csvText = XLSX.utils.sheet_to_csv(sheet)
    } else {
      csvText = await file.text()
    }

    const data = parseMetaFile(csvText)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Meta parse error:', error)
    return NextResponse.json({ error: 'Failed to parse Meta file' }, { status: 500 })
  }
}
