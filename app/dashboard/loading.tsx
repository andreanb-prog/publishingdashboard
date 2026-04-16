// app/dashboard/loading.tsx
// Next.js streaming skeleton — shown instantly while the server component fetches data.
// Uses cream #FFF8F0 animated pulse divs matching each dashboard section.
export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-[1400px]">
      <div className="animate-pulse space-y-4">
        {/* Header / greeting */}
        <div className="h-10 w-64 rounded-lg" style={{ background: '#FFF8F0' }} />
        <div className="h-4 w-48 rounded" style={{ background: '#FFF8F0' }} />

        {/* Hero metric cards (Est Revenue, Units, KENP, Best CTR) */}
        <div className="rounded-xl py-6 px-4 sm:px-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-3 w-16 rounded" style={{ background: '#FFF8F0' }} />
                <div className="h-8 w-24 rounded" style={{ background: '#FFF8F0' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Today's Priorities section */}
        <div>
          <div className="h-6 w-40 rounded mb-2" style={{ background: '#FFF8F0' }} />
          <div className="h-4 w-72 rounded mb-4" style={{ background: '#FFF8F0' }} />
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: i < 3 ? '0.5px solid #EEEBE6' : 'none' }}>
                <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: '#FFF8F0' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded" style={{ background: '#FFF8F0' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel cards (KDP, Meta, MailerLite, Pinterest) */}
        <div>
          <div className="h-6 w-48 rounded mb-4" style={{ background: '#FFF8F0' }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded" style={{ background: '#FFF8F0' }} />
                  <div className="h-4 w-20 rounded" style={{ background: '#FFF8F0' }} />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded" style={{ background: '#FFF8F0' }} />
                  <div className="h-3 w-2/3 rounded" style={{ background: '#FFF8F0' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
