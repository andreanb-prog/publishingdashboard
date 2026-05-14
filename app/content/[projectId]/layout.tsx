import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import ProjectSidebar from '@/components/content/ProjectSidebar'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { projectId: string }
}) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const [project, selectedQuoteCount] = await Promise.all([
    db.storyPostProject.findFirst({
      where: { id: params.projectId, userId: session.user.id },
      include: {
        _count: { select: { posts: true, quotes: true, reviews: true, images: true } },
      },
    }),
    db.storyPostQuote.count({
      where: { projectId: params.projectId, selected: true },
    }),
  ])

  if (!project) notFound()

  // Derive completed steps from project data
  const completedSteps: string[] = []
  if (project.frequency && (project.avatar || project.aesthetic)) completedSteps.push('setup')
  if (selectedQuoteCount >= 10) completedSteps.push('manuscript')
  if (project._count.reviews >= 3) completedSteps.push('reviews')
  if (project._count.images >= 5) completedSteps.push('images')
  if (project._count.posts > 0) completedSteps.push('calendar')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <ProjectSidebar
        projectId={params.projectId}
        projectName={project.name}
        completedSteps={completedSteps}
        postCount={project._count.posts}
        quoteCount={project._count.quotes}
        reviewCount={project._count.reviews}
        imageCount={project._count.images}
      />
      <main className="sp-main">
        {children}
      </main>
    </div>
  )
}
