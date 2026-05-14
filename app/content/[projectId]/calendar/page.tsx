import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import CalendarView from '@/components/content/calendar'
import CalendarErrorBoundary from '@/components/content/calendar/CalendarErrorBoundary'

export const metadata = {
  title: 'StoryPost · Calendar',
}

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

  // Compute performance stats from existing post data
  const logged = posts.filter(p => p.reach != null)
  const loggedCount = logged.length
  const avgReach = loggedCount > 0
    ? Math.round(logged.reduce((s, p) => s + (p.reach ?? 0), 0) / loggedCount)
    : 0
  const avgSaves = loggedCount > 0
    ? Math.round(logged.reduce((s, p) => s + (p.saves ?? 0), 0) / loggedCount)
    : 0
  const clickRate = loggedCount > 0
    ? Math.round(logged.filter(p => p.clicks === true).length / loggedCount * 100)
    : 0

  const storedInsights = Array.isArray(project.insights)
    ? (project.insights as string[])
    : null

  return (
    <CalendarErrorBoundary>
    <CalendarView
      project={{
        id: project.id,
        hasLaunch: project.hasLaunch,
        launchDate: project.launchDate?.toISOString() ?? null,
        frequency: project.frequency,
        beaconsUrl: project.beaconsUrl ?? null,
        bookPageUrl: project.bookPageUrl ?? null,
        authorCentral: project.authorCentral ?? null,
        website: project.website ?? null,
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
        imageDirection: p.imageDirection as { framing?: string; light?: string; mood?: string } | null,
        whyThisPost: p.whyThisPost,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        postedAt: p.postedAt?.toISOString() ?? null,
      }))}
      performanceStats={{ loggedCount, totalCount: posts.length, avgReach, avgSaves, clickRate }}
      initialInsights={storedInsights}
    />
    </CalendarErrorBoundary>
  )
}
