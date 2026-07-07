// app/dashboard/swaps/calendar/page.tsx
// Secondary calendar view of the send queue — the main Swaps page is the send
// queue; this month grid is linked from its footer ("Open Calendar View →").
// Same SwapEntry data, same semantics: amber = your sends, sage = partners
// promoting Andrea's books.
import { Playfair_Display } from 'next/font/google'
import Link from 'next/link'
import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { serializeSwapEntry } from '@/lib/swaps'
import { SwapsCalendar } from '@/components/swaps/SwapsCalendar'

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

export const metadata = { title: 'Swap Calendar — AuthorDash' }

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function SwapsCalendarPage() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const entries = await db.swapEntry.findMany({
    where: { userId: session.user.id, promoDate: { not: null } },
    orderBy: { promoDate: 'asc' },
  })

  return (
    <div className={playfair.variable} style={{ background: '#FFF8F0', minHeight: '100vh', fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard/swaps" style={{ fontSize: 13, fontWeight: 600, color: '#E9A020', textDecoration: 'none' }}>
            ← Back to Book Swaps
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E2D3D', margin: '10px 0 4px' }}>
            Swap Calendar
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.5)', margin: 0 }}>
            Month view of every send and incoming promo.
          </p>
        </div>
        <SwapsCalendar
          swaps={entries.map(serializeSwapEntry)}
          today={todayDateStr()}
        />
      </div>
    </div>
  )
}
