// app/api/parse-auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { saveKdpDataToDB } from '@/lib/kdpSave'
import { parseMetaFile } from '@/lib/parsers/meta'
import { parsePinterestFile } from '@/lib/parsers/pinterest'
import { logAdminAction } from '@/lib/adminAudit'

// Save raw per-row Meta data to MetaAdData table for date-range filtering
// Throws on DB error so callers can surface the failure — does NOT swallow errors
async function saveMetaRowsToDB(userId: string, csvText: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Papa = require('papaparse')
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true })
  const rows = result.data as any[]

  if (rows.length === 0) {
    console.log('[Meta upload] No rows found in CSV')
    return 0
  }

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

  console.log(`[Meta upload] ${validRows.length} valid rows (of ${rows.length} total)`)

  if (validRows.length === 0) return 0

  // Log the first row's date fields so we can see what the export contains
  const firstRow = validRows[0]
  console.log('[Meta upload] first row date fields:', {
    'Reporting starts': firstRow['Reporting starts'],
    'Reporting ends':   firstRow['Reporting ends'],
    'Date':             firstRow['Date'],
    'Report start':     firstRow['Report start'],
  })

  const toInsert = validRows.map((r: any) => {
    // Prefer "Reporting ends" over "Reporting starts":
    // Summary exports have Reporting starts = period start (e.g. Mar 1) but
    // Reporting ends = period end (e.g. Apr 27). Using the end date ensures
    // the row lands inside the user's recent date range query window.
    const rawDate = r['Reporting ends'] ?? r['Reporting starts'] ?? r['Date'] ?? r['Report start'] ?? ''
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

  console.log('[Meta upload] Attempting deleteMany for userId:', userId)
  // Delete existing rows for this user before inserting (replace on re-upload)
  await db.metaAdData.deleteMany({ where: { userId } })
  console.log('[Meta upload] deleteMany done, starting createMany with', toInsert.length, 'rows')

  await db.metaAdData.createMany({ data: toInsert })
  console.log(`[Meta upload] createMany done — saved ${toInsert.length} rows to MetaAdData`)
  return toInsert.length
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
    // v3 10-sheet format has 'eBook Royalty' / 'Audiobook Royalty'; older formats have 'Orders Processed' etc.
    if (wb.SheetNames.some((n: string) =>
      n === 'Orders Processed' || n === 'KENP Read' || n === 'Summary' ||
      n === 'eBook Royalty' || n === 'Audiobook Royalty' || n === 'Paperback Royalty'
    )) {
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
        let data
        try {
          data = parseKDPFile(buffer)
        } catch (parseErr) {
          console.error('[parse-auto] KDP parse failed:', parseErr, { name: file.name })
          return NextResponse.json(
            { error: 'Unrecognized file format. Please upload a KDP Sales & Royalties report.' },
            { status: 422 }
          )
        }

        const rawRows = data.rawSaleRows ?? []
        const diag = data.diagnostics ?? null

        // Load user's book catalog for matching
        const userBooks = await db.book.findMany({
          where:  { userId: session.user.id },
          select: { asin: true, asinPaperback: true, asinAudiobook: true, isbnPaperback: true, isbnHardcover: true },
        })

        let saved = 0
        let skipped = 0
        if (rawRows.length > 0) {
          const result = await saveKdpDataToDB(session.user.id, rawRows, userBooks)
          saved   = result.saved
          skipped = result.skipped
          console.log(`[parse-auto] KDP: ${saved} saved, ${skipped} skipped, ${rawRows.length} parsed`)
        }

        // Refresh Analysis record for the month covered
        try {
          const month = data.month
          const [yr, mo] = month.split('-').map(Number)
          const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`
          const accRows = await db.kdpSale.findMany({
            where: { userId: session.user.id, date: { gte: `${month}-01`, lt: `${nextMo}-01` } },
          })

          const bookMap       = new Map<string, { asin: string; title: string; units: number; kenp: number; royalties: number; format: string }>()
          const dailyUnitsMap = new Map<string, number>()
          const dailyKENPMap  = new Map<string, number>()
          for (const row of accRows) {
            const b = bookMap.get(row.asin)
            if (b) { b.units += row.units; b.kenp += row.kenp; b.royalties += row.royalties }
            else bookMap.set(row.asin, { asin: row.asin, title: row.title, units: row.units, kenp: row.kenp, royalties: row.royalties, format: row.format })
            dailyUnitsMap.set(row.date, (dailyUnitsMap.get(row.date) ?? 0) + row.units)
            dailyKENPMap.set(row.date,  (dailyKENPMap.get(row.date)  ?? 0) + row.kenp)
          }

          const books = Array.from(bookMap.values()).sort((a, b) => b.units - a.units).map(b => ({
            ...b,
            shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '...' : b.title,
            format: b.format as 'ebook' | 'paperback' | 'hardcover' | 'audiobook' | 'ku' | undefined,
          }))
          const dailyUnits = Array.from(dailyUnitsMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
          const dailyKENP  = Array.from(dailyKENPMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
          const totalUnits        = books.reduce((s, b) => s + b.units, 0)
          const totalKENP         = books.reduce((s, b) => s + b.kenp, 0)
          const totalRoyaltiesUSD = books.reduce((s, b) => s + b.royalties, 0)
          const paperbackUnits    = books.filter(b => b.format === 'paperback' || b.format === 'hardcover').reduce((s, b) => s + b.units, 0)
          const accumulatedData   = {
            ...data,
            rawSaleRows: undefined,
            totalUnits, totalKENP, totalRoyaltiesUSD, books, dailyUnits, dailyKENP,
            summary: { paidUnits: totalUnits - paperbackUnits, freeUnits: 0, paperbackUnits },
          }

          const existing = await db.analysis.findFirst({ where: { userId: session.user.id, month } })
          if (existing) {
            const existingData = (existing.data as Record<string, unknown>) ?? {}
            const { storySentence: _ss, actionPlan: _ap, channelScores: _cs, insights: _ins, fingerprint: _fp,
                    kdpCoach: _kc, metaCoach: _mc, emailCoach: _ec, pinterestCoach: _pc, swapsCoach: _sc,
                    overallVerdict: _ov, confidenceNote: _cn, ...preservedData } = existingData
            await db.analysis.update({ where: { id: existing.id }, data: { data: { ...preservedData, kdp: accumulatedData } as object } })
          } else {
            await db.analysis.create({ data: { userId: session.user.id, month, data: { month, kdp: accumulatedData } as object } })
          }
        } catch (dbErr) {
          console.error('[parse-auto] KDP analysis refresh failed:', dbErr)
        }

        const uploadStatus = diag?.rowCount === 0 ? 'error' : skipped > 0 && saved === 0 ? 'partial' : 'success'
        await logUpload(session.user.id, 'kdp', file.name, saved, uploadStatus, diag ?? {})
        auditUploadIfImpersonating(session, file.name, saved, 'kdp')
        return NextResponse.json({
          success: true, type: 'kdp', data,
          rowCount: saved,
          parsed:  rawRows.length,
          saved,
          skipped,
          diagnostics: diag,
          summary: `${saved} rows saved · ${data.totalUnits} units · ${data.totalKENP?.toLocaleString()} KENP · $${data.totalRoyaltiesUSD} royalties`,
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
        let savedRows = 0
        let dbError: string | null = null
        try {
          savedRows = await saveMetaRowsToDB(session.user.id, csvText)
        } catch (err) {
          dbError = err instanceof Error ? err.message : String(err)
          console.error('[parse-auto] Meta DB write failed:', dbError)
        }
        if (dbError) {
          return NextResponse.json({ error: `DB write failed: ${dbError}` }, { status: 500 })
        }
        const rowCount = savedRows
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
      let savedRows = 0
      let dbError: string | null = null
      try {
        savedRows = await saveMetaRowsToDB(session.user.id, text)
      } catch (err) {
        dbError = err instanceof Error ? err.message : String(err)
        console.error('[parse-auto] Meta DB write failed:', dbError)
      }
      if (dbError) {
        return NextResponse.json({ error: `DB write failed: ${dbError}` }, { status: 500 })
      }
      const rowCount = savedRows
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
