// app/api/parse-kdp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { parseKDPFile } from '@/lib/parsers/kdp'
import { logAdminAction } from '@/lib/adminAudit'

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

    if (session.user.adminImpersonating && session.user.adminRealEmail) {
      logAdminAction(session.user.adminRealEmail, session.user.adminImpersonating, 'upload', {
        filename: file.name,
        rowCount: data.books.length,
        fileType: 'kdp',
      })
    }

    return NextResponse.json({ success: true, data, rowCount: data.books.length })
  } catch (error) {
    console.error('KDP upload: unexpected error:', error)
    return NextResponse.json({ error: 'Failed to parse KDP file. Please try again.' }, { status: 500 })
  }
}
