// app/api/creative/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')

  const creatives = await db.creative.findMany({
    where: {
      userId: session.user.id,
      ...(bookId ? { bookId } : {}),
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ creatives })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    name: string
    bookId?: string | null
    phase: string
    angle?: string | null
    format: string
    sizes?: string[]
    targeting?: string | null
    brief?: string | null
    hookText?: string | null
    variant?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { name, phase, format } = body
  if (!name || !phase || !format) {
    return NextResponse.json({ error: 'name, phase, format required' }, { status: 400 })
  }

  const creative = await db.creative.create({
    data: {
      userId: session.user.id,
      bookId: body.bookId ?? null,
      name,
      phase,
      angle: body.angle ?? null,
      format,
      sizes: body.sizes ?? [],
      targeting: body.targeting ?? null,
      brief: body.brief ?? null,
      hookText: body.hookText ?? null,
      variant: body.variant ?? null,
      status: 'briefed',
    },
  })

  return NextResponse.json({ creative })
}
