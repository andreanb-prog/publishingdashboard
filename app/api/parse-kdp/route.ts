// app/api/parse-kdp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { logAdminAction } from '@/lib/adminAudit'
import type { KDPData } from '@/types'

export const maxDuration = 60

// Shared logic for saving KDP data — called from both parse-kdp and parse-auto
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
  // Also include ebook ASINs in a combined set for KENP/audiobook fallback matching
  const allKnownAsins   = new Set(
    Array.from(ebookAsins).concat(Array.from(paperbackAsins)).concat(Array.from(audiobookAsins))
  )

  // If user has no books registered at all, skip matching entirely and save everything
  const hasBooks = userBooks.length > 0

  let saved = 0
  let skipped = 0

  for (const row of rawRows) {
    const asinUpper = row.asin?.trim().toUpperCase() ?? ''

    // Book matching — skip rows that don't belong to user's catalog
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
          units:            row.units,
          kenp:             row.kenp,
          royalties:        row.royalties,
          title:            row.title,
          isbn:             row.isbn ?? null,
          orderDate:        row.orderDate ? new Date(row.orderDate) : null,
          manufacturingCost: row.manufacturingCost ?? null,
          audiobookAsin:    row.audiobookAsin ?? null,
          audibleAsin:      row.audibleAsin ?? null,
        },
        create: {
          userId,
          asin:            row.asin,
          title:           row.title,
          date:            row.date,
          marketplace:     row.marketplace ?? '',
          format:          row.format ?? 'ebook',
          transactionType: row.transactionType ?? '',
          units:           row.units,
          kenp:            row.kenp,
          royalties:       row.royalties,
          isbn:            row.isbn ?? null,
          orderDate:       row.orderDate ? new Date(row.orderDate) : null,
          manufacturingCost: row.manufacturingCost ?? null,
          audiobookAsin:   row.audiobookAsin ?? null,
          audibleAsin:     row.audibleAsin ?? null,
        },
      })
      saved++
    } catch (err) {
      console.error('[parse-kdp] upsert error:', err, { asin: row.asin, date: row.date, format: row.format })
    }
  }

  return { saved, skipped }
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > 50 * 1024 * 1024) {
      console.error('KDP upload: file too large', { size: file.size, name: file.name })
      return NextResponse.json({ error: 'File too large. Please upload a file under 50MB.' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('[parse-kdp] file:', file.name, '| size:', file.size, 'bytes')

    let data
    try {
      data = parseKDPFile(buffer)
    } catch (parseErr) {
      console.error('KDP upload: unrecognized file format:', parseErr, { name: file.name })
      return NextResponse.json(
        { error: 'Unrecognized file format. Please upload a KDP Sales & Royalties report.' },
        { status: 422 }
      )
    }

    const rawRows = data.rawSaleRows ?? []

    if (rawRows.length === 0 && (!data.books || data.books.length === 0)) {
      console.error('KDP upload: no rows parsed', { name: file.name })
      return NextResponse.json(
        { error: "No data found in this file. Make sure you're uploading a KDP Sales & Royalties report." },
        { status: 422 }
      )
    }

    // Log upload attempt
    try {
      await db.uploadLog.create({
        data: {
          userId:   session.user.id,
          fileType: 'kdp',
          fileName: file.name,
          rowCount: rawRows.length,
          status:   'success',
          details:  {},
        },
      })
    } catch (dbErr) {
      console.error('KDP upload: upload log write failed:', dbErr)
    }

    // Load user's books for matching
    const userBooks = await db.book.findMany({
      where:  { userId: session.user.id },
      select: { asin: true, asinPaperback: true, asinAudiobook: true, isbnPaperback: true, isbnHardcover: true },
    })

    // Save matched rows to DB
    let saved = 0
    let skipped = 0
    if (rawRows.length > 0) {
      const result = await saveKdpDataToDB(session.user.id, rawRows, userBooks)
      saved   = result.saved
      skipped = result.skipped
      console.log(`KDP upload: ${saved} saved, ${skipped} skipped (no book match), ${rawRows.length} parsed`)
    }

    // ── Read back accumulated totals for all months in this file ──────────────
    const months = Array.from(new Set(rawRows.map(r => r.date.substring(0, 7)))).sort()

    // Build accumulated data from the rows we just saved (or from DB for the months covered)
    const month = data.month
    const [yr, mo] = month.split('-').map(Number)
    const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`
    const accRows = await db.kdpSale.findMany({
      where: { userId: session.user.id, date: { gte: `${month}-01`, lt: `${nextMo}-01` } },
    })

    // Reconstruct accumulated KDPData from DB rows
    const bookMap        = new Map<string, { asin: string; title: string; units: number; kenp: number; royalties: number; format: string }>()
    const dailyUnitsMap  = new Map<string, number>()
    const dailyKENPMap   = new Map<string, number>()

    for (const row of accRows) {
      const b = bookMap.get(row.asin)
      if (b) {
        b.units     += row.units
        b.kenp      += row.kenp
        b.royalties += row.royalties
      } else {
        bookMap.set(row.asin, { asin: row.asin, title: row.title, units: row.units, kenp: row.kenp, royalties: row.royalties, format: row.format })
      }
      dailyUnitsMap.set(row.date, (dailyUnitsMap.get(row.date) ?? 0) + row.units)
      dailyKENPMap.set(row.date,  (dailyKENPMap.get(row.date)  ?? 0) + row.kenp)
    }

    const books = Array.from(bookMap.values())
      .sort((a, b) => b.units - a.units)
      .map(b => ({
        ...b,
        shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '...' : b.title,
        format: b.format as 'ebook' | 'paperback' | 'hardcover' | 'audiobook' | 'ku' | undefined,
      }))

    const dailyUnits = Array.from(dailyUnitsMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const dailyKENP = Array.from(dailyKENPMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalUnits        = books.reduce((s, b) => s + b.units, 0)
    const totalKENP         = books.reduce((s, b) => s + b.kenp, 0)
    const totalRoyaltiesUSD = books.reduce((s, b) => s + b.royalties, 0)
    const paperbackUnits    = books.filter(b => b.format === 'paperback' || b.format === 'hardcover').reduce((s, b) => s + b.units, 0)
    const paidUnits         = totalUnits - paperbackUnits

    // Count formats present
    const formatCounts = {
      ebook:     accRows.filter(r => r.format === 'ebook').reduce((s, r) => s + r.units, 0),
      paperback: accRows.filter(r => r.format === 'paperback').reduce((s, r) => s + r.units, 0),
      hardcover: accRows.filter(r => r.format === 'hardcover').reduce((s, r) => s + r.units, 0),
      audiobook: accRows.filter(r => r.format === 'audiobook').reduce((s, r) => s + r.units, 0),
      ku:        accRows.filter(r => r.format === 'ku').reduce((s, r) => s + r.kenp, 0),
    }

    const { rawSaleRows: _stripped, ...baseData } = data
    const accumulatedData: KDPData = {
      ...baseData,
      totalUnits,
      totalKENP,
      totalRoyaltiesUSD,
      books,
      dailyUnits,
      dailyKENP,
      summary: { paidUnits, freeUnits: 0, paperbackUnits },
    }

    console.log(`KDP upload: accumulated totals — ${totalUnits} units, ${totalKENP} KENP, $${totalRoyaltiesUSD.toFixed(2)} royalties`)

    // ── Refresh Analysis record ───────────────────────────────────────────────
    try {
      const existing = await db.analysis.findFirst({ where: { userId: session.user.id, month } })
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
          data: { userId: session.user.id, month, data: { month, kdp: accumulatedData } as object },
        })
      }
    } catch (dbErr) {
      console.error('KDP upload: failed to refresh analysis record:', dbErr)
    }

    if (session.user.adminImpersonating && session.user.adminRealEmail) {
      logAdminAction(session.user.adminRealEmail, session.user.adminImpersonating, 'upload', {
        filename: file.name, rowCount: rawRows.length, fileType: 'kdp',
      })
    }

    // Build human-readable months list for toast
    const monthNames = months.map(m => {
      const [y, mo2] = m.split('-').map(Number)
      return new Date(y, mo2 - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    })
    const formatsPresent = [
      formatCounts.ebook     > 0 ? 'Ebook'     : null,
      formatCounts.paperback > 0 ? 'Paperback'  : null,
      formatCounts.hardcover > 0 ? 'Hardcover'  : null,
      formatCounts.audiobook > 0 ? 'Audiobook'  : null,
      formatCounts.ku        > 0 ? 'KU'         : null,
    ].filter(Boolean) as string[]

    // Determine warning/success status
    let toast: string
    if (saved === 0 && skipped > 0) {
      toast = `File uploaded but no matching books found. Check your ASINs in Settings > My Books.`
    } else {
      const monthPart   = monthNames.join(' + ')
      const formatPart  = formatsPresent.join(', ')
      toast = `Saved ${saved} rows — ${monthPart}${formatPart ? ` · ${formatPart}` : ''}`
    }

    return NextResponse.json({
      success: true,
      data:    accumulatedData,
      rowCount: accumulatedData.books.length,
      parsed:  rawRows.length,
      saved,
      skipped,
      months,
      formats: formatCounts,
      errors:  [],
      toast,
    })
  } catch (error) {
    console.error('KDP upload: unexpected error:', error)
    return NextResponse.json({ error: 'Failed to parse KDP file. Please try again.' }, { status: 500 })
  }
}
