// app/api/kdp/generate-tracker/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import ExcelJS from 'exceljs'

// ── Color palette (ARGB format for ExcelJS) ───────────────────────────────────
const C = {
  NAVY:        'FF1E2D3D',
  AMBER:       'FFE9A020',
  SAGE:        'FF6EBF8B',
  WHITE:       'FFFFFFFF',
  GRAY:        'FFF5F5F5',
  GREEN_FILL:  'FFC6EFCE',
  GREEN_FONT:  'FF276221',
  RED_FILL:    'FFFFC7CE',
  RED_FONT:    'FF9C0006',
  AMBER_FILL:  'FFFFF2CC',
} as const

// ── Column definitions ────────────────────────────────────────────────────────
const BOOK_COLS = [
  { header: 'DATE',                          width: 14, fmt: 'yyyy-mm-dd',  col: 'A' },
  { header: 'DAILY AD SPEND',               width: 16, fmt: '$#,##0.00',   col: 'B' },
  { header: 'Unique Link Clicks',            width: 18, fmt: '#,##0',       col: 'C' },
  { header: 'Unique CPC',                   width: 14, fmt: '$#,##0.00',   col: 'D' },
  { header: 'Unique CTR',                   width: 14, fmt: '0.00',        col: 'E' },
  { header: 'Book Rank',                    width: 12, fmt: '',            col: 'F' },
  { header: 'REVENUE FOR FRONT END BOOK',   width: 24, fmt: '$#,##0.00',   col: 'G' },
  { header: 'ROI FRONT END',               width: 16, fmt: '$#,##0.00',   col: 'H' },
  { header: 'REVENUE FOR WHOLE CATALOGUE', width: 26, fmt: '$#,##0.00',   col: 'I' },
  { header: 'ROI OVERALL',                 width: 14, fmt: '$#,##0.00',   col: 'J' },
  { header: 'ROAS',                        width: 10, fmt: '0.00',        col: 'K' },
  { header: 'Page Reads',                  width: 12, fmt: '#,##0',       col: 'L' },
  { header: '# Orders',                    width: 12, fmt: '#,##0',       col: 'M' },
]

const EMAIL_COLS = [
  { header: 'DATE',                          width: 14, fmt: 'yyyy-mm-dd',  col: 'A' },
  { header: 'TOTAL (spend)',                 width: 16, fmt: '$#,##0.00',   col: 'B' },
  { header: 'Unique Link Clicks',            width: 18, fmt: '#,##0',       col: 'C' },
  { header: 'Unique CPC',                   width: 14, fmt: '$#,##0.00',   col: 'D' },
  { header: 'Unique CTR',                   width: 14, fmt: '0.00',        col: 'E' },
  { header: 'Book Rank',                    width: 12, fmt: '',            col: 'F' },
  { header: 'CONFIRMED SUBS ON BOOK FUNNEL',width: 26, fmt: '#,##0',       col: 'G' },
  { header: 'ROI FRONT END',               width: 16, fmt: '$#,##0.00',   col: 'H' },
  { header: 'REVENUE FOR WHOLE CATALOGUE', width: 26, fmt: '$#,##0.00',   col: 'I' },
  { header: 'ROI OVERALL',                 width: 14, fmt: '$#,##0.00',   col: 'J' },
  { header: 'ROAS',                        width: 10, fmt: '0.00',        col: 'K' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function styleGoalsRow(row: ExcelJS.Row, numCols: number) {
  for (let c = 1; c <= numCols; c++) {
    const cell = row.getCell(c)
    cell.font = { name: 'Arial', size: 10, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.AMBER } }
  }
  row.height = 20
  row.commit()
}

function styleHeaderRow(row: ExcelJS.Row, numCols: number) {
  for (let c = 1; c <= numCols; c++) {
    const cell = row.getCell(c)
    cell.font      = { name: 'Arial', size: 10, bold: true, color: { argb: C.WHITE } }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.NAVY } }
    cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
  }
  row.height = 32
  row.commit()
}

