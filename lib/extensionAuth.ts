import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const RATE_LIMIT_MAX = 10
const TOKEN_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

export function getExtensionKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function validateExtensionRequest(req: NextRequest): Promise<
  { userId: string } | { errorResponse: NextResponse }
> {
  const extensionKey = getExtensionKey(req)
  if (!extensionKey) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const rateLimitError = await checkRateLimit(extensionKey)
  if (rateLimitError) return { errorResponse: rateLimitError }

  const user = await db.user.findUnique({
    where: { extensionKey },
    select: { id: true },
  })
  if (!user) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { userId: user.id }
}

async function checkRateLimit(extensionKey: string): Promise<NextResponse | null> {
  const now = new Date()
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000)

  try {
    const existing = await db.extensionRateLimit.findUnique({
      where: { extensionKey_windowStart: { extensionKey, windowStart } },
    })

    if (existing) {
      if (existing.requestCount >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
      await db.extensionRateLimit.update({
        where: { id: existing.id },
        data: { requestCount: { increment: 1 } },
      })
    } else {
      await db.extensionRateLimit.create({
        data: { extensionKey, windowStart, requestCount: 1 },
      })
    }
    return null
  } catch {
    return null
  }
}

export async function validateConnectionToken(
  token: string
): Promise<{ valid: true } | { valid: false; error: string; status: number }> {
  if (!token) return { valid: false, error: 'Missing connection token', status: 400 }

  const record = await db.connectionToken.findUnique({ where: { token } })
  if (!record) return { valid: false, error: 'Invalid connection token', status: 401 }
  if (record.usedAt) return { valid: false, error: 'Connection token already used', status: 401 }

  const ageMs = Date.now() - record.createdAt.getTime()
  if (ageMs > TOKEN_EXPIRY_MS) {
    return { valid: false, error: 'Connection token expired', status: 401 }
  }

  return { valid: true }
}
