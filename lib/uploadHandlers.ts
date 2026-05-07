// lib/uploadHandlers.ts
import { db } from '@/lib/db'
import { parseKDPFile } from '@/lib/parsers/kdp'
import type { KDPData, KdpRawRow } from '@/types'

export interface KDPUploadResult {
  accumulatedData: KDPData
  rawRowCount: number
  diagnostics: KDPData['diagnostics'] | undefined
  summary: string
}

export async function handleKDPUpload(
  userId: string,
  buffer: Buffer,
  fileName: string,
): Promise<KDPUploadResult> {
  // 1. Parse
  const data = parseKDPFile(buffer)

  if (!data.books || data.books.length === 0) {
    throw new Error("No data found in this file. Make sure you're uploading a KDP Sales & Royalties report.")
  }

  // 2. Log upload
  await db.uploadLog.create({
    data: { userId, fileType: 'kdp', fileName, rowCount: data.books.length, status: 'success', details: {} },
  })

  // 3. Upsert raw per-ASIN+date rows — accumulate across uploads
  const rawRows = (data.rawSaleRows ?? []) as KdpRawRow[]
  if (rawRows.length > 0) {
    await Promise.all(rawRows.map(row =>
      db.kdpSale.upsert({
        where: { userId_asin_date: { userId, asin: row.asin, date: row.date } },
        update: { units: row.units, kenp: row.kenp, royalties: row.royalties, title: row.title, format: row.format },
        create: { userId, asin: row.asin, date: row.date, title: row.title, units: row.units, kenp: row.kenp, royalties: row.royalties, format: row.format },
      })
    ))
    console.log(`[handleKDPUpload] upserted ${rawRows.length} rows for month ${data.month}`)
  }

  // 4. Read back accumulated totals for this month from DB
  const month = data.month
  const [yr, mo] = month.split('-').map(Number)
  const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`
  const accRows = await db.kdpSale.findMany({
    where: { userId, date: { gte: `${month}-01`, lt: `${nextMo}-01` } },
  })

  // 5. Reconstruct accumulated KDPData from DB rows
  const bookMap       = new Map<string, { asin: string; title: string; units: number; kenp: number; royalties: number; format?: string }>()
  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()

  for (const row of accRows) {
    const b = bookMap.get(row.asin)
    if (b) {
      b.units     += row.units
      b.kenp      += row.kenp
      b.royalties += row.royalties
    } else {
      bookMap.set(row.asin, { asin: row.asin, title: row.title, units: row.units, kenp: row.kenp, royalties: row.royalties, format: row.format ?? undefined })
    }
    dailyUnitsMap.set(row.date, (dailyUnitsMap.get(row.date) ?? 0) + row.units)
    dailyKENPMap.set(row.date,  (dailyKENPMap.get(row.date) ?? 0) + row.kenp)
  }

  const books = Array.from(bookMap.values())
    .sort((a, b) => b.units - a.units)
    .map(b => ({ ...b, shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '...' : b.title, format: b.format as 'ebook' | 'paperback' | undefined }))

  const dailyUnits = Array.from(dailyUnitsMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))
  const dailyKENP  = Array.from(dailyKENPMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date))

  const totalUnits        = books.reduce((s, b) => s + b.units, 0)
  const totalKENP         = books.reduce((s, b) => s + b.kenp,  0)
  const totalRoyaltiesUSD = books.reduce((s, b) => s + b.royalties, 0)
  const paperbackUnits    = books.filter(b => b.format === 'paperback').reduce((s, b) => s + b.units, 0)

  const { rawSaleRows: _stripped, ...baseData } = data
  const accumulatedData: KDPData = {
    ...baseData,
    totalUnits, totalKENP, totalRoyaltiesUSD, books, dailyUnits, dailyKENP,
    summary: { paidUnits: totalUnits - paperbackUnits, freeUnits: 0, paperbackUnits },
  }

  // 6. Create or update db.analysis for this month
  try {
    const existing = await db.analysis.findFirst({ where: { userId, month } })
    if (existing) {
      const existingData = (existing.data as Record<string, unknown>) ?? {}
      const {
        storySentence: _ss, actionPlan: _ap, channelScores: _cs,
        insights: _ins, fingerprint: _fp, kdpCoach: _kc,
        metaCoach: _mc, emailCoach: _ec, pinterestCoach: _pc,
        swapsCoach: _sc, overallVerdict: _ov, confidenceNote: _cn,
        ...preservedData
      } = existingData
      await db.analysis.update({
        where: { id: existing.id },
        data: { data: { ...preservedData, kdp: accumulatedData } as object },
      })
    } else {
      await db.analysis.create({
        data: { userId, month, data: { month, kdp: accumulatedData } as object },
      })
      console.log(`[handleKDPUpload] New record created — userId: ${userId}, period: ${month}, rows: ${rawRows.length}`)
    }
  } catch (dbErr) {
    console.error('[handleKDPUpload] Failed to refresh analysis record:', dbErr)
  }

  return {
    accumulatedData,
    rawRowCount: rawRows.length,
    diagnostics: data.diagnostics,
    summary: `${totalUnits} units · ${totalKENP?.toLocaleString()} KENP · $${totalRoyaltiesUSD.toFixed(2)} royalties`,
  }
}
