// lib/parsers/kdp.ts
import * as XLSX from 'xlsx'
import type { KDPData, BookData, DailyData, ParseDiagnostics } from '@/types'

export function parseKDPFile(buffer: Uint8Array | ArrayBuffer): KDPData {
  const workbook = XLSX.read(buffer, {
    type: buffer instanceof ArrayBuffer ? 'buffer' : 'array',
    cellDates: true,
  })

  // ── Format detection ─────────────────────────────────────────────────────
  // Three known formats:
  //   Dashboard XLSX: sheets include "Combined Sales" (KDP Sales Dashboard download)
  //   Legacy XLSX:    sheets include "Orders Processed" or "KENP Read" (old month-end report)
  //   Flat CSV/XLSX:  single sheet with column headers (Royalty Estimator / All Titles)

  const sheetNames = workbook.SheetNames

  // Distinguish KDP Sales Dashboard (has "Paperback Royalty") from
  // KDP Royalties Estimator (has "Combined Sales" + "Orders Processed" but no "Paperback Royalty")
  if (sheetNames.includes('Combined Sales')) {
    if (sheetNames.includes('Paperback Royalty')) {
      console.log('[KDP parser] Detected: KDP Sales Dashboard XLSX format')
      return parseDashboardFormat(workbook)
    }
    console.log('[KDP parser] Detected: KDP Royalties Estimator XLSX format')
    return parseRoyaltiesEstimatorFormat(workbook)
  }

  // Legacy multi-sheet XLSX
  if (sheetNames.some(n => n === 'Orders Processed' || n === 'KENP Read')) {
    console.log('[KDP parser] Detected: Legacy multi-sheet XLSX format')
    return parseMultiSheetFormat(workbook)
  }

  // Wrong format: Prior Month Royalties — A1 = "Sales Period"
  const firstSheet = workbook.Sheets[sheetNames[0]]
  if (firstSheet) {
    const a1 = firstSheet['A1']?.v
    const a1str = typeof a1 === 'string' ? a1.toLowerCase().trim() : ''
    if (a1str === 'sales period') {
      const b1 = firstSheet['B1']?.v ?? ''
      throw new Error(
        `This looks like a Prior Month Royalties report (${b1}). AuthorDash needs the KDP Sales Dashboard XLSX instead. Here's how to get it:\n` +
        `1. Go to KDP → Reports → Sales Dashboard\n` +
        `2. Click 'Download Report' in the top right\n` +
        `3. Select your date range and download the XLSX`
      )
    }
  }

  // Flat single-sheet format
  console.log('[KDP parser] Detected: Flat single-sheet format')
  return parseFlatFormat(workbook)
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
 * Returns true if the string looks like a real ASIN (B0…) rather than an ISBN.
 * ISBNs are 10 or 13 digits (optionally hyphenated), typically starting with 978/979.
 * Paperback rows in KDP Dashboard XLSX often have an ISBN in the ASIN/ISBN column.
 */
function isRealAsin(asin: string): boolean {
  if (!asin) return false
  const s = asin.replace(/-/g, '').trim()
  if (/^97[89]\d{10}$/.test(s)) return false  // ISBN-13
  if (/^\d{9}[\dX]$/i.test(s)) return false   // ISBN-10
  if (/^\d{10,}$/.test(s)) return false        // long numeric = likely ISBN variant
  return s.length > 0
}

/**
 * Deduplicate a books array by normalized title.
 * Using title as the canonical key ensures that ebook (ASIN) and paperback (ISBN)
 * rows for the same book always merge — even when the KDP Dashboard XLSX stores
 * different identifiers per sheet. After merging, the entry is upgraded to use the
 * real ASIN (not an ISBN) if one is available.
 */
function deduplicateBooks(books: BookData[]): BookData[] {
  const seen = new Map<string, BookData>()
  for (const book of books) {
    const titleKey = book.title.toLowerCase().trim()
    if (!titleKey) continue
    if (seen.has(titleKey)) {
      const existing = seen.get(titleKey)!
      existing.units     += book.units
      existing.kenp      += book.kenp
      existing.royalties += book.royalties
      // Upgrade to real ASIN if the current entry only has an ISBN or no ASIN
      if (book.asin && isRealAsin(book.asin) && (!existing.asin || !isRealAsin(existing.asin))) {
        existing.asin       = book.asin
        existing.shortTitle = book.shortTitle
      }
    } else {
      seen.set(titleKey, { ...book })
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.units - a.units)
}

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

// ── sheetToRows: handles KDP sheets that have a banner/title row before the
//   real column-header row.  sheet_to_json() uses row-0 as keys by default;
//   if those keys don't look like column headers (no ASIN/Title/Date/Units),
//   we scan the raw rows to find the actual header row and rebuild the objects.
function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]

  // Quick check: does at least one row have a recognisable data column?
  const HEADER_SIGNALS = ['asin', 'title', 'units', 'kenp', 'royalt', 'date']
  const hasDataColumns = (r: Record<string, unknown>) =>
    Object.keys(r).some(k => HEADER_SIGNALS.some(s => k.toLowerCase().includes(s)))

  if (rows.some(hasDataColumns)) return rows

  // Fall back: scan raw rows for the real header row (first 10 rows)
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
  let headerIdx = -1
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const cells = (raw[i] ?? []).map(c => String(c ?? '').toLowerCase())
    if (cells.some(c => c.includes('asin') || c.includes('title') || c.includes('royalty date'))) {
      headerIdx = i
      break
    }
  }

  if (headerIdx < 0) {
    console.warn('[KDP parser] Could not detect header row — falling back to sheet_to_json default')
    return rows
  }

  const headers = (raw[headerIdx] ?? []).map(c => String(c ?? '').trim())
  console.log(`[KDP parser] Real header row found at index ${headerIdx}:`, headers)

  return raw.slice(headerIdx + 1)
    .filter(row => (row ?? []).some(c => c !== null && c !== undefined && c !== ''))
    .map(row => {
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { if (h) obj[h] = (row as unknown[])[i] ?? '' })
      return obj
    })
}

