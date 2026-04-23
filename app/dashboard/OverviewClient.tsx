'use client'
// app/dashboard/OverviewClient.tsx
import { Suspense } from 'react'
import { FreshBanner } from '@/components/FreshBanner'
import { OnboardingBanner } from '@/components/OnboardingBanner'
import { SetupChecklist } from '@/components/SetupChecklist'
import type { DashboardData } from '@/lib/dashboard-data'
import { useDashboardData } from '@/components/dashboard/useDashboardData'
import { HeroPanel } from '@/components/dashboard/HeroPanel'
import { CoachPanel, CoachCopyStrip } from '@/components/dashboard/CoachPanel'
import { PrioritiesPanel } from '@/components/dashboard/PrioritiesPanel'
import { PerformancePanel } from '@/components/dashboard/PerformancePanel'
import { RoadmapPanel } from '@/components/dashboard/RoadmapPanel'
import { ActionPlanPanel } from '@/components/dashboard/ActionPlanPanel'
import { RailLaunchCountdown, RailTasksSection } from '@/components/dashboard/RailPanel'
import { DashboardBanners } from '@/components/dashboard/DashboardBanners'

export function OverviewClient({ userName, initialData }: { userName?: string | null; initialData?: DashboardData } = {}) {
  const dashboard = useDashboardData({ userName, initialData })
  const { loading, analysis, railTasks, liveML } = dashboard

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px]">
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-xl" style={{ background: '#FFF8F0' }} />
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: '#FFF8F0' }} />)}</div>
          <div className="h-40 rounded-xl" style={{ background: '#FFF8F0' }} />
          <div className="h-32 rounded-xl" style={{ background: '#FFF8F0' }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-36 rounded-xl" style={{ background: '#FFF8F0' }} />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px]">
      <Suspense fallback={null}><FreshBanner /></Suspense>
      <OnboardingBanner bookCount={initialData?.bookCount ?? 0} hasKdpData={!!analysis?.kdp} hasMailerLiteKey={initialData?.hasMailerLiteKey ?? !!liveML} />
      <SetupChecklist analysis={analysis} />
      <DashboardBanners dashboard={dashboard} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]" style={{ gap: '0 32px', alignItems: 'start' }}>
        <div className="min-w-0">
          <HeroPanel dashboard={dashboard} userName={userName} />
          <CoachPanel dashboard={dashboard} />
          <PrioritiesPanel dashboard={dashboard} />
          <PerformancePanel dashboard={dashboard} />
          <ActionPlanPanel dashboard={dashboard} />
          <RoadmapPanel dashboard={dashboard} />
        </div>
        <aside className="hidden xl:flex" style={{ flexDirection: 'column', borderLeft: '1px solid var(--line, #d8cfbd)', padding: '40px 28px', background: 'rgba(254,251,244,0.5)', alignSelf: 'start', position: 'sticky', top: 24 }}>
          <RailLaunchCountdown />
          <RailTasksSection tasks={railTasks} />
        </aside>
      </div>

      <CoachCopyStrip dashboard={dashboard} />
    </div>
  )
}
