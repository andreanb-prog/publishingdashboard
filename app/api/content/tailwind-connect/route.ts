export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (e) {
      console.error('[tailwind-connect POST] Failed to parse request body:', e)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { apiKey } = body as { apiKey?: string }
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
  } catch (err) {
    console.error('[tailwind-connect POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connection = await db.tailwindConnection.findUnique({
      where: { userId: session.user.id },
      select: { accountId: true, createdAt: true },
    })

    return NextResponse.json({ connected: !!connection, accountId: connection?.accountId ?? null })
  } catch (err) {
    console.error('[tailwind-connect GET] Unexpected error:', err)
    return NextResponse.json({ connected: false, accountId: null }, { status: 200 })
  }
}

export async function DELETE() {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await db.tailwindConnection.deleteMany({ where: { userId: session.user.id } })
    return NextResponse.json({ disconnected: true })
  } catch (err) {
    console.error('[tailwind-connect DELETE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
