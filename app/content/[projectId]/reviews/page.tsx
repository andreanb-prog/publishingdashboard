import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import ReviewBank from '@/components/content/reviews'

export default async function ReviewsPage({ params }: { params: { projectId: string } }) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const [project, books, reviews] = await Promise.all([
    db.storyPostProject.findFirst({
      where: { id: params.projectId, userId: session.user.id },
      select: { id: true },
    }),
    db.book.findMany({
      where: { userId: session.user.id, excludeFromDashboard: false },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true },
    }),
    db.storyPostReview.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true, reviewer: true, bookTitle: true },
    }),
  ])

  if (!project) notFound()

  return (
    <ReviewBank
      projectId={params.projectId}
      initialReviews={reviews}
      books={books}
    />
  )
}