function applySpendColor(cell: ExcelJS.Cell, value: number) {
  if (value > 0) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.AMBER_FILL } }
  }
}

function applyRoiColor(cell: ExcelJS.Cell, value: number) {
  if (value > 0) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.GREEN_FILL } }
    cell.font = { name: 'Arial', size: 10, color: { argb: C.GREEN_FONT } }
  } else if (value < 0) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.RED_FILL } }
    cell.font = { name: 'Arial', size: 10, color: { argb: C.RED_FONT } }
  }
}

function applyRoasColor(cell: ExcelJS.Cell, value: number) {
  if (value >= 1.0) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.GREEN_FILL } }
    cell.font = { name: 'Arial', size: 10, color: { argb: C.GREEN_FONT } }
  } else if (value > 0) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.RED_FILL } }
    cell.font = { name: 'Arial', size: 10, color: { argb: C.RED_FONT } }
  }
}

function setColWidths(ws: ExcelJS.Worksheet, cols: typeof BOOK_COLS) {
  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width
  })
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    dateRange?: { start: string; end: string }
  }
  const { dateRange } = body

  // ── Fetch data ───────────────────────────────────────────────────────────
  const [analyses, launches] = await Promise.all([
    db.analysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    db.launch.findMany({
      where: { userId: session.user.id },
      orderBy: { startDate: 'asc' },
    }),
  ])

  // Find most recent analysis that has KDP data
  let analysisData: Record<string, unknown> | null = null
  for (const a of analyses) {
    const d = a.data as Record<string, unknown>
    if (d?.kdp) { analysisData = d; break }
  }

  if (!analysisData?.kdp) {
    return NextResponse.json(
      { error: 'No KDP data found. Upload your KDP report first.' },
      { status: 404 }
    )
  }

  const kdp  = analysisData.kdp  as Record<string, unknown>
  const meta = analysisData.meta as Record<string, unknown> | undefined

  // ── Build daily maps from KDP data ───────────────────────────────────────
  const rawDailyUnits = (kdp.dailyUnits as Array<{ date: string; value: number }>) ?? []
  const rawDailyKENP  = (kdp.dailyKENP  as Array<{ date: string; value: number }>) ?? []

  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()

  for (const d of rawDailyUnits) {
    dailyUnitsMap.set(d.date, (dailyUnitsMap.get(d.date) ?? 0) + d.value)
  }
  for (const d of rawDailyKENP) {
    dailyKENPMap.set(d.date, (dailyKENPMap.get(d.date) ?? 0) + d.value)
  }

  // Build date list — filter by dateRange if provided
  let dates = Array.from(dailyUnitsMap.keys()).sort()
  if (dates.length === 0) dates = Array.from(dailyKENPMap.keys()).sort()
  if (dateRange?.start) dates = dates.filter(d => d >= dateRange.start)
  if (dateRange?.end)   dates = dates.filter(d => d <= dateRange.end)

  // Fallback: single row for today if no daily data
  if (dates.length === 0) {
    dates = [new Date().toISOString().split('T')[0]]
  }

  const numDays = dates.length

  // ── Book-level aggregates ────────────────────────────────────────────────
  const books      = (kdp.books as Array<{
    title: string; asin: string; shortTitle: string
    units: number; kenp: number; royalties: number
  }>) ?? []

  const totalUnits    = Math.max((kdp.totalUnits    as number) ?? 0, 1)
  const totalKENP     = Math.max((kdp.totalKENP     as number) ?? 0, 1)
  const totalRoyalties = (kdp.totalRoyaltiesUSD as number) ?? 0

  // ── Meta ad data ─────────────────────────────────────────────────────────
  const metaAds = (meta?.ads as Array<{
    name: string; spend: number; clicks: number; impressions: number
    ctr: number; cpc: number
  }>) ?? []

  // Split lead-magnet ads (name contains "LM") vs regular book ads
  const lmAds   = metaAds.filter(a => /\bLM\b/i.test(a.name) || a.name.toLowerCase().includes('lm'))
  const bookAds = metaAds.filter(a => !lmAds.includes(a))

  const lmTotalSpend  = lmAds.reduce((s, a) => s + a.spend,  0)
  const lmTotalClicks = lmAds.reduce((s, a) => s + a.clicks, 0)
  const lmTotalImpressions = lmAds.reduce((s, a) => s + a.impressions, 0)
  const lmAvgCTR = lmTotalImpressions > 0
    ? (lmTotalClicks / lmTotalImpressions) * 100
    : (lmAds.length > 0 ? lmAds.reduce((s, a) => s + a.ctr, 0) / lmAds.length : 0)

  // ── Match book ads to books by ASIN/title keywords ───────────────────────
  const bookAdSpend  = new Map<string, number>()
  const bookAdClicks = new Map<string, number>()
  const bookAdCTR    = new Map<string, number>()

  const matchedAdNames = new Set<string>()

  for (const book of books) {
    const key = book.asin || book.title
    const titleWords = book.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)

    const matched = bookAds.filter(a => {
      const n = a.name.toLowerCase()
      return (
        (book.asin && n.includes(book.asin.toLowerCase())) ||
        titleWords.some(w => n.includes(w))
      )
    })

    if (matched.length > 0) {
      matched.forEach(a => matchedAdNames.add(a.name))
      bookAdSpend.set(key, matched.reduce((s, a) => s + a.spend,  0))
      bookAdClicks.set(key, matched.reduce((s, a) => s + a.clicks, 0))
      const totImpr = matched.reduce((s, a) => s + a.impressions, 0)
      const totClk  = matched.reduce((s, a) => s + a.clicks,      0)
      bookAdCTR.set(key, totImpr > 0
        ? (totClk / totImpr) * 100
        : matched.reduce((s, a) => s + a.ctr, 0) / matched.length
      )
    }
  }

  // Unmatched ads — distribute evenly across books
  const unmatchedAds = bookAds.filter(a => !matchedAdNames.has(a.name))
  if (unmatchedAds.length > 0 && books.length > 0) {
    const shareSpend  = unmatchedAds.reduce((s, a) => s + a.spend,  0) / books.length
    const shareClicks = unmatchedAds.reduce((s, a) => s + a.clicks, 0) / books.length
    const totImpr = unmatchedAds.reduce((s, a) => s + a.impressions, 0)
    const totClk  = unmatchedAds.reduce((s, a) => s + a.clicks,      0)
    const shareCTR = totImpr > 0 ? (totClk / totImpr) * 100 : 0

    for (const book of books) {
      const key = book.asin || book.title
      bookAdSpend.set(key,  (bookAdSpend.get(key)  ?? 0) + shareSpend)
      bookAdClicks.set(key, (bookAdClicks.get(key) ?? 0) + shareClicks)
      if (!bookAdCTR.has(key)) bookAdCTR.set(key, shareCTR)
    }
  }

  // ── Build launch date set for LAUNCH row markers ─────────────────────────
  const launchDates = new Set<string>()
  for (const launch of launches) {
    if (launch.startDate) {
      launchDates.add(launch.startDate.toISOString().split('T')[0])
    }
  }

  // ── Create workbook ──────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AuthorDash'

  // ── Per-book sheets ──────────────────────────────────────────────────────
  for (const book of books) {
    const sheetName = (book.title || book.asin || 'Book').replace(/[:\\/?*[\]]/g, '').slice(0, 31)
    const ws = workbook.addWorksheet(sheetName)
    setColWidths(ws, BOOK_COLS)

    const bookKey      = book.asin || book.title
    const unitFrac     = totalUnits > 0 ? book.units     / totalUnits : 0
    const kenpFrac     = totalKENP  > 0 ? book.kenp      / totalKENP  : 0
    const royPerUnit   = book.units > 0 ? book.royalties / book.units : 0
    const catRoyPerUnit = totalUnits > 0 ? totalRoyalties / totalUnits : 0

    const bookTotalSpend  = bookAdSpend.get(bookKey)  ?? 0
    const bookTotalClicks = bookAdClicks.get(bookKey) ?? 0
    const bookCTR         = bookAdCTR.get(bookKey)    ?? 0

    const dailySpend  = numDays > 0 ? bookTotalSpend  / numDays : 0
    const dailyClicks = numDays > 0 ? bookTotalClicks / numDays : 0

    // Row 1: GOALS
    const goalsRow = ws.getRow(1)
    goalsRow.getCell(1).value = 'GOALS'
    goalsRow.getCell(4).value = 0.10  // Unique CPC goal
    goalsRow.getCell(5).value = 0.15  // Unique CTR goal
    goalsRow.getCell(4).numFmt = '$#,##0.00'
    styleGoalsRow(goalsRow, BOOK_COLS.length)

    // Row 2: Headers
    const headerRow = ws.getRow(2)
    BOOK_COLS.forEach((col, i) => {
      headerRow.getCell(i + 1).value = col.header
    })
    styleHeaderRow(headerRow, BOOK_COLS.length)

    // Data rows
    dates.forEach((date, idx) => {
      const rowNum = idx + 3
      const isAlt  = idx % 2 === 1
      const isLaunch = launchDates.has(date)

      const dailyTotalUnits = dailyUnitsMap.get(date) ?? 0
      const dailyTotalKENP  = dailyKENPMap.get(date)  ?? 0

      const bookDailyUnits   = dailyTotalUnits * unitFrac
      const bookDailyKenp    = dailyTotalKENP  * kenpFrac
      const bookDailyRevenue = bookDailyUnits  * royPerUnit
      const catDailyRevenue  = dailyTotalUnits * catRoyPerUnit

      const spend   = dailySpend
      const clicks  = dailyClicks
      const cpc     = clicks > 0 ? spend / clicks : 0
      const ctr     = bookCTR
      const roiFront   = bookDailyRevenue - spend
      const roiOverall = catDailyRevenue  - spend
      const roas       = spend > 0 ? bookDailyRevenue / spend : 0

      const row = ws.getRow(rowNum)

      // Values
      row.getCell(1).value  = date
      row.getCell(2).value  = Math.round(spend           * 100) / 100
      row.getCell(3).value  = Math.round(clicks          * 10)  / 10
      row.getCell(4).value  = { formula: `=IFERROR(B${rowNum}/C${rowNum},0)` }
      row.getCell(5).value  = Math.round(ctr             * 100) / 100
      row.getCell(6).value  = ''  // Book Rank — user fills
      row.getCell(7).value  = Math.round(bookDailyRevenue * 100) / 100
      row.getCell(8).value  = { formula: `=IFERROR(G${rowNum}-B${rowNum},0)` }
      row.getCell(9).value  = Math.round(catDailyRevenue  * 100) / 100
      row.getCell(10).value = { formula: `=IFERROR(I${rowNum}-B${rowNum},0)` }
      row.getCell(11).value = { formula: `=IFERROR(G${rowNum}/B${rowNum},0)` }
      row.getCell(12).value = Math.round(bookDailyKenp    * 10)  / 10
      row.getCell(13).value = Math.round(bookDailyUnits   * 10)  / 10

      // Number formats
      BOOK_COLS.forEach((col, i) => {
        if (col.fmt) row.getCell(i + 1).numFmt = col.fmt
      })

      // Base font + alternating fill
      const altFill = isAlt
        ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: C.GRAY } }
        : undefined

      for (let c = 1; c <= BOOK_COLS.length; c++) {
        const cell = row.getCell(c)
        if (!cell.font?.color) cell.font = { name: 'Arial', size: 10 }
        if (altFill && !cell.fill) cell.fill = altFill
      }

      // LAUNCH row override
      if (isLaunch) {
        for (let c = 1; c <= BOOK_COLS.length; c++) {
          const cell = row.getCell(c)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.SAGE } }
          cell.font = { name: 'Arial', size: 10, bold: true }
        }
      }

      // Conditional color coding (overrides base fill)
      if (!isLaunch) {
        applySpendColor(row.getCell(2), spend)
        applyRoiColor(row.getCell(8), roiFront)
        applyRoiColor(row.getCell(10), roiOverall)
        applyRoasColor(row.getCell(11), roas)
      }

      row.commit()
    })
  }

  // ── EMAIL SUBS sheet ─────────────────────────────────────────────────────
  const emailWs = workbook.addWorksheet('EMAIL SUBS')
  setColWidths(emailWs, EMAIL_COLS)

  // Row 1: GOALS
  const emailGoals = emailWs.getRow(1)
  emailGoals.getCell(1).value = 'GOALS'
  emailGoals.getCell(4).value = 0.10
  emailGoals.getCell(5).value = 0.15
  emailGoals.getCell(4).numFmt = '$#,##0.00'
  styleGoalsRow(emailGoals, EMAIL_COLS.length)

  // Row 2: Headers
  const emailHeader = emailWs.getRow(2)
  EMAIL_COLS.forEach((col, i) => {
    emailHeader.getCell(i + 1).value = col.header
  })
  styleHeaderRow(emailHeader, EMAIL_COLS.length)

  // Data rows for EMAIL SUBS
  const lmDailySpend  = numDays > 0 ? lmTotalSpend  / numDays : 0
  const lmDailyClicks = numDays > 0 ? lmTotalClicks / numDays : 0

  dates.forEach((date, idx) => {
    const rowNum = idx + 3
    const isAlt  = idx % 2 === 1

    const dailyTotalUnits = dailyUnitsMap.get(date) ?? 0
    const catDailyRevenue = dailyTotalUnits * (totalUnits > 0 ? totalRoyalties / totalUnits : 0)

    const spend  = lmDailySpend
    const clicks = lmDailyClicks
    const ctr    = lmAvgCTR

    const roiOverall = catDailyRevenue - spend
    const roiFront   = -spend  // No sub revenue tracked, so ROI = 0 - spend

    const row = emailWs.getRow(rowNum)
    row.getCell(1).value  = date
    row.getCell(2).value  = Math.round(spend  * 100) / 100
    row.getCell(3).value  = Math.round(clicks * 10)  / 10
    row.getCell(4).value  = { formula: `=IFERROR(B${rowNum}/C${rowNum},0)` }
    row.getCell(5).value  = Math.round(ctr    * 100) / 100
    row.getCell(6).value  = ''   // Book Rank
    row.getCell(7).value  = ''   // CONFIRMED SUBS — user fills
    row.getCell(8).value  = { formula: `=IFERROR(G${rowNum}-B${rowNum},0)` }
    row.getCell(9).value  = Math.round(catDailyRevenue * 100) / 100
    row.getCell(10).value = { formula: `=IFERROR(I${rowNum}-B${rowNum},0)` }
    row.getCell(11).value = { formula: `=IFERROR(G${rowNum}/B${rowNum},0)` }

    EMAIL_COLS.forEach((col, i) => {
      if (col.fmt) row.getCell(i + 1).numFmt = col.fmt
    })

    const altFill = isAlt
      ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: C.GRAY } }
      : undefined

    for (let c = 1; c <= EMAIL_COLS.length; c++) {
      const cell = row.getCell(c)
      if (!cell.font?.color) cell.font = { name: 'Arial', size: 10 }
      if (altFill) cell.fill = altFill
    }

    applySpendColor(row.getCell(2), spend)
    applyRoiColor(row.getCell(8), roiFront)
    applyRoiColor(row.getCell(10), roiOverall)
    // ROAS on EMAIL SUBS: cell 11 — value won't be computable (G is blank) so skip color

    row.commit()
  })

  // ── Write buffer ─────────────────────────────────────────────────────────
  const buf = Buffer.from(await workbook.xlsx.writeBuffer())
  const today = new Date().toISOString().split('T')[0]
  const filename = `AuthorDash_Ad_Tracker_${today}.xlsx`

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