// ── parseCombinedSalesSheet: reads "Combined Sales" using raw column indices ──
// The royalty amount column has NO header name — it must be accessed by position
// (second-to-last column, equivalent to pandas iloc[:, -2]).
interface CombinedSalesRow {
  asin: string; title: string; date: string
  units: number; royalties: number; currency: string
}

interface CombinedSalesMeta {
  headersFound: string[]
  strategiesUsed: string[]
  skippedCount: number
  firstRow: CombinedSalesRow | null
}

function parseCombinedSalesSheet(sheet: XLSX.WorkSheet): { rows: CombinedSalesRow[]; meta: CombinedSalesMeta } {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
  const strategiesUsed: string[] = []

  // ── Strategy 4: Banner row scan — check rows 0–10 for real header ──────────
  let headerIdx = -1
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const cells = (raw[i] ?? []).map(c => String(c ?? '').toLowerCase().trim())
    if (cells.some(c => c === 'royalty date' || c === 'title' || c.includes('asin'))) {
      headerIdx = i
      break
    }
  }

  if (headerIdx < 0) {
    console.warn('[KDP parser] Combined Sales: could not find header row in first 10 rows')
    strategiesUsed.push('S4-banner-scan:failed')
    return { rows: [], meta: { headersFound: [], strategiesUsed, skippedCount: 0, firstRow: null } }
  }

  if (headerIdx > 0) {
    strategiesUsed.push(`S4-banner-scan:header-at-row-${headerIdx}`)
    console.log(`[KDP parser] Combined Sales — Strategy 4 succeeded: banner row at index ${headerIdx}`)
  } else {
    strategiesUsed.push('S1-direct-header:row-0')
  }

  const headers   = (raw[headerIdx] ?? []).map(c => String(c ?? '').trim())
  const totalCols = headers.length

  // ── Strategy 1: Exact column name match ─────────────────────────────────────
  let iDate  = headers.findIndex(h => h.toLowerCase() === 'royalty date')
  let iTitle = headers.findIndex(h => h.toLowerCase() === 'title')
  let iAsin  = headers.findIndex(h => h.toLowerCase() === 'asin/isbn')
  let iUnits = headers.findIndex(h => h.toLowerCase() === 'net units sold')

  // ── Strategy 2: Fuzzy case-insensitive partial match ────────────────────────
  if (iDate  < 0) { iDate  = headers.findIndex(h => h.toLowerCase().includes('royalty date') || h.toLowerCase().includes('date')); if (iDate  >= 0) strategiesUsed.push('S2-fuzzy:date') }
  if (iAsin  < 0) { iAsin  = headers.findIndex(h => h.toLowerCase().includes('asin'));          if (iAsin  >= 0) strategiesUsed.push('S2-fuzzy:asin')  }
  if (iUnits < 0) { iUnits = headers.findIndex(h => h.toLowerCase().includes('units sold') || h.toLowerCase().includes('units')); if (iUnits >= 0) strategiesUsed.push('S2-fuzzy:units') }

  if (iDate  >= 0 && !strategiesUsed.some(s => s.includes('date')))  strategiesUsed.push('S1-exact:date')
  if (iAsin  >= 0 && !strategiesUsed.some(s => s.includes('asin')))  strategiesUsed.push('S1-exact:asin')
  if (iUnits >= 0 && !strategiesUsed.some(s => s.includes('units'))) strategiesUsed.push('S1-exact:units')

  // ── Strategy 3: Positional fallback — royalty = iloc -2, currency = iloc -1 ─
  const iRoyalty  = totalCols - 2  // unnamed royalty column
  const iCurrency = totalCols - 1  // Royalty Currency is last column
  strategiesUsed.push('S3-positional:royalty=iloc[-2],currency=iloc[-1]')

  console.log(`[KDP parser] Combined Sales header row at index ${headerIdx}, ${totalCols} cols`)
  console.log(`[KDP parser] Combined Sales col map — date:${iDate} asin:${iAsin} title:${iTitle} units:${iUnits} royalty(unnamed):${iRoyalty} currency:${iCurrency}`)
  console.log(`[KDP parser] Combined Sales strategies: ${strategiesUsed.join(' | ')}`)

  const results: CombinedSalesRow[] = []
  let skippedCount = 0
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i] as unknown[]
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue

    const asin  = str(iAsin  >= 0 ? row[iAsin]  : '')
    const title = str(iTitle >= 0 ? row[iTitle] : '')
    if (!asin && !title) { skippedCount++; continue }

    results.push({
      asin,
      title,
      date:      toISODate(iDate >= 0 ? row[iDate] : ''),
      units:     num(iUnits >= 0 ? row[iUnits] : 0),
      royalties: num(row[iRoyalty]),
      currency:  str(iCurrency >= 0 ? row[iCurrency] : '').toUpperCase().trim(),
    })
  }

  console.log(`[KDP parser] Combined Sales: ${results.length} data rows parsed, ${skippedCount} skipped`)

  const firstRow = results[0] ?? null
  return {
    rows: results,
    meta: {
      headersFound: headers,
      strategiesUsed,
      skippedCount,
      firstRow,
    },
  }
}

