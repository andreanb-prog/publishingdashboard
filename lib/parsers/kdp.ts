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

// ── Multi-sheet format (standard KDP month-end report) ───────────────────
function parseMultiSheetFormat(workbook: XLSX.WorkBook): KDPData {
  const summarySheet = workbook.Sheets['Summary']
  const summaryData = summarySheet ? XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as any[][] : []

  let month = 'Unknown'
  let totalRoyaltiesUSD = 0
  let paidUnits = 0
  let freeUnits = 0
  let paperbackUnits = 0
  let totalKENP = 0

  if (summaryData.length > 1) {
    const row = summaryData[1]
    if (row) {
      month = String(row[0] || 'Unknown')
      paidUnits = Number(row[1] || 0)
      freeUnits = Number(row[2] || 0)
      paperbackUnits = Number(row[3] || 0)
      totalKENP = Number(row[7] || 0)
      totalRoyaltiesUSD = Number(row[8] || 0)
    }
  }

  const ordersSheet = workbook.Sheets['Orders Processed']
  const ordersData = ordersSheet ? XLSX.utils.sheet_to_json(ordersSheet) as any[] : []

  const kenpSheet = workbook.Sheets['KENP Read']
  const kenpData = kenpSheet ? XLSX.utils.sheet_to_json(kenpSheet) as any[] : []

  const bookMap = new Map<string, BookData>()

  for (const row of ordersData) {
    const asin = String(row['ASIN'] || '')
    const title = String(row['Title'] || '')
    const units = Number(row['Paid Units'] || 0)
    if (!asin) continue
    if (!bookMap.has(asin)) {
      bookMap.set(asin, {
        title, asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0, kenp: 0, royalties: 0,
      })
    }
    bookMap.get(asin)!.units += units
  }

  for (const row of kenpData) {
    const asin = String(row['ASIN'] || '')
    const kenp = Number(row['Kindle Edition Normalized Page (KENP) Read'] || 0)
    if (asin && bookMap.has(asin)) bookMap.get(asin)!.kenp += kenp
  }

  const dailyUnitsMap = new Map<string, number>()
  for (const row of ordersData) {
    const date = String(row['Date'] || '').split('T')[0]
    const units = Number(row['Paid Units'] || 0)
    if (date) dailyUnitsMap.set(date, (dailyUnitsMap.get(date) || 0) + units)
  }

  const dailyKENPMap = new Map<string, number>()
  for (const row of kenpData) {
    const date = String(row['Date'] || '').split('T')[0]
    const kenp = Number(row['Kindle Edition Normalized Page (KENP) Read'] || 0)
    if (date) dailyKENPMap.set(date, (dailyKENPMap.get(date) || 0) + kenp)
  }

  const dailyUnits: DailyData[] = Array.from(dailyUnitsMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyKENP: DailyData[] = Array.from(dailyKENPMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const books = Array.from(bookMap.values()).sort((a, b) => b.units - a.units)
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP,
    books, dailyUnits, dailyKENP,
    summary: { paidUnits, freeUnits, paperbackUnits },
  }
}

// ── Flat format (KDP "By Month" or "By Title" report — single sheet) ─────
function parseFlatFormat(workbook: XLSX.WorkBook): KDPData {
  const sheetName = workbook.SheetNames[0]
  const rows = sheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[] : []

  const bookMap = new Map<string, BookData>()
  let totalKENP = 0
  let totalRoyaltiesUSD = 0
  let paidUnits = 0

  for (const row of rows) {
    const asin  = String(row['ASIN']  || '')
    const title = String(row['Title'] || row['Book Title'] || '')
    if (!asin && !title) continue

    const units    = Number(row['Units Sold']    || row['Net Units Sold'] || row['Paid Units Sold'] || 0)
    const kenp     = Number(row['KENP Read']     || row['KENP Pages Read'] || 0)
    const royalty  = Number(row['Royalty']       || row['Est. KU Royalty'] || row['Total Royalties'] || 0)

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
    book.royalties += royalty

    totalKENP          += kenp
    totalRoyaltiesUSD  += royalty
    paidUnits          += units
  }

  const books      = Array.from(bookMap.values()).sort((a, b) => b.units - a.units)
  const totalUnits = books.reduce((sum, b) => sum + b.units, 0)

  // Flat exports don't include a date column — use current month as best guess
  const month = new Date().toISOString().substring(0, 7)

  return {
    month, totalRoyaltiesUSD, totalUnits, totalKENP,
    books, dailyUnits: [], dailyKENP: [],
    summary: { paidUnits, freeUnits: 0, paperbackUnits: 0 },
  }
}
