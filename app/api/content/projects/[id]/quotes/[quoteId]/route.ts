import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

async function getAuthedProject(projectId: string, userId: string) {
  return db.storyPostProject.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; quoteId: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await getAuthedProject(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  if (typeof body?.selected === 'boolean') data.selected = body.selected
  if (typeof body?.text === 'string' && body.text.trim()) data.text = body.text.trim()

  const quote = await db.storyPostQuote.updateMany({
    where: { id: params.quoteId, projectId: params.id },
    data,
  })

  if (quote.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; quoteId: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await getAuthedProject(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.storyPostQuote.deleteMany({
    where: { id: params.quoteId, projectId: params.id },
  })

  return NextResponse.json({ ok: true })
}
