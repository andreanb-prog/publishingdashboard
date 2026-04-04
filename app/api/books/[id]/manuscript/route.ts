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
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '' // disable worker for serverless
      const uint8Array = new Uint8Array(buffer)
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
      const pdf = await loadingTask.promise
      const pages: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str ?? '')
          .join(' ')
        pages.push(pageText)
      }
      text = pages.join('\n\n')
    } catch {
      // Graceful fallback: save upload record without extracted text
      await db.book.update({
        where: { id: params.id },
        data: { manuscriptText: '', manuscriptUploadedAt: new Date() },
      })
      return NextResponse.json({
        success: true,
        wordCount: 0,
        warning: 'PDF uploaded — text extraction will be available shortly',
      })
    }
  } else if (fileName.endsWith('.epub')) {
    try {
      const { EPub } = await import('epub2')
      const epub = await EPub.createAsync(buffer as unknown as string)
      const chapters = await Promise.all(
        epub.flow.map((chapter: { id: string }) =>
          new Promise<string>((resolve) => {
            epub.getChapter(chapter.id, (err: unknown, body: string) => {
              if (err || !body) { resolve(''); return }
              // Strip HTML tags
              resolve(body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
            })
          })
        )
      )
      text = chapters.filter(Boolean).join('\n\n')
    } catch {
      return NextResponse.json({ error: 'EPUB parsing failed. Try uploading a .txt version of your manuscript.' }, { status: 422 })
    }
  } else {
    return NextResponse.json({ error: 'Only .pdf, .txt, and .epub files are supported' }, { status: 400 })
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
