// app/api/parse-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parseMetaFile } from '@/lib/parsers/meta'
import { parsePinterestFile } from '@/lib/parsers/pinterest'
import { logAdminAction } from '@/lib/adminAudit'
import { handleKDPUpload } from '@/lib/uploadHandlers'

// Checks the header row (first CSV line) to determine the Meta report level.
// Requires 'Amount spent (USD)' plus one of the name columns.
function detectMetaReportLevel(csvText: string): 'campaign' | 'ads' | 'adset' | 'unknown' {
  const firstLine = csvText.split('\n')[0] ?? ''
  if (!firstLine.includes('Amount spent (USD)')) return 'unknown'
  if (firstLine.includes('Ad name')) return 'ads'
  if (firstLine.includes('Campaign name')) return 'campaign'
  if (firstLine.includes('Ad set name')) return 'adset'
  return 'unknown'
}

function parseISODate(raw: string | null | undefined): Date {
  if (!raw) return new Date()
  const d = new Date(String(raw))
  return isNaN(d.getTime()) ? new Date() : d
}

// Campaign-level file: aggregate all rows into one MetaAdData row, keyed on userId + dateFrom.
// Deletes existing rows in the same date range first to prevent stacking.
async function saveCampaignFileToDB(
  userId: string,
  csvText: string,
): Promise<{ rowCount: number; dateFrom: Date; dateTo: Date }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Papa = require('papaparse')
  const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true })
  const rows = (data as any[]).filter((r: any) => String(r['Campaign name'] ?? '').trim() !== '')
  if (rows.length === 0) return { rowCount: 0, dateFrom: new Date(), dateTo: new Date() }

  let totalSpend = 0, totalImpressions = 0, totalClicks = 0
  let ctr = 0, cpc = 0, highestSpend = -1

  for (const r of rows) {
    const spend = Number(r['Amount spent (USD)']) || 0
    totalSpend += spend
    totalImpressions += Math.round(Number(r['Impressions']) || 0)
    totalClicks += Math.round(Number(r['Link clicks']) || 0)
    // ctr and cpc come from the highest-spend row
    if (spend > highestSpend) {
      highestSpend = spend
      ctr = Number(r['CTR (link click-through rate)']) || 0
      cpc = Number(r['CPC (cost per link click) (USD)']) || 0
    }
  }

  const firstRow = rows[0]
  const dateFrom = parseISODate(String(firstRow['Reporting starts'] ?? ''))
  const dateTo   = parseISODate(String(firstRow['Reporting ends']   ?? ''))
  const campaignName = String(firstRow['Campaign name'] ?? 'Meta Campaign').trim()

  await db.metaAdData.deleteMany({
    where: { userId, date: { gte: dateFrom, lte: dateTo } },
  })

  await db.metaAdData.create({
    data: {
      userId,
      date: dateFrom,
      campaignName,
      spend: Math.round(totalSpend * 100) / 100,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr,
      cpc,
    },
  })

  return { rowCount: 1, dateFrom, dateTo }
}

