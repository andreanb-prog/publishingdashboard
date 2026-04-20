// app/(dashboard)/page.tsx
import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { OverviewClient } from './OverviewClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { fetchDashboardData } from '@/lib/dashboard-data'

export default async function DashboardPage() {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  // Redirect new users to profile setup if pen name not set
  if (!session.user.penName) {
    redirect('/dashboard/welcome')
  }

  // Greeting name priority: preferredGreetingName → first word of penName → first name from Google
  const greetingName =
    session.user.preferredGreetingName ??
    (session.user.penName ? session.user.penName.split(' ')[0] : null) ??
    (session.user.name ? session.user.name.split(' ')[0] : null)

  // Fetch ALL dashboard data in parallel on the server — eliminates client-side waterfall
  const initialData = await fetchDashboardData(session.user.id)

  return (
    <ErrorBoundary fallbackTitle="Dashboard couldn't load">
      <OverviewClient userName={greetingName} initialData={initialData} />
    </ErrorBoundary>
  )
}
