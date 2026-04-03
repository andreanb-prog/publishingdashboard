// app/(dashboard)/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { OverviewClient } from './OverviewClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Redirect new users to profile setup if pen name not set
  if (!session.user.penName) {
    redirect('/dashboard/welcome')
  }

  const firstName = session.user.name?.split(' ')[0] ?? null

  return (
    <ErrorBoundary fallbackTitle="Dashboard couldn't load">
      <OverviewClient userName={firstName} />
    </ErrorBoundary>
  )
}
