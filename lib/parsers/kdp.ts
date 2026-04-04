// lib/parsers/kdp.ts
import * as XLSX from 'xlsx'
import type { KDPData, BookData, DailyData } from '@/types'

export function parseKDPFile(buffer: Uint8Array | ArrayBuffer): KDPData {
  const workbook = XLSX.read(buffer, {
    type: buffer instanceof ArrayBuffer ? 'buffer' : 'array',
    cellDates: true,
  })

  // Detect format: Amazon exports two layouts:
  //   Multi-sheet: "Summary" + "Orders Processed" + "KENP Read" sheets
  //   Flat:        Single sheet with "Units Sold" / "KENP Read" / "Royalty" columns
  const hasMultiSheet = workbook.SheetNames.some(
    n => n === 'Orders Processed' || n === 'KENP Read'
  )

  return hasMultiSheet
    ? parseMultiSheetFormat(workbook)
    : parseFlatFormat(workbook)
}

// ── Header-name helpers ───────────────────────────────────────────────────────

/**
 * Find the index of the first header that matches any of the given variants
 * (case-insensitive substring match, e.g. "Net Royalty" matches "net royalty").
 * Returns -1 if none found.
 */
function findColIdx(headers: any[], ...variants: string[]): number {
  const lower = variants.map(v => v.toLowerCase().trim())
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? '').toLowerCase().trim()
    if (h && lower.some(v => h === v || h.includes(v) || v.includes(h))) return i
  }
  return -1
}

/**
 * Look up a value from a row object (from sheet_to_json) using multiple header
 * name variants. Tries exact key first, then case-insensitive substring match.
 */
function pick(row: Record<string, unknown>, ...variants: string[]): unknown {
  for (const v of variants) {
    if (row[v] !== undefined) return row[v]
  }
  const keys = Object.keys(row)
  for (const v of variants) {
    const vl = v.toLowerCase().trim()
    const key = keys.find(k => {
      const kl = k.toLowerCase().trim()
      return kl === vl || kl.includes(vl) || vl.includes(kl)
    })
    if (key !== undefined) return row[key]
  }
  return undefined
}

function num(v: unknown): number { return Number(v || 0) }
function str(v: unknown): string { return String(v || '') }

/**
 * Safely convert any date-like value from XLSX to a YYYY-MM-DD string.
 * XLSX with cellDates:true returns JS Date objects; String(date) gives a
 * locale string that does NOT contain 'T', so the old .split('T')[0] trick
 * breaks.  This handles Date objects, ISO strings, and other formats.
 */
function toISODate(v: unknown): string {
  if (!v) return ''
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return ''
    return v.toISOString().split('T')[0]
  }
  const s = String(v).trim()
  if (!s) return ''
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // Try generic parse (handles "03/27/2026", "March 27, 2026", etc.)
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  // Fallback: strip time portion if present
  return s.split('T')[0]
}

