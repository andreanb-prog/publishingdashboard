import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import CalendarView from '@/components/content/calendar'

export default async function CalendarPage({ params }: { params: { projectId: string } }) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const project = await db.storyPostProject.findFirst({
    where: { id: params.projectId, userId: session.user.id },
  })
  if (!project) notFound()

  const posts = await db.storyPostPost.findMany({
    where: { projectId: params.projectId },
    orderBy: { dayNumber: 'asc' },
  })

  return (
    <CalendarView
      project={{
        id: project.id,
        hasLaunch: project.hasLaunch,
        launchDate: project.launchDate?.toISOString() ?? null,
        frequency: project.frequency,
      }}
      initialPosts={posts.map(p => ({
        id: p.id,
        dayNumber: p.dayNumber,
        phase: p.phase,
        type: p.type,
        pillar: p.pillar,
        instagram: p.instagram,
        instagramTags: p.instagramTags,
        facebook: p.facebook,
        pinterest: p.pinterest,
        pinterestLink: p.pinterestLink,
        pinterestLinkType: p.pinterestLinkType,
        bookMention: p.bookMention,
        quoteUsed: p.quoteUsed,
        reviewUsed: p.reviewUsed,
        carouselSlides: p.carouselSlides,
        videoBeats: p.videoBeats,
        imageId: p.imageId,
        imageUrl: p.imageUrl,
        imageLabel: p.imageLabel,
      }))}
    />
  )
}
