import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

function padDate(n: number) { return String(n).padStart(2, '0') }
function formatDate(d: Date): string {
  return `${padDate(d.getMonth() + 1)}/${padDate(d.getDate())}/${d.getFullYear()}`
}

function buildHootsuiteCSV(posts: Awaited<ReturnType<typeof getPosts>>): string {
  const header = 'Date,Time,Message,Link,Facebook,Twitter,LinkedIn,Instagram,Pinterest,Image'
  const rows = posts.map(p => {
    const d = new Date()
    d.setDate(d.getDate() + p.dayNumber)
    const msg = (p.instagram ?? '').replace(/"/g, '""')
    const fb = (p.facebook ?? '').replace(/"/g, '""')
    const img = p.imageUrl ?? ''
    return `"${formatDate(d)}","9:00 AM","${msg}","${p.pinterestLink ?? ''}","${fb}","","","TRUE","TRUE","${img}"`
  })
  return [header, ...rows].join('\n')
}

function buildLaterCSV(posts: Awaited<ReturnType<typeof getPosts>>): string {
  const header = 'Date,Time,Caption,Media URL,Profile'
  const rows = posts.map(p => {
    const d = new Date()
    d.setDate(d.getDate() + p.dayNumber)
    const cap = (p.instagram ?? '').replace(/"/g, '""')
    return `"${formatDate(d)}","9:00 AM","${cap}","${p.imageUrl ?? ''}","Instagram"`
  })
  return [header, ...rows].join('\n')
}

function buildTailwindCSV(posts: Awaited<ReturnType<typeof getPosts>>): string {
  const header = 'Schedule Date,Schedule Time,Pin Description,Board Name,Link URL,Image URL'
  const rows = posts.map(p => {
    const d = new Date()
    d.setDate(d.getDate() + p.dayNumber)
    const pin = (p.pinterest ?? '').replace(/"/g, '""')
    return `"${formatDate(d)}","9:00 AM","${pin}","Romance Reads","${p.pinterestLink ?? ''}","${p.imageUrl ?? ''}"`
  })
  return [header, ...rows].join('\n')
}

function buildBufferCSV(posts: Awaited<ReturnType<typeof getPosts>>): string {
  const header = 'Date,Time,Message,Link,Profile Name,Image'
  const rows = posts.map(p => {
    const d = new Date()
    d.setDate(d.getDate() + p.dayNumber)
    const msg = (p.instagram ?? '').replace(/"/g, '""')
    return `"${formatDate(d)}","9:00 AM","${msg}","${p.pinterestLink ?? ''}","Instagram","${p.imageUrl ?? ''}"`
  })
  return [header, ...rows].join('\n')
}

async function getPosts(projectId: string) {
  return db.storyPostPost.findMany({
    where: { projectId },
    orderBy: { dayNumber: 'asc' },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const format = req.nextUrl.searchParams.get('format') ?? 'hootsuite'
  const posts = await getPosts(params.id)

  let csv: string
  let filename: string

  switch (format) {
    case 'later':
      csv = buildLaterCSV(posts)
      filename = 'storypost-later.csv'
      break
    case 'tailwind':
      csv = buildTailwindCSV(posts)
      filename = 'storypost-tailwind.csv'
      break
    case 'buffer':
      csv = buildBufferCSV(posts)
      filename = 'storypost-buffer.csv'
      break
    default:
      csv = buildHootsuiteCSV(posts)
      filename = 'storypost-hootsuite.csv'
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
