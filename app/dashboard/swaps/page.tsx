import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import SwapsClient from '@/components/swaps/SwapsClient'

export default async function SwapsPage() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const swaps = await db.swap.findMany({
    where: { userId: session.user.id },
    orderBy: { promoDate: 'asc' },
  })

  const serialized = swaps.map(s => ({
    ...s,
    promoDate: s.promoDate.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <SwapsClient swaps={serialized} />
}