// Ads-level file: find top ad by impressions, patch campaignName on the matching date-range record.
// If no campaign record exists yet for that range, creates a placeholder row.
async function saveAdsFileToDB(userId: string, csvText: string): Promise<{ rowCount: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Papa = require('papaparse')
  const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true })
  const rows = (data as any[]).filter((r: any) => {
    return (Number(r['Impressions']) || 0) > 0 && String(r['Ad name'] ?? '').trim() !== ''
  })
  if (rows.length === 0) return { rowCount: 0 }

  const topRow = rows.reduce((best: any, r: any) =>
    (Number(r['Impressions']) || 0) > (Number(best['Impressions']) || 0) ? r : best
  , rows[0])

  const topAdName = String(topRow['Ad name']).trim()
  const dateFrom  = parseISODate(String(topRow['Reporting starts'] ?? ''))
  const dateTo    = parseISODate(String(topRow['Reporting ends']   ?? ''))

  const { count } = await db.metaAdData.updateMany({
    where: { userId, date: { gte: dateFrom, lte: dateTo } },
    data: { campaignName: topAdName },
  })

  if (count === 0) {
    await db.metaAdData.create({
      data: { userId, date: dateFrom, campaignName: topAdName, spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0 },
    })
  }

  return { rowCount: 1 }
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
        let result
        try {
          result = await handleKDPUpload(session.user.id, buffer, file.name)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to process KDP file.'
          console.error('[parse-auto] KDP upload failed:', msg)
          return NextResponse.json({ error: msg }, { status: 422 })
        }
        auditUploadIfImpersonating(session, file.name, result.rawRowCount, 'kdp')
        return NextResponse.json({
          success: true, type: 'kdp', data: result.accumulatedData,
          diagnostics: result.diagnostics,
          summary: result.summary,
        })
      }

      if (excelType === 'meta') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const XLSX = require('xlsx')
        const wb = XLSX.read(buffer, { type: 'buffer' })
        // Prefer "Worksheet" sheet (new Meta XLSX format), fall back to first sheet
        const sheetName = wb.SheetNames.includes('Worksheet') ? 'Worksheet' : wb.SheetNames[0]
        const csvText: string = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false })
        const level = detectMetaReportLevel(csvText)
        if (level === 'adset' || level === 'unknown') {
          return NextResponse.json({
            error: 'unrecognized_format',
            message: 'This file format is not supported. Upload a KDP or Meta Ads export.',
          }, { status: 422 })
        }
        const data = parseMetaFile(csvText)
        let rowCount = 0
        let dbError: string | null = null
        try {
          if (level === 'campaign') {
            const res = await saveCampaignFileToDB(session.user.id, csvText)
            rowCount = res.rowCount
          } else {
            const res = await saveAdsFileToDB(session.user.id, csvText)
            rowCount = res.rowCount
          }
        } catch (err) {
          dbError = err instanceof Error ? err.message : String(err)
          console.error('[parse-auto] Meta DB write failed:', dbError)
        }
        if (dbError) {
          return NextResponse.json({ error: `DB write failed: ${dbError}` }, { status: 500 })
        }
        const metaDiag = {
          rowCount, level, sheetsFound: wb.SheetNames, sheetUsed: sheetName,
          columnsDetected: [], skippedRows: 0, skipReasons: [],
          firstParsedRow: null, error: rowCount === 0 ? 'No rows parsed' : null,
        }
        await logUpload(session.user.id, 'meta', file.name, rowCount, rowCount > 0 ? 'success' : 'error', metaDiag)
        auditUploadIfImpersonating(session, file.name, rowCount, 'meta')
        return NextResponse.json({
          success: true, type: 'meta', data,
          rowCount,
          diagnostics: metaDiag,
          summary: `${rowCount} row saved · ${data.ads.length} campaigns · $${data.totalSpend} spend · ${data.totalClicks} clicks`,
        })
      }

      return NextResponse.json({
        error: 'unrecognized_format',
        message: 'This file format is not supported. Upload a KDP or Meta Ads export.',
      }, { status: 422 })
    }

    // CSV detection
    const text = await file.text()
    const csvType = detectCSVType(text)

    if (csvType === 'meta') {
      const level = detectMetaReportLevel(text)
      if (level === 'adset' || level === 'unknown') {
        return NextResponse.json({
          error: 'unrecognized_format',
          message: 'This file format is not supported. Upload a KDP or Meta Ads export.',
        }, { status: 422 })
      }
      const data = parseMetaFile(text)
      let rowCount = 0
      let dbError: string | null = null
      try {
        if (level === 'campaign') {
          const res = await saveCampaignFileToDB(session.user.id, text)
          rowCount = res.rowCount
        } else {
          const res = await saveAdsFileToDB(session.user.id, text)
          rowCount = res.rowCount
        }
      } catch (err) {
        dbError = err instanceof Error ? err.message : String(err)
        console.error('[parse-auto] Meta DB write failed:', dbError)
      }
      if (dbError) {
        return NextResponse.json({ error: `DB write failed: ${dbError}` }, { status: 500 })
      }
      const csvDiag = { rowCount, level, sheetsFound: ['CSV'], sheetUsed: 'CSV', columnsDetected: [], skippedRows: 0, skipReasons: [], firstParsedRow: null, error: rowCount === 0 ? 'No rows parsed' : null }
      await logUpload(session.user.id, 'meta', file.name, rowCount, rowCount > 0 ? 'success' : 'error', csvDiag)
      auditUploadIfImpersonating(session, file.name, rowCount, 'meta')
      return NextResponse.json({
        success: true, type: 'meta', data,
        rowCount,
        diagnostics: csvDiag,
        summary: `${rowCount} row saved · ${data.ads.length} campaigns · $${data.totalSpend} spend · ${data.totalClicks} clicks`,
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

    return NextResponse.json({
      error: 'unrecognized_format',
      message: 'This file format is not supported. Upload a KDP or Meta Ads export.',
    }, { status: 422 })
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
