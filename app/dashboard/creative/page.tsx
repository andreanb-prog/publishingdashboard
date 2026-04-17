// app/dashboard/creative/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CreativeHubTabs } from './CreativeHubTabs'

export const metadata = { title: 'Creative Hub — AuthorDash' }

export default async function CreativePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  redirect('/dashboard')

  const [books, creatives, campaigns] = await Promise.all([
    db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, phase: true, colorCode: true },
    }),
    db.creative.findMany({
      where: { userId: session.user.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    db.campaign.findMany({
      where: { userId: session.user.id },
      include: {
        adSets: {
          include: { ads: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const serializedCreatives = creatives.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  const serializedCampaigns = campaigns.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    adSets: c.adSets.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      ads: s.ads.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
    })),
  }))

  return (
    <CreativeHubTabs
      initialCreatives={serializedCreatives}
      initialCampaigns={serializedCampaigns}
      books={books}
    />
  )
}
