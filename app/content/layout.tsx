import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getAugmentedSession, IMPERSONATE_COOKIE } from '@/lib/getSession'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { MobileNav } from '@/components/MobileNav'
import { FeedbackButton } from '@/components/FeedbackButton'
import { HelpDrawer } from '@/components/HelpDrawer'
import { TrialBanner } from '@/components/TrialBanner'
import { AdminImpersonateBanner } from '@/components/AdminImpersonateBanner'
import { SHOW_PRICING } from '@/lib/flags'

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const status = session.user.subscriptionStatus
  const trialEndsAt = session.user.trialEndsAt
  const trialExpired = trialEndsAt && new Date(trialEndsAt) < new Date()
  const needsSubscription = trialExpired && status !== 'active'

  if (SHOW_PRICING && needsSubscription) {
    redirect('/pricing?expired=true')
  }

  const impersonating = cookies().get(IMPERSONATE_COOKIE)?.value ?? null

  return (
    <div className="flex min-h-screen flex-col">
      {impersonating && <AdminImpersonateBanner email={impersonating} />}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav />
          <div className="hidden md:block">
            <TopBar user={session.user} />
          </div>
          {SHOW_PRICING && status === 'trialing' && trialEndsAt && (
            <TrialBanner trialEndsAt={trialEndsAt} />
          )}
          <main className="flex-1 overflow-y-auto pb-24" style={{ background: '#FFFFFF' }}>
            {children}
          </main>
        </div>
      </div>
      <HelpDrawer />
      <FeedbackButton />
    </div>
  )
}
