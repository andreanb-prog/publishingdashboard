import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import SetupForm from '@/components/content/setup'

export default async function SetupPage({ params }: { params: { projectId: string } }) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const [project, books] = await Promise.all([
    db.storyPostProject.findFirst({
      where: { id: params.projectId, userId: session.user.id },
    }),
    db.book.findMany({
      where: { userId: session.user.id, excludeFromDashboard: false },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        asin: true,
        seriesName: true,
        tropes: true,
        customTropes: true,
        colorCode: true,
      },
    }),
  ])

  if (!project) notFound()

  const serialized = {
    id: project.id,
    name: project.name,
    hasLaunch: project.hasLaunch,
    launchDate: project.launchDate?.toISOString() ?? null,
    launchBookId: project.launchBookId,
    frequency: project.frequency,
    bookPageUrl: project.bookPageUrl,
    authorCentral: project.authorCentral,
    website: project.website,
    beaconsUrl: project.beaconsUrl,
    pillars: Array.isArray(project.pillars) ? (project.pillars as string[]) : null,
    avatar: project.avatar,
    aesthetic: project.aesthetic,
  }

  return (
    <SetupForm
      projectId={params.projectId}
      initialProject={serialized}
      initialBooks={books}
    />
  )
}
