// app/dashboard/swaps/page.tsx
import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { serializeSwapEntry } from '@/lib/swaps'
import { SwapsPage } from '@/components/swaps/SwapsPage'

export const metadata = { title: 'Book Swaps — AuthorDash' }

export default async function SwapsServerPage() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const [entries, books] = await Promise.all([
    // SwapEntry is the single source of truth (BookClicker sync + manual Add Swap).
    // Only dated rows can be placed on the calendar / timeline.
    db.swapEntry.findMany({
      where: { userId: session.user.id, promoDate: { not: null } },
      orderBy: { promoDate: 'asc' },
    }),
    db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: { title: true },
    }),
  ])

  const serialized = entries.map(serializeSwapEntry)

  return <SwapsPage swaps={serialized} books={books} />
}
