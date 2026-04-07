// app/api/upload-timestamp/route.ts — last upload time per channel
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const channel = new URL(req.url).searchParams.get('channel')
  if (!channel) return NextResponse.json({ error: 'channel param required' }, { status: 400 })

  const log = await db.uploadLog.findFirst({
    where: { userId: session.user.id, dataType: channel },
    orderBy: { uploadedAt: 'desc' },
    select: { uploadedAt: true, fileName: true },
  })

  return NextResponse.json({ uploadedAt: log?.uploadedAt ?? null, fileName: log?.fileName ?? null })
}
