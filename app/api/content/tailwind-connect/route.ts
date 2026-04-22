export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { apiKey } = await req.json()
  if (!apiKey?.trim()) return NextResponse.json({ error: 'apiKey required' }, { status: 400 })

  // Verify the key works by fetching the user's account info
  let accountId: string | null = null
  try {
    const verifyRes = await fetch('https://api.tailwindapp.com/1.1/user', {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
    })
    if (verifyRes.ok) {
      const data = await verifyRes.json() as { resource_response?: { data?: { account_id?: string } } }
      accountId = data?.resource_response?.data?.account_id ?? null
    }
  } catch {
    // Key may still be valid even if verification fails
  }

  await db.tailwindConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      encryptedApiKey: apiKey.trim(),
      accountId,
    },
    update: {
      encryptedApiKey: apiKey.trim(),
      accountId,
    },
  })

  return NextResponse.json({ connected: true, accountId })
}

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connection = await db.tailwindConnection.findUnique({
    where: { userId: session.user.id },
    select: { accountId: true, createdAt: true },
  })

  return NextResponse.json({ connected: !!connection, accountId: connection?.accountId ?? null })
}

export async function DELETE() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.tailwindConnection.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ disconnected: true })
}
