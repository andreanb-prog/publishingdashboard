// app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { MobileNav } from '@/components/MobileNav'
import { FeedbackButton } from '@/components/FeedbackButton'
import { HelpDrawer } from '@/components/HelpDrawer'
import { TrialBanner } from '@/components/TrialBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const status = session.user.subscriptionStatus
  const trialEndsAt = session.user.trialEndsAt

  // Only gate access if user explicitly has an expired trial or canceled subscription
  // Null status = beta user or new user (auto-trial set in session callback) — always allow
  const trialExpired = trialEndsAt && new Date(trialEndsAt) < new Date()
  const needsSubscription = trialExpired && status !== 'active'

  if (needsSubscription) {
    redirect('/pricing?expired=true')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <div className="hidden md:block">
          <TopBar user={session.user} />
        </div>
        {status === 'trialing' && trialEndsAt && (
          <TrialBanner trialEndsAt={trialEndsAt} />
        )}
        <main className="flex-1 overflow-y-auto pb-24" style={{ background: '#FFFFFF' }}>
          {children}
        </main>
      </div>
      <HelpDrawer />
      <FeedbackButton />
    </div>
  )
}