// ── KDP Dashboard XLSX format (Combined Sales + KENP Read + Paperback Royalty) ─
function parseDashboardFormat(workbook: XLSX.WorkBook): KDPData {
  const sheetsFound = workbook.SheetNames

  // ── Combined Sales sheet — use raw-array parser (unnamed royalty column) ──
  const combinedSheet  = workbook.Sheets['Combined Sales']
  const combinedResult = combinedSheet
    ? parseCombinedSalesSheet(combinedSheet)
    : { rows: [], meta: { headersFound: [], strategiesUsed: [], skippedCount: 0, firstRow: null } }
  const combinedData = combinedResult.rows
  const combinedMeta = combinedResult.meta

  // ── Paperback Royalty sheet ───────────────────────────────────────────────
  const paperbackSheet = workbook.Sheets['Paperback Royalty']
  const paperbackData  = paperbackSheet ? sheetToRows(paperbackSheet) : []

  // ── KENP Read sheet ───────────────────────────────────────────────────────
  const kenpSheet = workbook.Sheets['KENP Read']
  const kenpData  = kenpSheet ? sheetToRows(kenpSheet) : []

  console.log(`[KDP parser] Sheet row counts — Combined Sales: ${combinedData.length}, Paperback Royalty: ${paperbackData.length}, KENP Read: ${kenpData.length}`)
  if (paperbackData.length) console.log('[KDP parser] Paperback Royalty headers:', Object.keys(paperbackData[0]))
  if (kenpData.length)      console.log('[KDP parser] KENP Read headers:', Object.keys(kenpData[0]))

  const bookMap = new Map<string, BookData>()
  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()
  let totalRoyaltiesUSD = 0
  let paidUnits = 0
  let paperbackUnits = 0

  // ── Parse Combined Sales (ebooks) ─────────────────────────────────────────
  for (const row of combinedData) {
    const { asin, title, date, units, royalties: royalty, currency } = row
    const isUSD = currency === 'USD' || currency === ''

    const key = asin || title
    if (!bookMap.has(key)) {
      bookMap.set(key, {
        title, asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0, kenp: 0, royalties: 0,
        format: 'ebook',
      })
    }
    bookMap.get(key)!.units     += units
    bookMap.get(key)!.royalties += isUSD ? royalty : 0

    if (isUSD) totalRoyaltiesUSD += royalty
    paidUnits += units

    if (date) dailyUnitsMap.set(date, (dailyUnitsMap.get(date) ?? 0) + units)
  }

  // ── Parse Paperback Royalty ───────────────────────────────────────────────
  for (const row of paperbackData) {
    const asin     = str(pick(row, 'ASIN/ISBN', 'ASIN', 'ISBN'))
    const title    = str(pick(row, 'Title'))
    const units    = num(pick(row, 'Net Units Sold'))
    const royalty  = num(pick(row, 'Royalty (USD)', 'Royalties (USD)', 'Net Royalty', 'Net Royalties', 'Royalty'))
    const currency = str(pick(row, 'Royalty Currency', 'Currency')).toUpperCase().trim()
    const date     = toISODate(pick(row, 'Royalty Date', 'Date'))
    const isUSD    = currency === 'USD' || currency === ''

    if (!asin && !title) continue

    const key = asin || title
    if (!bookMap.has(key)) {
      bookMap.set(key, {
        title, asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0, kenp: 0, royalties: 0,
        format: 'paperback',
      })
    }
    bookMap.get(key)!.units     += units
    bookMap.get(key)!.royalties += isUSD ? royalty : 0

    if (isUSD) totalRoyaltiesUSD += royalty
    paperbackUnits += units

    if (date) dailyUnitsMap.set(date, (dailyUnitsMap.get(date) ?? 0) + units)
  }

  // ── Parse KENP Read ───────────────────────────────────────────────────────
  // Build a normalized ASIN lookup map (trimmed, uppercase) to handle
  // whitespace or case mismatches between KENP sheet and Combined Sales sheet.
  const normalizedBookMap = new Map<string, BookData>(
    Array.from(bookMap.entries()).map(([key, book]) => [key.trim().toUpperCase(), book])
  )
  // Also build a title-based fallback map for when ASINs don't match at all
  const titleBookMap = new Map<string, BookData>(
    Array.from(bookMap.values())
      .filter(book => !!book.title)
      .map(book => [book.title.toLowerCase().trim(), book])
  )

  let totalKENP = 0
  for (const row of kenpData) {
    const rawAsin = str(pick(row, 'ASIN', 'Asin'))
    const asin = rawAsin.trim().toUpperCase()
    const title = str(pick(row, 'Title', 'title')).toLowerCase().trim()
    const kenp = num(pick(row,
      'Kindle Edition Normalized Page (KENP) Read',
      'KENP Read', 'KENP Pages Read', 'Pages Read', 'KENP',
    ))
    const date = toISODate(pick(row, 'Date'))

    // Try normalized ASIN first, then title fallback
    const book = (asin && normalizedBookMap.get(asin))
      || (title && titleBookMap.get(title))
      || null
    if (book) book.kenp += kenp

    totalKENP += kenp
    if (date) dailyKENPMap.set(date, (dailyKENPMap.get(date) ?? 0) + kenp)
  }

  // ── Derive month from first date in Combined Sales ────────────────────────
  const firstDate = combinedData[0]?.date ?? ''
  const month = firstDate ? firstDate.substring(0, 7) : new Date().toISOString().substring(0, 7)

  const books      = deduplicateBooks(Array.from(bookMap.values()))
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)
  const kenpFromBooks = books.reduce((sum, b) => sum + b.kenp, 0)
  const resolvedKENP  = kenpFromBooks > totalKENP ? kenpFromBooks : totalKENP

  const dailyUnits: DailyData[] = Array.from(dailyUnitsMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyKENP: DailyData[] = Array.from(dailyKENPMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Build diagnostics ─────────────────────────────────────────────────────
  const skipReasons: string[] = []
  if (combinedMeta.skippedCount > 0) skipReasons.push('Missing ASIN and title')
  const diagnostics: ParseDiagnostics = {
    rowCount:        combinedData.length,
    sheetsFound,
    sheetUsed:       'Combined Sales',
    columnsDetected: combinedMeta.headersFound,
    skippedRows:     combinedMeta.skippedCount,
    skipReasons,
    firstParsedRow:  combinedMeta.firstRow ? { ...combinedMeta.firstRow } as Record<string, unknown> : null,
    error:           combinedData.length === 0 ? 'No data rows found in Combined Sales sheet' : null,
    strategyUsed:    combinedMeta.strategiesUsed.join(' | '),
  }

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP: resolvedKENP,
    books, dailyUnits, dailyKENP,
    rowCount: combinedData.length,
    diagnostics,
    summary: { paidUnits, freeUnits: 0, paperbackUnits },
  }
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

  const books      = deduplicateBooks(Array.from(bookMap.values()))
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)

  // Prefer per-book KENP sum (from named columns in KENP sheet) over the Summary
  // row value, which can point to a rate column instead of the count column.
  const kenpFromBooks = books.reduce((sum, b) => sum + b.kenp, 0)
  const resolvedKENP  = kenpFromBooks > totalKENP ? kenpFromBooks : totalKENP

  const ordersHeaders = ordersData.length > 0 ? Object.keys(ordersData[0]) : []
  const diagnostics: ParseDiagnostics = {
    rowCount:        ordersData.length,
    sheetsFound:     workbook.SheetNames,
    sheetUsed:       ordersSheetName ?? 'Orders Processed',
    columnsDetected: ordersHeaders,
    skippedRows:     0,
    skipReasons:     [],
    firstParsedRow:  ordersData[0] ? { ...ordersData[0] } as Record<string, unknown> : null,
    error:           ordersData.length === 0 ? 'No data rows found in orders sheet' : null,
    strategyUsed:    'S1-exact | S2-fuzzy via pick()',
  }

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP: resolvedKENP,
    books, dailyUnits, dailyKENP,
    rowCount: ordersData.length,
    diagnostics,
    summary: { paidUnits, freeUnits, paperbackUnits },
  }
}

