// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchMailerLiteStats, getMailerLiteStats } from '@/lib/mailerlite'

function mask(key: string | null | undefined): string {
  if (!key || key.length < 8) return ''
  return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4)
}

// GET — return masked keys + books
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true, mailerLiteKey: true, books: true, subscriptionStatus: true, penName: true, preferredGreetingName: true, anthropicApiKey: true, anthropicKeyAddedAt: true, writingOnboardingComplete: true },
  })

  // Check Meta connection via raw SQL (columns may not exist)
  let metaConnected = false
  let metaLastSync: string | null = null
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT "metaAccessToken", "metaLastSync" FROM "User" WHERE "id" = $1 LIMIT 1`,
      session.user.id
    )
    if (rows[0]?.metaAccessToken) {
      metaConnected = true
      metaLastSync = rows[0].metaLastSync ? new Date(rows[0].metaLastSync).toISOString() : null
    }
  } catch { /* columns may not exist */ }

  // MailerLite subscriber count (fast group-only fetch)
  let mlSubscribers: number | null = null
  if (user?.mailerLiteKey) {
    try {
      const stats = await getMailerLiteStats(user.mailerLiteKey)
      mlSubscribers = stats.listSize
    } catch { /* key may be invalid or network error */ }
  }

  // KDP last upload — most recent analysis that has kdp data
  let kdpLastUpload: string | null = null
  try {
    const lastAnalysis = await db.analysis.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, data: true },
    })
    if (lastAnalysis && (lastAnalysis.data as any)?.kdp) {
      kdpLastUpload = (lastAnalysis.data as any)?.kdpUploadedAt ?? lastAnalysis.createdAt.toISOString()
    }
  } catch { /* table may be empty */ }

  // Book catalog for Writing Notebook
  const bookCatalog = await db.book.findMany({
    where: { userId: session.user.id },
    select: { id: true, title: true, genre: true, subgenre: true },
    orderBy: { sortOrder: 'asc' },
  })

  const subStatus = user?.subscriptionStatus
  const stripeActive = subStatus === 'active' || subStatus === 'trialing'

  return NextResponse.json({
    claudeKey:              user?.apiKey        ? mask(user.apiKey)        : null,
    mailerLiteKey:          user?.mailerLiteKey ? mask(user.mailerLiteKey) : null,
    books:                  user?.books ?? [],
    penName:                user?.penName ?? null,
    preferredGreetingName:  user?.preferredGreetingName ?? null,
    metaConnected,
    metaLastSync,
    mlSubscribers,
    kdpLastUpload,
    stripeActive,
    anthropicApiKey:          user?.anthropicApiKey ? mask(user.anthropicApiKey) : null,
    anthropicKeyAddedAt:      user?.anthropicKeyAddedAt?.toISOString() ?? null,
    writingOnboardingComplete: user?.writingOnboardingComplete ?? false,
    bookCatalog,
  })
}

// POST — test keys, save keys, or save books
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Disconnect Meta Ads
  if (body.action === 'disconnect-meta') {
    await db.$executeRawUnsafe(
      `UPDATE "User" SET "metaAccessToken" = NULL, "metaAdAccountId" = NULL, "metaTokenExpires" = NULL, "metaLastSync" = NULL WHERE "id" = $1`,
      session.user.id
    )
    return NextResponse.json({ success: true })
  }

  // Test a MailerLite key without saving it
  if (body.action === 'test-mailerlite') {
    const key = body.key?.trim()
    if (!key) return NextResponse.json({ error: 'No key provided' }, { status: 400 })
    try {
      const stats = await fetchMailerLiteStats(key)
      return NextResponse.json({ success: true, listSize: stats.listSize })
    } catch {
      return NextResponse.json({ error: 'Could not connect — check your API key' }, { status: 400 })
    }
  }

  // Save profile (pen name + display name)
  if (body.action === 'save-profile') {
    const update: { penName?: string; preferredGreetingName?: string | null } = {}
    if (typeof body.penName === 'string') update.penName = body.penName.trim()
    if ('preferredGreetingName' in body) {
      update.preferredGreetingName = typeof body.preferredGreetingName === 'string' && body.preferredGreetingName.trim()
        ? body.preferredGreetingName.trim()
        : null
    }
    await db.user.update({ where: { id: session.user.id }, data: update })
    return NextResponse.json({ success: true })
  }

  // Save books
  if (body.action === 'save-books') {
    const books = Array.isArray(body.books) ? body.books : []
    await db.user.update({ where: { id: session.user.id }, data: { books } })
    return NextResponse.json({ success: true })
  }

  // Save API keys
  const update: { apiKey?: string; mailerLiteKey?: string } = {}
  if (typeof body.claudeKey === 'string' && body.claudeKey.trim()) {
    update.apiKey = body.claudeKey.trim()
  }
  if (typeof body.mailerLiteKey === 'string' && body.mailerLiteKey.trim()) {
    update.mailerLiteKey = body.mailerLiteKey.trim()
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
  }

  await db.user.update({ where: { id: session.user.id }, data: update })
  return NextResponse.json({ success: true })
}
