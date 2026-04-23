// app/api/bookfunnel/route.ts
// GET  — returns download stats + webhook URL + secret (generates one if missing)
// POST — action: 'regenerate-secret' rotates the webhook secret
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://authordash.io'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Fetch (or generate) webhook secret
  let secret: string | null = null
  try {
    const userRow = await db.user.findUnique({
      where: { id: userId },
      select: { bookfunnelWebhookSecret: true },
    })
    secret = userRow?.bookfunnelWebhookSecret ?? null
  } catch { /* ignore */ }

  // Auto-generate on first visit
  if (!secret) {
    secret = crypto.randomUUID()
    try {
      await db.user.update({ where: { id: userId }, data: { bookfunnelWebhookSecret: secret } })
    } catch { secret = null }
  }

  // Fetch all downloads
  let downloads: {
    id: string
    bookTitle: string
    downloadedAt: Date
    confirmed: boolean
    email: string
  }[] = []
  try {
    downloads = await db.bookFunnelDownload.findMany({
      where: { userId },
      orderBy: { downloadedAt: 'desc' },
      select: { id: true, bookTitle: true, downloadedAt: true, confirmed: true, email: true },
    })
  } catch { /* table may not exist pre-migration */ }

  // Aggregate by book title
  const byBook: Record<string, number> = {}
  for (const d of downloads) {
    byBook[d.bookTitle] = (byBook[d.bookTitle] ?? 0) + 1
  }

  // Downloads by date (YYYY-MM-DD)
  const byDate: Record<string, number> = {}
  for (const d of downloads) {
    const day = d.downloadedAt.toISOString().substring(0, 10)
    byDate[day] = (byDate[day] ?? 0) + 1
  }

  const totalCount   = downloads.length
  const confirmCount = downloads.filter(d => d.confirmed).length
  const confirmRate  = totalCount > 0 ? Math.round((confirmCount / totalCount) * 100) : 0
  const topBook      = Object.entries(byBook).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const webhookUrl   = `${BASE_URL}/api/webhooks/bookfunnel?uid=${userId}`

  return NextResponse.json({
    secret,
    webhookUrl,
    totalCount,
    confirmRate,
    topBook,
    byBook,
    byDate,
    downloads: downloads.map(d => ({
      ...d,
      downloadedAt: d.downloadedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()

  if (action === 'regenerate-secret') {
    const secret = crypto.randomUUID()
    await db.user.update({ where: { id: session.user.id }, data: { bookfunnelWebhookSecret: secret } })
    return NextResponse.json({ secret })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