// ── KDP Royalties Estimator XLSX (Combined Sales + KENP Read, no Paperback Royalty) ──
function parseRoyaltiesEstimatorFormat(workbook: XLSX.WorkBook): KDPData {
  const sheetsFound = workbook.SheetNames

  // Combined Sales — reuse existing raw-array parser (handles named + positional royalty column)
  const combinedSheet  = workbook.Sheets['Combined Sales']
  const combinedResult = combinedSheet
    ? parseCombinedSalesSheet(combinedSheet)
    : { rows: [], meta: { headersFound: [], strategiesUsed: [], skippedCount: 0, firstRow: null } }
  const combinedData = combinedResult.rows
  const combinedMeta = combinedResult.meta

  // KENP Read sheet
  const kenpSheet = workbook.Sheets['KENP Read']
  const kenpData  = kenpSheet ? sheetToRows(kenpSheet) : []

  console.log(`[KDP parser] Royalties Estimator — Combined Sales: ${combinedData.length}, KENP Read: ${kenpData.length}`)
  if (kenpData.length) console.log('[KDP parser] Royalties Estimator KENP headers:', Object.keys(kenpData[0]))

  const bookMap       = new Map<string, BookData>()
  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()
  let totalRoyaltiesUSD = 0
  let paidUnits = 0

  // Parse Combined Sales — USD rows only for royalties
  for (const row of combinedData) {
    const { asin, title, date, units, royalties: royalty, currency } = row
    const isUSD = currency === 'USD' || currency === ''

    const key = asin || title
    if (!key) continue
    if (!bookMap.has(key)) {
      bookMap.set(key, {
        title, asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0, kenp: 0, royalties: 0,
        format: 'ebook',
      })
    }
    bookMap.get(key)!.units     += units
    bookMap.get(key)!.royalties += isUSD ? royalty : 0

    if (isUSD) totalRoyaltiesUSD += royalty
    paidUnits += units

    if (date) dailyUnitsMap.set(date, (dailyUnitsMap.get(date) ?? 0) + units)
  }

  // Build normalized lookup maps for KENP matching
  const normalizedBookMap = new Map<string, BookData>(
    Array.from(bookMap.entries()).map(([key, book]) => [key.trim().toUpperCase(), book])
  )
  const titleBookMap = new Map<string, BookData>(
    Array.from(bookMap.values())
      .filter(book => !!book.title)
      .map(book => [book.title.toLowerCase().trim(), book])
  )

  let totalKENP = 0
  for (const row of kenpData) {
    const rawAsin = str(pick(row, 'ASIN', 'Asin'))
    const asin    = rawAsin.trim().toUpperCase()
    const title   = str(pick(row, 'Title', 'title')).toLowerCase().trim()
    const kenp    = num(pick(row,
      'Kindle Edition Normalized Page (KENP) Read',
      'KENP Read', 'KENP Pages Read', 'Pages Read', 'KENP',
    ))
    const date = toISODate(pick(row, 'Date'))

    const book = (asin && normalizedBookMap.get(asin))
      || (title && titleBookMap.get(title))
      || null
    if (book) book.kenp += kenp

    totalKENP += kenp
    if (date) dailyKENPMap.set(date, (dailyKENPMap.get(date) ?? 0) + kenp)
  }

  const firstDate = combinedData[0]?.date ?? ''
  const month = firstDate ? firstDate.substring(0, 7) : new Date().toISOString().substring(0, 7)

  const books         = deduplicateBooks(Array.from(bookMap.values()))
  const totalUnits    = books.reduce((sum, b) => sum + b.units, 0)
  const kenpFromBooks = books.reduce((sum, b) => sum + b.kenp, 0)
  const resolvedKENP  = kenpFromBooks > totalKENP ? kenpFromBooks : totalKENP

  const dailyUnits: DailyData[] = Array.from(dailyUnitsMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyKENP: DailyData[] = Array.from(dailyKENPMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const skipReasons: string[] = []
  if (combinedMeta.skippedCount > 0) skipReasons.push('Missing ASIN and title')
  const diagnostics: ParseDiagnostics = {
    rowCount:        combinedData.length,
    sheetsFound,
    sheetUsed:       'Combined Sales',
    columnsDetected: combinedMeta.headersFound,
    skippedRows:     combinedMeta.skippedCount,
    skipReasons,
    firstParsedRow:  combinedMeta.firstRow ? { ...combinedMeta.firstRow } as Record<string, unknown> : null,
    error:           combinedData.length === 0 ? 'No data rows found in Combined Sales sheet' : null,
    strategyUsed:    combinedMeta.strategiesUsed.join(' | '),
  }

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP: resolvedKENP,
    books, dailyUnits, dailyKENP,
    rowCount: combinedData.length,
    diagnostics,
    summary: { paidUnits, freeUnits: 0, paperbackUnits: 0 },
  }
}

// ── Flat format (KDP "By Month" or "By Title" report — single sheet) ─────────
function parseFlatFormat(workbook: XLSX.WorkBook): KDPData {
  const sheetName = workbook.SheetNames[0]
  const rows = sheetName
    ? (XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[])
    : []

  if (rows.length) {
    console.log('[KDP parser] Flat headers:', Object.keys(rows[0]))
    // Check for correct headers but no sales data
    const headers = Object.keys(rows[0]).map(h => h.toLowerCase())
    const hasCorrectHeaders = headers.some(h => h.includes('asin') || h.includes('title'))
    if (hasCorrectHeaders && rows.every(r => {
      const asin  = str(pick(r as Record<string, unknown>, 'ASIN', 'Asin', 'asin'))
      const title = str(pick(r as Record<string, unknown>, 'Title', 'Book Title', 'title'))
      return !asin && !title
    })) {
      throw new Error(
        'Your file has the right format but no sales data. Make sure you selected a date range with sales activity.'
      )
    }
  }

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

  const books      = deduplicateBooks(Array.from(bookMap.values()))
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)

  // Flat exports don't include a date column — use current month as best guess
  const month = new Date().toISOString().substring(0, 7)

  const flatHeaders = rows.length > 0 ? Object.keys(rows[0]) : []
  const diagnostics: ParseDiagnostics = {
    rowCount,
    sheetsFound:     workbook.SheetNames,
    sheetUsed:       sheetName ?? workbook.SheetNames[0],
    columnsDetected: flatHeaders,
    skippedRows:     rows.length - rowCount,
    skipReasons:     rows.length - rowCount > 0 ? ['Missing ASIN and title'] : [],
    firstParsedRow:  rows[0] ? { ...rows[0] } as Record<string, unknown> : null,
    error:           rowCount === 0 ? 'No rows with valid ASIN or title found' : null,
    strategyUsed:    'S1-exact | S2-fuzzy via pick()',
  }

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP,
    books, dailyUnits: [], dailyKENP: [],
    summary: { paidUnits, freeUnits: 0, paperbackUnits: 0 },
    rowCount,
    diagnostics,
  }
}
