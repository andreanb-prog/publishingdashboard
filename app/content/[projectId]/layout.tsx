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

  const project = await db.storyPostProject.findFirst({
    where: { id: params.projectId, userId: session.user.id },
    include: {
      _count: { select: { posts: true, quotes: true, reviews: true, images: true } },
    },
  })

  if (!project) notFound()

  // Derive completed steps from project data
  const completedSteps: string[] = []
  if (project.frequency && (project.avatar || project.aesthetic)) completedSteps.push('setup')
  if (project._count.quotes > 0) completedSteps.push('manuscript')
  if (project._count.reviews > 0) completedSteps.push('reviews')
  if (project._count.images > 0) completedSteps.push('images')
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
