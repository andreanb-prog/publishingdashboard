import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { put } from '@vercel/blob'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const blobPath = `content-images/${params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const blob = await put(blobPath, file, { access: 'public' })

  const image = await db.storyPostImage.create({
    data: {
      projectId: params.id,
      url: blob.url,
      label: null,
      pillarTag: null,
    },
    select: { id: true, url: true, label: true, pillarTag: true, createdAt: true },
  })

  return NextResponse.json({ image })
}
