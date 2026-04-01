// app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { MobileNav } from '@/components/MobileNav'
import { FeedbackButton } from '@/components/FeedbackButton'
import { HelpDrawer } from '@/components/HelpDrawer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <div className="hidden md:block">
          <TopBar user={session.user} />
        </div>
        <main className="flex-1 overflow-y-auto" style={{ background: '#F5F0E8' }}>
          {children}
        </main>
      </div>
      <HelpDrawer />
      <FeedbackButton />
    </div>
  )
}
