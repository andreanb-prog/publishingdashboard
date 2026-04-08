// app/api/writing-notebook/setup-key/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await req.json()
  if (!key || typeof key !== 'string' || !key.startsWith('sk-ant-')) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // Validate key against Anthropic API
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // Encrypt and store
  const encrypted = encrypt(key)
  await db.user.update({
    where: { id: session.user.id },
    data: {
      anthropicApiKey: encrypted,
      anthropicKeyAddedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
