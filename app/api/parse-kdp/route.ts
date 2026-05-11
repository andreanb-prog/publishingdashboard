// app/api/parse-kdp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { logAdminAction } from '@/lib/adminAudit'
import { handleKDPUpload } from '@/lib/uploadHandlers'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Please upload a file under 50MB.' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('[parse-kdp] file:', file.name, '| size:', file.size, 'bytes')

    let result
    try {
      result = await handleKDPUpload(session.user.id, buffer, file.name)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unrecognized file format.'
      console.error('[parse-kdp] upload failed:', msg)
      return NextResponse.json({ error: msg }, { status: 422 })
    }

    if (session.user.adminImpersonating && session.user.adminRealEmail) {
      logAdminAction(session.user.adminRealEmail, session.user.adminImpersonating, 'upload', {
        filename: file.name, rowCount: result.rawRowCount, fileType: 'kdp',
      })
    }

    const books = result.accumulatedData.books
    const dates = result.accumulatedData.dailyUnits.map(d => d.date).sort()
    const dateRange = dates.length > 0
      ? { from: dates[0], to: dates[dates.length - 1] }
      : { from: result.accumulatedData.month + '-01', to: result.accumulatedData.month + '-01' }
    const asinsFound = Array.from(new Set(books.map(b => b.asin).filter((a): a is string => !!a)))
    const diagnostics = {
      success: true,
      rowsImported: result.rawRowCount,
      rowCount: result.rawRowCount,
      dateRange,
      asinsFound,
    }
    console.log('[parse-kdp] result:', JSON.stringify(diagnostics))
    return NextResponse.json(diagnostics)
  } catch (error) {
    console.error('[parse-kdp] unexpected error:', error)
    return NextResponse.json({ error: 'Failed to parse KDP file. Please try again.' }, { status: 500 })
  }
}
