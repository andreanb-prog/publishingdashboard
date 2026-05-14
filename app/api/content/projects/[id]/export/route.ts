import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

function padDate(n: number) { return String(n).padStart(2, '0') }

function calcDate(dayNumber: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + dayNumber)
  return d
}

function fmtDate(d: Date): string {
  return `${padDate(d.getMonth() + 1)}/${padDate(d.getDate())}/${d.getFullYear()}`
}

function q(val: string | null | undefined): string {
  return `"${(val ?? '').replace(/"/g, '""')}"`
}

function imageFilename(post: Post): string {
  if (post.imageLabel) return post.imageLabel
  if (post.imageUrl) {
    const parts = post.imageUrl.split('/')
    return parts[parts.length - 1] ?? ''
  }
  return ''
}

type Post = Awaited<ReturnType<typeof getPosts>>[number]

async function getPosts(projectId: string) {
  return db.storyPostPost.findMany({
    where: { projectId },
    orderBy: { dayNumber: 'asc' },
  })
}

function buildHootsuiteCSV(posts: Post[]): string {
  const header = 'Date,Time,Message,Link,Facebook,Twitter,LinkedIn,Instagram,Pinterest,Image'
  const rows = posts.map(p => {
    const date = fmtDate(calcDate(p.dayNumber))
    const msg = q(p.instagram)
    const link = q(p.pinterestLink)
    const img = q(imageFilename(p))
    return `${q(date)},"9:00 AM",${msg},${link},"TRUE","","","TRUE","TRUE",${img}`
  })
  return [header, ...rows].join('\n')
}

function buildLaterCSV(posts: Post[]): string {
  const header = 'Date,Time,Caption,Media URL,Profile'
  const rows: string[] = []
  for (const p of posts) {
    const date = q(fmtDate(calcDate(p.dayNumber)))
    const mediaUrl = q(p.imageUrl)
    rows.push(`${date},"9:00 AM",${q(p.instagram)},${mediaUrl},"Instagram"`)
    rows.push(`${date},"9:00 AM",${q(p.facebook)},${mediaUrl},"Facebook"`)
    rows.push(`${date},"9:00 AM",${q(p.pinterest)},${mediaUrl},"Pinterest"`)
  }
  return [header, ...rows].join('\n')
}

function buildTailwindCSV(posts: Post[]): string {
  const header = 'Schedule Date,Schedule Time,Pin Description,Board Name,Link URL,Image URL'
  const rows = posts
    .filter(p => p.pinterestLinkType)
    .map(p => {
      const date = q(fmtDate(calcDate(p.dayNumber)))
      return `${date},"9:00 AM",${q(p.pinterest)},${q(p.pillar)},${q(p.pinterestLink)},${q(p.imageUrl)}`
    })
  return [header, ...rows].join('\n')
}

function buildBufferCSV(posts: Post[]): string {
  const header = 'Date,Time,Message,Link,Profile Name,Image'
  const rows: string[] = []
  for (const p of posts) {
    const date = q(fmtDate(calcDate(p.dayNumber)))
    const img = q(imageFilename(p))
    rows.push(`${date},"9:00 AM",${q(p.instagram)},${q(p.pinterestLink)},"Instagram",${img}`)
    rows.push(`${date},"9:00 AM",${q(p.facebook)},${q(p.pinterestLink)},"Facebook Page",${img}`)
    rows.push(`${date},"9:00 AM",${q(p.pinterest)},${q(p.pinterestLink)},"Pinterest",${img}`)
  }
  return [header, ...rows].join('\n')
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