// ── Multi-sheet format (standard KDP month-end report) ───────────────────────
function parseMultiSheetFormat(workbook: XLSX.WorkBook): KDPData {
  // ── Summary sheet: flexible column lookup by header name ─────────────────
  const summarySheet = workbook.Sheets['Summary']
  const summaryRows = summarySheet
    ? (XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as any[][])
    : []

  let month = 'Unknown'
  let totalRoyaltiesUSD = 0
  let paidUnits = 0
  let freeUnits = 0
  let paperbackUnits = 0
  let totalKENP = 0

  if (summaryRows.length >= 2) {
    const headers = summaryRows[0] ?? []
    const data    = summaryRows[1] ?? []

    // Log actual headers so we can debug future format changes
    console.log('[KDP parser] Summary headers:', headers.map(String))

    const iMonth     = findColIdx(headers, 'royalty date', 'month', 'period', 'date')
    const iPaid      = findColIdx(headers, 'ebook paid units', 'paid units', 'units sold', 'paid unit')
    const iFree      = findColIdx(headers, 'ebook free units', 'free units', 'free unit')
    const iPaperback = findColIdx(headers, 'paperback paid units', 'paperback units', 'paperback paid', 'paperback')
    const iKENP      = findColIdx(headers, 'kenp read', 'kenp pages read', 'ku pages read', 'ku read', 'kenp')
    const iRoyalty   = findColIdx(headers,
      'royalty', 'net royalty', 'est. royalty', 'royalties', 'net royalties',
      'total royalty', 'total royalties', 'estimated royalty',
    )

    if (iMonth     >= 0) month             = str(data[iMonth])
    if (iPaid      >= 0) paidUnits         = num(data[iPaid])
    if (iFree      >= 0) freeUnits         = num(data[iFree])
    if (iPaperback >= 0) paperbackUnits    = num(data[iPaperback])
    if (iKENP      >= 0) totalKENP         = num(data[iKENP])
    if (iRoyalty   >= 0) totalRoyaltiesUSD = num(data[iRoyalty])

    // If ALL critical columns are missing, this isn't a KDP report
    if (iMonth < 0 && iPaid < 0 && iKENP < 0 && iRoyalty < 0) {
      throw new Error("This doesn't look like a KDP Royalty Estimator report. Download it from KDP → Reports → Royalty Estimator and select All Titles.")
    }
    // Warn on any individual columns we couldn't map
    const missing: string[] = []
    if (iMonth     < 0) missing.push('month')
    if (iPaid      < 0) missing.push('paidUnits')
    if (iKENP      < 0) missing.push('kenp')
    if (iRoyalty   < 0) missing.push('royalties')
    if (missing.length) {
      console.warn('[KDP parser] Summary: could not find columns for:', missing.join(', '))
      console.warn('[KDP parser] Actual headers were:', JSON.stringify(headers))
    }
  }

  // ── Orders / Sales sheet: try "Orders Processed" first, then any sheet
  //    that isn't Summary or KENP Read (handles alternate export formats)  ──
  const KENP_NAMES = new Set(['KENP Read', 'KENP', 'Kindle Edition Normalized Page Read'])
  const ordersSheetName =
    workbook.SheetNames.find(n => n === 'Orders Processed') ??
    workbook.SheetNames.find(n => n !== 'Summary' && !KENP_NAMES.has(n))
  const ordersSheet = ordersSheetName ? workbook.Sheets[ordersSheetName] : null
  const ordersData  = ordersSheet
    ? (XLSX.utils.sheet_to_json(ordersSheet) as Record<string, unknown>[])
    : []

  // ── KENP Read sheet ───────────────────────────────────────────────────────
  const kenpSheetName = workbook.SheetNames.find(n => KENP_NAMES.has(n)) ?? 'KENP Read'
  const kenpSheet = workbook.Sheets[kenpSheetName]
  const kenpData  = kenpSheet
    ? (XLSX.utils.sheet_to_json(kenpSheet) as Record<string, unknown>[])
    : []

  // Log per-sheet headers so we can debug field mapping issues
  if (ordersData.length) console.log('[KDP parser] Orders headers:', Object.keys(ordersData[0]))
  if (kenpData.length)   console.log('[KDP parser] KENP headers:',  Object.keys(kenpData[0]))

  const bookMap = new Map<string, BookData>()

  let ordersRoyaltiesUSD = 0
  for (const row of ordersData) {
    const asin        = str(pick(row, 'ASIN', 'ASIN/ISBN', 'Asin', 'asin'))
    const title       = str(pick(row, 'Title', 'Book Title', 'title'))
    const units       = num(pick(row, 'Net Units Sold', 'Paid Units', 'Units Sold', 'Units'))
    const royaltyType = str(pick(row, 'Royalty Type', 'Type', 'Format', 'Binding')).toLowerCase()
    const royalty     = num(pick(row,
      'Royalty', 'Net Royalty', 'Est. Royalty', 'Royalties', 'Net Royalties',
      'Total Royalty', 'Total Royalties', 'Estimated Royalty',
    ))
    const currency    = str(pick(row, 'Currency', 'currency')).toUpperCase().trim()

    // Sum USD royalties from all rows (currency blank = assume USD)
    if (currency === 'USD' || currency === '') ordersRoyaltiesUSD += royalty

    if (!asin) continue
    // Detect paperback: 60%/40% royalty rate, or explicit "print"/"paperback" labels
    const isPaperback = royaltyType.includes('60') || royaltyType.includes('40%') ||
      royaltyType.includes('print') || royaltyType.includes('paperback')
    if (!bookMap.has(asin)) {
      bookMap.set(asin, {
        title, asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0, kenp: 0, royalties: 0,
        format: isPaperback ? 'paperback' : 'ebook',
      })
    }
    bookMap.get(asin)!.units += units
    bookMap.get(asin)!.royalties += currency === 'USD' || currency === '' ? royalty : 0
  }
  // Prefer per-row royalty sum over the Summary single-row value (which may be
  // per-marketplace or incomplete). Fall back to Summary value if orders sheet
  // had no royalty data at all.
  if (ordersRoyaltiesUSD > 0) totalRoyaltiesUSD = ordersRoyaltiesUSD

  for (const row of kenpData) {
    const asin = str(pick(row, 'ASIN', 'Asin', 'asin'))
    const kenp = num(pick(row,
      'Kindle Edition Normalized Page (KENP) Read',
      'KENP Read', 'KENP Pages Read', 'KU Pages Read', 'Pages Read', 'KENP',
    ))
    if (asin && bookMap.has(asin)) bookMap.get(asin)!.kenp += kenp
  }

  // ── Daily breakdowns ──────────────────────────────────────────────────────
  const dailyUnitsMap = new Map<string, number>()
  for (const row of ordersData) {
    const date  = toISODate(pick(row, 'Date', 'Transaction Date', 'Royalty Date'))
    const units = num(pick(row, 'Paid Units', 'Units Sold', 'Net Units Sold', 'Units'))
    if (date) dailyUnitsMap.set(date, (dailyUnitsMap.get(date) ?? 0) + units)
  }

  const dailyKENPMap = new Map<string, number>()
  for (const row of kenpData) {
    const date = toISODate(pick(row, 'Date', 'Read Date', 'Transaction Date'))
    const kenp = num(pick(row,
      'Kindle Edition Normalized Page (KENP) Read',
      'KENP Read', 'KENP Pages Read', 'KU Pages Read', 'Pages Read', 'KENP',
    ))
    if (date) dailyKENPMap.set(date, (dailyKENPMap.get(date) ?? 0) + kenp)
  }

  const dailyUnits: DailyData[] = Array.from(dailyUnitsMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyKENP: DailyData[] = Array.from(dailyKENPMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const books      = Array.from(bookMap.values()).sort((a, b) => b.units - a.units)
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)

  // Prefer per-book KENP sum (from named columns in KENP sheet) over the Summary
  // row value, which can point to a rate column instead of the count column.
  const kenpFromBooks = books.reduce((sum, b) => sum + b.kenp, 0)
  const resolvedKENP  = kenpFromBooks > totalKENP ? kenpFromBooks : totalKENP

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP: resolvedKENP,
    books, dailyUnits, dailyKENP,
    summary: { paidUnits, freeUnits, paperbackUnits },
  }
}

