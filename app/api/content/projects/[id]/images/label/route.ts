import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

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

  const body = await req.json()
  const imageId = typeof body?.imageId === 'string' ? body.imageId : null
  if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 })

  const image = await db.storyPostImage.findFirst({
    where: { id: imageId, projectId: params.id },
    select: { id: true, url: true },
  })
  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: image.url },
          },
          {
            type: 'text',
            text: 'Look at this image and write a 3-4 word kebab-case label that describes what\'s in it. Focus on mood and subject. Examples: vineyard-golden-couple, kitchen-morning-laugh, rainy-window-close, swing-almost-kiss. Return ONLY the label string, nothing else.',
          },
        ],
      },
    ],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  const label = raw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  await db.storyPostImage.update({
    where: { id: imageId },
    data: { label },
  })

  return NextResponse.json({ imageId, label })
}
