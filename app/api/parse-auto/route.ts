// app/api/parse-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { parseMetaFile } from '@/lib/parsers/meta'
import { parsePinterestFile } from '@/lib/parsers/pinterest'
import { logAdminAction } from '@/lib/adminAudit'

// Save raw per-row Meta data to MetaAdData table for date-range filtering
async function saveMetaRowsToDB(userId: string, csvText: string): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Papa = require('papaparse')
    const result = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true })
    const rows = result.data as any[]

    if (rows.length === 0) return 0

    console.log('[Meta upload] CSV headers:', Object.keys(rows[0]))

    const col = (row: any, ...keys: string[]): string | number => {
      for (const k of keys) {
        if (row[k] != null && row[k] !== '') return row[k]
      }
      return 0
    }

    const validRows = rows.filter((r: any) => {
      const name = r['Campaign name'] ?? r['Ad name'] ?? r['Ad Name'] ?? r['Ad set name'] ?? ''
      return String(name).trim() !== ''
    })

    if (validRows.length === 0) return 0

    // Delete existing rows for this user before upserting (replace on re-upload)
    await db.metaAdData.deleteMany({ where: { userId } })

    const toInsert = validRows.map((r: any) => {
      const rawDate = r['Reporting starts'] ?? r['Date'] ?? r['Report start'] ?? ''
      let date: Date
      try {
        date = rawDate ? new Date(String(rawDate)) : new Date()
        if (isNaN(date.getTime())) date = new Date()
      } catch { date = new Date() }

      return {
        userId,
        date,
        campaignName: String(col(r, 'Campaign name', 'Ad name', 'Ad Name', 'Ad set name')).trim(),
        spend:        Number(col(r, 'Amount spent (USD)', 'Amount spent', 'Spend', 'Cost')) || 0,
        impressions:  Math.round(Number(col(r, 'Impressions')) || 0),
        clicks:       Math.round(Number(col(r, 'Link clicks', 'Clicks (all)', 'Clicks', 'Results')) || 0),
        ctr:          Number(col(r, 'CTR (link click-through rate)', 'CTR (all)', 'CTR')) || 0,
        cpc:          Number(col(r, 'CPC (cost per link click) (USD)', 'CPC (all) (USD)', 'CPC (all)', 'CPC')) || 0,
        results:      r['Results'] != null ? Number(r['Results']) : null,
        costPerResult: r['Cost per results'] != null ? Number(r['Cost per results']) : null,
      }
    })

    await db.metaAdData.createMany({ data: toInsert })
    console.log(`[Meta upload] Parsed ${rows.length} rows, saved ${toInsert.length} to MetaAdData`)
    return toInsert.length
  } catch (err) {
    console.error('[Meta upload] Failed to save MetaAdData rows:', err)
    return 0
  }
}

async function logUpload(
  userId: string,
  fileType: string,
  fileName: string,
  rowCount: number,
  status: string = 'success',
  details: object = {},
) {
  try {
    await db.uploadLog.create({
      data: { userId, fileType, fileName, rowCount, status, details },
    })
  } catch (err) {
    console.error('[parse-auto] Failed to write UploadLog:', err)
  }
}

function detectCSVType(text: string): 'meta' | 'pinterest' | 'unknown' {
  // Pinterest exports start with "Analytics overview" and contain "Impressions"
  if (
    (text.trimStart().startsWith('Analytics overview') || text.includes('"Analytics overview"')) &&
    text.includes('Impressions')
  ) return 'pinterest'
  // Meta exports: match if any 2+ of these signals are present
  const metaSignals = [
    'Ad name', 'Amount spent', 'CTR (all)', 'CTR (link', 'CPC (all)', 'CPC (cost',
    'Campaign name', 'Ad set name', 'Impressions',
  ]
  const metaHits = metaSignals.filter(s => text.includes(s)).length
  if (metaHits >= 2) return 'meta'
  return 'unknown'
}

