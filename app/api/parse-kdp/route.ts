// app/api/parse-kdp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { logAdminAction } from '@/lib/adminAudit'
import type { KDPData } from '@/types'

export const maxDuration = 60

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

    // Debug: log file info and first 500 bytes to trace format detection issues
    const preview = buffer.slice(0, 500).toString('utf8').replace(/\r\n/g, '\n')
    console.log('[parse-kdp] file:', file.name, '| size:', file.size, 'bytes')
    console.log('[parse-kdp] first 500 bytes:', preview)

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

    if (!data.books || data.books.length === 0) {
      console.error('KDP upload: no rows parsed', { name: file.name })
      return NextResponse.json(
        { error: "No data found in this file. Make sure you're uploading a KDP Sales & Royalties report." },
        { status: 422 }
      )
    }

    try {
      await db.uploadLog.create({
        data: {
          userId:   session.user.id,
          fileType: 'kdp',
          fileName: file.name,
          rowCount: data.books.length,
          status:   'success',
          details:  {},
        },
      })
    } catch (dbErr) {
      console.error('KDP upload: DB write failed:', dbErr)
      return NextResponse.json({ error: 'Upload failed to save. Please try again.' }, { status: 500 })
    }

    // ── Upsert raw per-ASIN+date rows — accumulate across uploads ───────────
    const rawRows = data.rawSaleRows ?? []
    if (rawRows.length > 0) {
      await Promise.all(rawRows.map(row =>
        db.kdpSale.upsert({
          where: { userId_asin_date: { userId: session.user.id, asin: row.asin, date: row.date } },
          update: { units: row.units, kenp: row.kenp, royalties: row.royalties, title: row.title, format: row.format },
          create: {
            userId:    session.user.id,
            asin:      row.asin,
            date:      row.date,
            title:     row.title,
            units:     row.units,
            kenp:      row.kenp,
            royalties: row.royalties,
            format:    row.format,
          },
        })
      ))
      console.log(`KDP upload: upserted ${rawRows.length} rows for month ${data.month}`)
    }

    // ── Read back accumulated totals for this month from DB ────────────────
    const month = data.month
    const [yr, mo] = month.split('-').map(Number)
    const nextMo = mo === 12 ? `${yr + 1}-01` : `${yr}-${String(mo + 1).padStart(2, '0')}`
    const accRows = await db.kdpSale.findMany({
      where: { userId: session.user.id, date: { gte: `${month}-01`, lt: `${nextMo}-01` } },
    })

    // ── Reconstruct accumulated KDPData from DB rows ───────────────────────
    const bookMap        = new Map<string, { asin: string; title: string; units: number; kenp: number; royalties: number; format?: string }>()
    const dailyUnitsMap  = new Map<string, number>()
    const dailyKENPMap   = new Map<string, number>()

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

    const dailyUnits = Array.from(dailyUnitsMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const dailyKENP = Array.from(dailyKENPMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalUnits        = books.reduce((s, b) => s + b.units, 0)
    const totalKENP         = books.reduce((s, b) => s + b.kenp, 0)
    const totalRoyaltiesUSD = books.reduce((s, b) => s + b.royalties, 0)
    const paperbackUnits    = books.filter(b => b.format === 'paperback').reduce((s, b) => s + b.units, 0)
    const paidUnits         = totalUnits - paperbackUnits

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

    // ── Refresh the Analysis record's KDP data so the dashboard reflects this upload ──
    // The dashboard reads from db.analysis, not from kdpSale. Without this, re-uploads
    // update the raw rows but the displayed numbers stay stuck on the previous analysis.
    try {
      const existing = await db.analysis.findFirst({
        where: { userId: session.user.id, month },
      })
      if (existing) {
        const existingData = (existing.data as Record<string, unknown>) ?? {}
        // Spread new KDP data and clear AI-generated fields so the dashboard
        // never shows coaching copy that contradicts the freshly uploaded numbers.
        // The next analyze POST (triggered by OverviewClient) will regenerate them.
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
          data: {
            userId: session.user.id,
            month,
            data: { month, kdp: accumulatedData } as object,
          },
        })
      }
    } catch (dbErr) {
      console.error('KDP upload: failed to refresh analysis record:', dbErr)
    }

    if (session.user.adminImpersonating && session.user.adminRealEmail) {
      logAdminAction(session.user.adminRealEmail, session.user.adminImpersonating, 'upload', {
        filename: file.name,
        rowCount: data.books.length,
        fileType: 'kdp',
      })
    }

    return NextResponse.json({ success: true, data: accumulatedData, rowCount: accumulatedData.books.length })
  } catch (error) {
    console.error('KDP upload: unexpected error:', error)
    return NextResponse.json({ error: 'Failed to parse KDP file. Please try again.' }, { status: 500 })
  }
}
