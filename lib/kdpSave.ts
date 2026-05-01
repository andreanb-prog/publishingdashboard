// lib/kdpSave.ts
import { db } from '@/lib/db'
import type { KDPData } from '@/types'

export async function saveKdpDataToDB(
  userId: string,
  rawRows: NonNullable<KDPData['rawSaleRows']>,
  userBooks: { asin: string | null; asinPaperback: string | null; asinAudiobook: string | null; isbnPaperback: string | null; isbnHardcover: string | null }[],
): Promise<{ saved: number; skipped: number }> {
  // Build lookup sets for fast ASIN/ISBN matching
  const ebookAsins      = new Set(userBooks.map(b => b.asin?.trim().toUpperCase()).filter(Boolean) as string[])
  const paperbackAsins  = new Set(userBooks.map(b => b.asinPaperback?.trim().toUpperCase()).filter(Boolean) as string[])
  const audiobookAsins  = new Set(userBooks.map(b => b.asinAudiobook?.trim().toUpperCase()).filter(Boolean) as string[])
  const isbnPaperbacks  = new Set(userBooks.map(b => b.isbnPaperback?.trim()).filter(Boolean) as string[])
  const isbnHardcovers  = new Set(userBooks.map(b => b.isbnHardcover?.trim()).filter(Boolean) as string[])
  const allKnownAsins   = new Set(
    Array.from(ebookAsins).concat(Array.from(paperbackAsins)).concat(Array.from(audiobookAsins))
  )

  const hasBooks = userBooks.length > 0

  let saved = 0
  let skipped = 0

  for (const row of rawRows) {
    const asinUpper = row.asin?.trim().toUpperCase() ?? ''

    if (hasBooks) {
      let matched = false
      if (row.format === 'ebook' || row.format === 'ku') {
        matched = ebookAsins.has(asinUpper) || allKnownAsins.has(asinUpper)
      } else if (row.format === 'paperback') {
        matched = paperbackAsins.has(asinUpper) || ebookAsins.has(asinUpper) ||
          (row.isbn ? isbnPaperbacks.has(row.isbn.trim()) : false)
      } else if (row.format === 'hardcover') {
        matched = ebookAsins.has(asinUpper) ||
          (row.isbn ? isbnHardcovers.has(row.isbn.trim()) : false)
      } else if (row.format === 'audiobook') {
        matched = audiobookAsins.has(asinUpper) || ebookAsins.has(asinUpper)
      } else {
        matched = allKnownAsins.has(asinUpper) || ebookAsins.has(asinUpper)
      }
      if (!matched) { skipped++; continue }
    }

    try {
      await db.kdpSale.upsert({
        where: {
          userId_asin_date_marketplace_format_transactionType: {
            userId,
            asin:            row.asin,
            date:            row.date,
            marketplace:     row.marketplace ?? '',
            format:          row.format ?? 'ebook',
            transactionType: row.transactionType ?? '',
          },
        },
        update: {
          units:             row.units,
          kenp:              row.kenp,
          royalties:         row.royalties,
          title:             row.title,
          isbn:              row.isbn ?? null,
          orderDate:         row.orderDate ? new Date(row.orderDate) : null,
          manufacturingCost: row.manufacturingCost ?? null,
          audiobookAsin:     row.audiobookAsin ?? null,
          audibleAsin:       row.audibleAsin ?? null,
        },
        create: {
          userId,
          asin:              row.asin,
          title:             row.title,
          date:              row.date,
          marketplace:       row.marketplace ?? '',
          format:            row.format ?? 'ebook',
          transactionType:   row.transactionType ?? '',
          units:             row.units,
          kenp:              row.kenp,
          royalties:         row.royalties,
          isbn:              row.isbn ?? null,
          orderDate:         row.orderDate ? new Date(row.orderDate) : null,
          manufacturingCost: row.manufacturingCost ?? null,
          audiobookAsin:     row.audiobookAsin ?? null,
          audibleAsin:       row.audibleAsin ?? null,
        },
      })
      saved++
    } catch (err) {
      console.error('[kdpSave] upsert error:', err, { asin: row.asin, date: row.date, format: row.format })
    }
  }

  return { saved, skipped }
}
