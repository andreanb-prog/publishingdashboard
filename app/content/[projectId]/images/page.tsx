import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import ImageLibrary from '@/components/content/images'

export default async function ImagesPage({ params }: { params: { projectId: string } }) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const [project, images] = await Promise.all([
    db.storyPostProject.findFirst({
      where: { id: params.projectId, userId: session.user.id },
      select: { id: true, pillars: true },
    }),
    db.storyPostImage.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true, label: true, pillarTag: true },
    }),
  ])

  if (!project) notFound()

  const pillars = Array.isArray(project.pillars)
    ? (project.pillars as string[]).map(name => ({ name }))
    : []

  return (
    <ImageLibrary
      projectId={params.projectId}
      initialImages={images}
      pillars={pillars}
    />
  )
}
