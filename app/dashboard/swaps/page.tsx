// app/dashboard/swaps/page.tsx
import { Playfair_Display } from 'next/font/google'
import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { serializeSwapEntry } from '@/lib/swaps'
import { SendQueuePage } from '@/components/swaps/SendQueuePage'

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

export const metadata = { title: 'Book Swaps — AuthorDash' }

export default async function SwapsServerPage() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const [entries, user] = await Promise.all([
    // SwapEntry is the single source of truth; the BookClicker sync is the sole
    // writer. Only dated rows can be placed on the queue / timeline.
    db.swapEntry.findMany({
      where: { userId: session.user.id, promoDate: { not: null } },
      orderBy: { promoDate: 'asc' },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { bookclickerLastSyncAt: true },
    }),
  ])

  return (
    <div className={playfair.variable}>
      <SendQueuePage
        swaps={entries.map(serializeSwapEntry)}
        lastSyncAt={user?.bookclickerLastSyncAt?.toISOString() ?? null}
      />
    </div>
  )
}
