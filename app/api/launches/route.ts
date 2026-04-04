// app/api/launches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const launches = await db.launch.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: 'desc' },
  })

  return NextResponse.json({
    launches: launches.map(l => ({
      ...l,
      startDate: l.startDate?.toISOString() ?? null,
      endDate:   l.endDate?.toISOString()   ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { bookTitle, asin, phase, customPhase, startDate, endDate, notes, status } = body as {
    bookTitle: string
    asin?: string
    phase: string
    customPhase?: string
    startDate?: string
    endDate?: string
    notes?: string
    status?: string
  }

  if (!bookTitle?.trim()) return NextResponse.json({ error: 'bookTitle required' }, { status: 400 })
  if (!phase?.trim())     return NextResponse.json({ error: 'phase required' },     { status: 400 })

  const launch = await db.launch.create({
    data: {
      userId:     session.user.id,
      bookTitle:  bookTitle.trim(),
      asin:       asin       ?? null,
      phase:      phase.trim(),
      customPhase: customPhase ?? null,
      startDate:  startDate  ? new Date(startDate) : null,
      endDate:    endDate    ? new Date(endDate)   : null,
      notes:      notes      ?? null,
      status:     (status as string) ?? 'upcoming',
    },
  })

  return NextResponse.json({
    launch: {
      ...launch,
      startDate: launch.startDate?.toISOString() ?? null,
      endDate:   launch.endDate?.toISOString()   ?? null,
      createdAt: launch.createdAt.toISOString(),
      updatedAt: launch.updatedAt.toISOString(),
    },
  })
}
