import { NextRequest } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json()) as HandleUploadBody

  const jsonResponse = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maximumSizeInBytes: 10 * 1024 * 1024,
    }),
    onUploadCompleted: async () => {
      // blob.url available here if needed for post-upload hooks
    },
  })

  return Response.json(jsonResponse)
}
