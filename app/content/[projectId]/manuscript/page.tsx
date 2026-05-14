import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import ManuscriptPage from '@/components/content/manuscript'

export default async function ManuscriptRoute({ params }: { params: { projectId: string } }) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const project = await db.storyPostProject.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    select: { id: true },
  })
  if (!project) notFound()

  const quotes = await db.storyPostQuote.findMany({
    where: { projectId: params.projectId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, text: true, context: true, selected: true },
  })

  return (
    <ManuscriptPage
      projectId={params.projectId}
      initialQuotes={quotes}
    />
  )
}
