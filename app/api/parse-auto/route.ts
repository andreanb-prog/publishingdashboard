// app/api/parse-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { parseMetaFile } from '@/lib/parsers/meta'
import { parsePinterestFile } from '@/lib/parsers/pinterest'

function detectCSVType(text: string): 'meta' | 'pinterest' | 'unknown' {
  // Pinterest exports start with "Analytics overview" and contain "Impressions"
  if (
    (text.trimStart().startsWith('Analytics overview') || text.includes('"Analytics overview"')) &&
    text.includes('Impressions')
  ) return 'pinterest'
  // Meta exports have "Ad name" and "Amount spent" columns
  if (text.includes('Ad name') && text.includes('Amount spent')) return 'meta'
  return 'unknown'
}

function detectExcelType(buffer: Buffer): 'kdp' | 'unknown' {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    for (const sheetName of wb.SheetNames) {
      const csv: string = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false })
      if (csv.includes('KENP') || csv.includes('Royalty Date')) return 'kdp'
    }
  } catch { /* fall through */ }
  return 'unknown'
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

    if (isExcel) {
      const buffer = Buffer.from(await file.arrayBuffer())
      if (detectExcelType(buffer) === 'kdp') {
        const data = parseKDPFile(buffer)
        return NextResponse.json({
          success: true, type: 'kdp', data,
          summary: `${data.totalUnits} units · ${data.totalKENP?.toLocaleString()} KENP · $${data.totalRoyaltiesUSD} royalties`,
        })
      }
      return NextResponse.json({ success: true, type: 'unknown', data: null })
    }

    // CSV detection
    const text = await file.text()
    const csvType = detectCSVType(text)

    if (csvType === 'meta') {
      const data = parseMetaFile(text)
      return NextResponse.json({
        success: true, type: 'meta', data,
        summary: `${data.ads.length} ads · $${data.totalSpend} spend · ${data.totalClicks} clicks`,
      })
    }

    if (csvType === 'pinterest') {
      const data = parsePinterestFile(text)
      return NextResponse.json({
        success: true, type: 'pinterest', data,
        summary: `${data.totalImpressions} impressions · ${data.pinCount} pins`,
      })
    }

    return NextResponse.json({ success: true, type: 'unknown', data: null })
  } catch (error) {
    console.error('Auto-parse error:', error)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
