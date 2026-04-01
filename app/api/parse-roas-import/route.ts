// app/api/parse-roas-import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

const CUTOFF_DAYS = 21

function findKey(obj: Record<string, any>, candidates: string[]) {
  return candidates.find(k => k in obj) ?? null
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS)
  cutoff.setHours(0, 0, 0, 0)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    // Find the first sheet that looks like an AD_TRACKER sheet
    let rows: any[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet, { defval: null })
      if (data.length > 0) {
        rows = data
        break
      }
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    // Normalise header names to lowercase with no spaces
    const normalised = rows.map((row: any) => {
      const out: Record<string, any> = {}
      for (const key of Object.keys(row)) {
        out[key.toLowerCase().replace(/\s+/g, '_')] = row[key]
      }
      return out
    })

    // Detect date column (DATE, date, Day, etc.)
    const dateKeys = ['date', 'day', 'period']
    const spendKeys = ['daily_ad_spend', 'ad_spend', 'spend', 'cost']
    const earningsKeys = ['revenue_for_front_end_book', 'revenue', 'earnings', 'royalties']

    const sample = normalised[0]
    const dateKey     = findKey(sample, dateKeys)
    const spendKey    = findKey(sample, spendKeys)
    const earningsKey = findKey(sample, earningsKeys)

    if (!dateKey || !spendKey) {
      return NextResponse.json({
        error: 'Could not find DATE and SPEND columns. Expected headers: DATE, DAILY AD SPEND, REVENUE.',
      }, { status: 400 })
    }

    // Filter to last 21 days and parse values
    type ImportRow = { date: Date; spend: number; earnings: number }
    const validRows: ImportRow[] = []

    for (const row of normalised) {
      const rawDate = row[dateKey]
      if (!rawDate) continue

      // Parse date — may be a JS Date (from cellDates) or a string
      const date = rawDate instanceof Date ? rawDate : new Date(rawDate)
      if (isNaN(date.getTime())) continue
      if (date < cutoff) continue  // skip rows older than 21 days

      const spend    = parseFloat(row[spendKey]   ?? 0) || 0
      const earnings = earningsKey ? (parseFloat(row[earningsKey] ?? 0) || 0) : 0

      if (spend === 0) continue  // skip zero-spend rows

      validRows.push({ date, spend, earnings })
    }

    if (!validRows.length) {
      return NextResponse.json({
        error: `No rows found within the last ${CUTOFF_DAYS} days with spend > 0.`,
      }, { status: 400 })
    }

    // Upsert each row — match by userId + date (same day)
    let imported = 0
    for (const { date, spend, earnings } of validRows) {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const roas = earnings > 0 && spend > 0 ? Math.round((earnings / spend) * 100) / 100 : 0

      // Check for existing log on this date
      const existing = await db.roasLog.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: dayStart, lte: dayEnd },
        },
      })

      if (existing) {
        await db.roasLog.update({
          where: { id: existing.id },
          data: { spend, earnings, roas },
        })
      } else {
        await db.roasLog.create({
          data: {
            userId: session.user.id,
            date: dayStart,
            spend,
            earnings,
            roas,
          },
        })
      }
      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      message: `Imported ${imported} days of data (last ${CUTOFF_DAYS} days)`,
    })
  } catch (err) {
    console.error('[parse-roas-import] error:', err)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