function detectExcelType(buffer: Buffer): 'kdp' | 'meta' | 'unknown' {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // Sheet names are the most reliable KDP signal — check first
    if (wb.SheetNames.some((n: string) => n === 'Orders Processed' || n === 'KENP Read' || n === 'Summary')) {
      return 'kdp'
    }

    // "Worksheet" is the sheet name in Meta's new XLSX export format
    if (wb.SheetNames.includes('Worksheet')) {
      const csv: string = XLSX.utils.sheet_to_csv(wb.Sheets['Worksheet'], { blankrows: false })
      // Confirm it's Meta by checking for at least one Meta column
      if (csv.includes('Campaign name') || csv.includes('Amount spent') || csv.includes('Impressions')) {
        return 'meta'
      }
    }

    for (const sheetName of wb.SheetNames) {
      const csv: string = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false })
      // KDP content signals (multi-sheet and flat format)
      if (csv.includes('KENP') || csv.includes('Royalty Date') || csv.includes('Est. KU Royalty')) return 'kdp'
      // Meta signals
      const metaSignals = ['Ad name', 'Amount spent', 'CTR (all)', 'CTR (link', 'CPC (all)', 'Campaign name', 'Ad set name']
      if (metaSignals.filter(s => csv.includes(s)).length >= 2) return 'meta'
    }
  } catch { /* fall through */ }
  return 'unknown'
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

    if (isExcel) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const excelType = detectExcelType(buffer)

      if (excelType === 'kdp') {
        const data = parseKDPFile(buffer)
        const diag = data.diagnostics ?? null
        const uploadStatus = !diag ? 'success'
          : diag.rowCount === 0 ? 'error'
          : diag.skippedRows > 0 ? 'partial'
          : 'success'
        await logUpload(session.user.id, 'kdp', file.name, data.rowCount ?? data.books.length, uploadStatus, diag ?? {})
        auditUploadIfImpersonating(session, file.name, data.rowCount ?? data.books.length, 'kdp')
        return NextResponse.json({
          success: true, type: 'kdp', data,
          diagnostics: diag,
          summary: `${data.totalUnits} units · ${data.totalKENP?.toLocaleString()} KENP · $${data.totalRoyaltiesUSD} royalties`,
        })
      }

      if (excelType === 'meta') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const XLSX = require('xlsx')
        const wb = XLSX.read(buffer, { type: 'buffer' })
        // Prefer "Worksheet" sheet (new Meta XLSX format), fall back to first sheet
        const sheetName = wb.SheetNames.includes('Worksheet') ? 'Worksheet' : wb.SheetNames[0]
        const csvText: string = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false })
        const data = parseMetaFile(csvText)
        // Save each row to MetaAdData for date-range filtering
        const savedRows = await saveMetaRowsToDB(session.user.id, csvText)
        const rowCount = savedRows > 0 ? savedRows : data.ads.length
        const metaDiag = {
          rowCount, sheetsFound: wb.SheetNames, sheetUsed: sheetName,
          columnsDetected: [], skippedRows: 0, skipReasons: [],
          firstParsedRow: null, error: rowCount === 0 ? 'No rows parsed' : null,
        }
        await logUpload(session.user.id, 'meta', file.name, rowCount, rowCount > 0 ? 'success' : 'error', metaDiag)
        auditUploadIfImpersonating(session, file.name, rowCount, 'meta')
        return NextResponse.json({
          success: true, type: 'meta', data,
          rowCount,
          diagnostics: metaDiag,
          summary: `${rowCount} rows saved · ${data.ads.length} campaigns · $${data.totalSpend} spend · ${data.totalClicks} clicks`,
        })
      }

      return NextResponse.json({ success: true, type: 'unknown', data: null })
    }

    // CSV detection
    const text = await file.text()
    const csvType = detectCSVType(text)

    if (csvType === 'meta') {
      const data = parseMetaFile(text)
      const savedRows = await saveMetaRowsToDB(session.user.id, text)
      const rowCount = savedRows > 0 ? savedRows : data.ads.length
      const csvDiag = { rowCount, sheetsFound: ['CSV'], sheetUsed: 'CSV', columnsDetected: [], skippedRows: 0, skipReasons: [], firstParsedRow: null, error: rowCount === 0 ? 'No rows parsed' : null }
      await logUpload(session.user.id, 'meta', file.name, rowCount, rowCount > 0 ? 'success' : 'error', csvDiag)
      auditUploadIfImpersonating(session, file.name, rowCount, 'meta')
      return NextResponse.json({
        success: true, type: 'meta', data,
        rowCount,
        diagnostics: csvDiag,
        summary: `${rowCount} rows saved · ${data.ads.length} campaigns · $${data.totalSpend} spend · ${data.totalClicks} clicks`,
      })
    }

    if (csvType === 'pinterest') {
      const data = parsePinterestFile(text)
      const pinDiag = { rowCount: data.pinCount, sheetsFound: ['CSV'], sheetUsed: 'CSV', columnsDetected: [], skippedRows: 0, skipReasons: [], firstParsedRow: null, error: null }
      await logUpload(session.user.id, 'pinterest', file.name, data.pinCount, 'success', pinDiag)
      auditUploadIfImpersonating(session, file.name, data.pinCount, 'pinterest')
      return NextResponse.json({
        success: true, type: 'pinterest', data,
        diagnostics: pinDiag,
        summary: `${data.totalImpressions} impressions · ${data.pinCount} pins`,
      })
    }

    return NextResponse.json({ success: true, type: 'unknown', data: null })
  } catch (error) {
    console.error('Auto-parse error:', error)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}

// Helper to fire audit log after a successful upload during impersonation
function auditUploadIfImpersonating(
  session: Awaited<ReturnType<typeof getAugmentedSession>>,
  filename: string,
  rowCount: number,
  fileType: string
) {
  if (session?.user?.adminImpersonating && session?.user?.adminRealEmail) {
    logAdminAction(session.user.adminRealEmail, session.user.adminImpersonating, 'upload', {
      filename,
      rowCount,
      fileType,
    })
  }
}
