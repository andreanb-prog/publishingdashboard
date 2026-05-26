// app/dashboard/swaps/page.tsx
import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { SwapsPage } from '@/components/swaps/SwapsPage'

export const metadata = { title: 'Book Swaps — AuthorDash' }

export default async function SwapsServerPage() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const swaps = await db.swap.findMany({
    where: { userId: session.user.id },
    orderBy: { promoDate: 'asc' },
  })

  const serialized = swaps.map(s => ({
    id: s.id,
    partnerName: s.partnerName,
    partnerEmail: s.partnerEmail,
    partnerListSize: s.partnerListSize,
    bookTitle: s.bookTitle,
    promoFormat: s.promoFormat,
    promoDate: s.promoDate.toISOString(),
    direction: s.direction,
    status: s.status,
    source: s.source,
    launchWindow: s.launchWindow,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <SwapsPage swaps={serialized} />
}
