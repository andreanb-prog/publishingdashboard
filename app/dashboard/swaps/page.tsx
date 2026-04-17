import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { SwapsPage } from '@/components/swaps/SwapsPage'

export const dynamic = 'force-dynamic'

export default async function SwapsPageServer() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const swaps = await db.swap.findMany({
    where: { userId: session.user.id },
    orderBy: { promoDate: 'asc' },
  })

  // Serialize dates for client component
  const serialized = swaps.map(s => ({
    ...s,
    promoDate: s.promoDate.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <SwapsPage initialSwaps={serialized} />
}
