// app/api/books/[id]/manuscript/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.book.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const fileName = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  let text = ''

  if (fileName.endsWith('.txt')) {
    text = buffer.toString('utf-8')
  } else if (fileName.endsWith('.pdf')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const parsed = await pdfParse(buffer)
      text = parsed.text ?? ''
    } catch {
      return NextResponse.json({ error: 'PDF parsing failed. Try uploading a .txt version of your manuscript.' }, { status: 422 })
    }
  } else {
    return NextResponse.json({ error: 'Only .pdf and .txt files are supported' }, { status: 400 })
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  await db.book.update({
    where: { id: params.id },
    data: {
      manuscriptText: text,
      manuscriptUploadedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, wordCount })
}
