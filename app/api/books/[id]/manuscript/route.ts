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

  // Detect file type by extension ONLY — no magic byte detection
  const fileName = file.name.toLowerCase()
  console.log('[manuscript] upload started:', fileName, 'size:', file.size)

  const buffer = Buffer.from(await file.arrayBuffer())
  console.log('[manuscript] buffer read, bytes:', buffer.length)

  let text = ''

  if (fileName.endsWith('.txt')) {
    console.log('[manuscript] parsing as TXT')
    text = buffer.toString('utf-8')
    console.log('[manuscript] TXT parsed, chars:', text.length)

  } else if (fileName.endsWith('.pdf')) {
    console.log('[manuscript] parsing as PDF with pdfjs-dist legacy')
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as any
      pdfjsLib.GlobalWorkerOptions.workerSrc = '' // disable worker threads for serverless
      console.log('[manuscript] pdfjs-dist loaded, calling getDocument')
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      const pdf = await loadingTask.promise
      console.log('[manuscript] PDF opened, numPages:', pdf.numPages)
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pages.push(content.items.map((item: any) => item.str ?? '').join(' '))
      }
      text = pages.join('\n\n')
      console.log('[manuscript] PDF text extracted, chars:', text.length)
    } catch (err) {
      console.error('[manuscript] PDF parse error:', err)
      // Graceful fallback — save the upload record, do not show an error to the user
      await db.book.update({
        where: { id: params.id },
        data: { manuscriptText: '', manuscriptUploadedAt: new Date() },
      })
      return NextResponse.json({
        success: true,
        wordCount: 0,
        warning: 'Manuscript saved. For best results try uploading a .txt version.',
      })
    }

  } else if (fileName.endsWith('.epub')) {
    console.log('[manuscript] parsing as EPUB with adm-zip')
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AdmZip = require('adm-zip')
      const zip = new AdmZip(buffer)
      const entries = zip.getEntries() as { entryName: string; getData: () => Buffer }[]
      console.log('[manuscript] EPUB zip opened, entries:', entries.length)
      const chapters: string[] = []
      for (const entry of entries) {
        const name = entry.entryName.toLowerCase()
        if (name.endsWith('.xhtml') || name.endsWith('.html') || name.endsWith('.htm')) {
          const raw = entry.getData().toString('utf-8')
          const stripped = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          if (stripped) chapters.push(stripped)
        }
      }
      text = chapters.join('\n\n')
      console.log('[manuscript] EPUB text extracted, chars:', text.length)
    } catch (err) {
      console.error('[manuscript] EPUB parse error:', err)
      // Graceful fallback — do not show an error
      await db.book.update({
        where: { id: params.id },
        data: { manuscriptText: '', manuscriptUploadedAt: new Date() },
      })
      return NextResponse.json({
        success: true,
        wordCount: 0,
        warning: 'Manuscript saved. For best results try uploading a .txt version.',
      })
    }

  } else {
    return NextResponse.json({ error: 'Only .pdf, .txt, and .epub files are supported' }, { status: 400 })
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  console.log('[manuscript] saving to DB, wordCount:', wordCount)

  await db.book.update({
    where: { id: params.id },
    data: {
      manuscriptText: text,
      manuscriptUploadedAt: new Date(),
    },
  })

  console.log('[manuscript] done')
  return NextResponse.json({ success: true, wordCount })
}
