// app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { FeedbackButton } from '@/components/FeedbackButton'

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
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <FeedbackButton />
    </div>
  )
}
