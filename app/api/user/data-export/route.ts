// GET /api/user/data-export
// Returns all data AuthorDash holds for the authenticated user
// GDPR Article 20 — data portability
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [
    user,
    books,
    analyses,
    kdpSales,
    swaps,
    swapEntries,
    contentProfiles,
    contentPosts,
    bsrLogs,
    rankLogs,
    roasLogs,
    pinterestLogs,
    listBuildingLogs,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        penName: true,
        preferredGreetingName: true,
        genreCategory: true,
        genreSubgenre: true,
        referralSource: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndsAt: true,
        onboardingDismissed: true,
        writingOnboardingComplete: true,
      },
    }),
    db.book.findMany({ where: { userId } }),
    db.analysis.findMany({ where: { userId } }),
    db.kdpSale.findMany({ where: { userId } }),
    db.swap.findMany({ where: { userId } }),
    db.swapEntry.findMany({ where: { userId } }),
    db.contentProfile.findMany({ where: { userId } }),
    db.contentPost.findMany({ where: { userId } }),
    db.bsrLog.findMany({ where: { userId } }),
    db.rankLog.findMany({ where: { userId } }),
    db.roasLog.findMany({ where: { userId } }),
    db.pinterestLog.findMany({ where: { userId } }),
    db.listBuildingLog.findMany({ where: { userId } }),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user,
    books,
    analyses,
    kdp_sales: kdpSales,
    swaps,
    swap_entries: swapEntries,
    content_profiles: contentProfiles,
    content_posts: contentPosts,
    bsr_logs: bsrLogs,
    rank_logs: rankLogs,
    roas_logs: roasLogs,
    pinterest_logs: pinterestLogs,
    list_building_logs: listBuildingLogs,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="authordash-export-${userId}-${Date.now()}.json"`,
    },
  })
}