// ── Flat format (KDP "By Month" or "By Title" report — single sheet) ─────────
function parseFlatFormat(workbook: XLSX.WorkBook): KDPData {
  const sheetName = workbook.SheetNames[0]
  const rows = sheetName
    ? (XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[])
    : []

  if (rows.length) console.log('[KDP parser] Flat headers:', Object.keys(rows[0]))

  const bookMap = new Map<string, BookData>()
  let totalKENP         = 0
  let totalRoyaltiesUSD = 0
  let paidUnits         = 0
  let rowCount          = 0

  for (const row of rows) {
    const asin  = str(pick(row, 'ASIN', 'Asin', 'asin'))
    const title = str(pick(row, 'Title', 'Book Title', 'title'))
    if (!asin && !title) continue

    // Prefer 'Net Units Sold' (after refunds) over gross 'Units Sold' — Royalty Estimator CSV has both
    const units   = num(pick(row, 'Net Units Sold', 'Units Sold', 'Paid Units Sold', 'Paid Units', 'Units'))
    const kenp    = num(pick(row, 'KENP Read', 'KENP Pages Read', 'KU Pages Read', 'Pages Read', 'KENP'))
    // 'Royalties (USD)' must come before 'Royalty' — otherwise 'Royalty Type' (a text field) fuzzy-matches first
    const royalty = num(pick(row,
      'Royalties (USD)', 'Royalty', 'Net Royalty', 'Est. Royalty', 'Royalties', 'Net Royalties',
      'Total Royalty', 'Total Royalties', 'Est. KU Royalty', 'Estimated Royalty',
    ))

    const currency = str(pick(row, 'Currency', 'currency')).toUpperCase().trim()
    const isUSD    = currency === 'USD' || currency === ''

    const key = asin || title
    if (!bookMap.has(key)) {
      bookMap.set(key, {
        title, asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0, kenp: 0, royalties: 0,
      })
    }
    const book = bookMap.get(key)!
    book.units     += units
    book.kenp      += kenp
    book.royalties += isUSD ? royalty : 0

    totalKENP         += kenp
    if (isUSD) totalRoyaltiesUSD += royalty
    paidUnits         += units
    rowCount++
  }

  const books      = Array.from(bookMap.values()).sort((a, b) => b.units - a.units)
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)

  // Flat exports don't include a date column — use current month as best guess
  const month = new Date().toISOString().substring(0, 7)

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP,
    books, dailyUnits: [], dailyKENP: [],
    summary: { paidUnits, freeUnits: 0, paperbackUnits: 0 },
    rowCount,
  }
}
