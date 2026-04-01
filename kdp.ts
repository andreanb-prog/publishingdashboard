// lib/parsers/kdp.ts
import * as XLSX from 'xlsx'
import type { KDPData, BookData, DailyData } from '@/types'

export function parseKDPFile(buffer: Buffer): KDPData {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  // Parse Summary sheet
  const summarySheet = workbook.Sheets['Summary']
  const summaryData = summarySheet ? XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as any[][] : []

  let month = 'Unknown'
  let totalRoyaltiesUSD = 0
  let paidUnits = 0
  let freeUnits = 0
  let paperbackUnits = 0
  let totalKENP = 0

  if (summaryData.length > 1) {
    const headers = summaryData[0]
    const row = summaryData[1]
    if (row) {
      month = String(row[0] || 'Unknown')
      paidUnits = Number(row[1] || 0)
      freeUnits = Number(row[2] || 0)
      paperbackUnits = Number(row[3] || 0)
      totalKENP = Number(row[7] || 0) // KENP Read column
      totalRoyaltiesUSD = Number(row[8] || 0) // Royalty USD column
    }
  }

  // Parse Orders Processed sheet for daily/book data
  const ordersSheet = workbook.Sheets['Orders Processed']
  const ordersData = ordersSheet ? XLSX.utils.sheet_to_json(ordersSheet) as any[] : []

  // Parse KENP Read sheet
  const kenpSheet = workbook.Sheets['KENP Read']
  const kenpData = kenpSheet ? XLSX.utils.sheet_to_json(kenpSheet) as any[] : []

  // Aggregate by book
  const bookMap = new Map<string, BookData>()

  for (const row of ordersData) {
    const asin = String(row['ASIN'] || '')
    const title = String(row['Title'] || '')
    const units = Number(row['Paid Units'] || 0)

    if (!asin) continue

    if (!bookMap.has(asin)) {
      bookMap.set(asin, {
        title,
        asin,
        shortTitle: title.length > 35 ? title.substring(0, 35) + '...' : title,
        units: 0,
        kenp: 0,
        royalties: 0,
      })
    }
    const book = bookMap.get(asin)!
    book.units += units
  }

  // Add KENP data to books
  for (const row of kenpData) {
    const asin = String(row['ASIN'] || '')
    const kenp = Number(row['Kindle Edition Normalized Page (KENP) Read'] || 0)
    if (asin && bookMap.has(asin)) {
      bookMap.get(asin)!.kenp += kenp
    }
  }

  // Build daily units
  const dailyUnitsMap = new Map<string, number>()
  for (const row of ordersData) {
    const date = String(row['Date'] || '').split('T')[0]
    const units = Number(row['Paid Units'] || 0)
    if (date) {
      dailyUnitsMap.set(date, (dailyUnitsMap.get(date) || 0) + units)
    }
  }

  // Build daily KENP
  const dailyKENPMap = new Map<string, number>()
  for (const row of kenpData) {
    const date = String(row['Date'] || '').split('T')[0]
    const kenp = Number(row['Kindle Edition Normalized Page (KENP) Read'] || 0)
    if (date) {
      dailyKENPMap.set(date, (dailyKENPMap.get(date) || 0) + kenp)
    }
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
    month,
    totalRoyaltiesUSD,
    totalUnits,
    totalKENP,
    books,
    dailyUnits,
    dailyKENP,
    summary: { paidUnits, freeUnits, paperbackUnits },
  }
}
