'use client'
// app/(dashboard)/swaps/page.tsx
import { DarkPage, DarkCoachBox } from '@/components/DarkPage'

const UPCOMING_SWAPS = [
  { partner: 'Mandy Baker + Madison Brooke', date: 'Apr 1', direction: '📣', list: '1,038 / 1,532', status: 'Applied', statusColor: '#fbbf24' },
  { partner: 'Chloe Horne #3', date: 'Apr 6', direction: '📣 + ♥️', list: '8,198', status: 'Approved', statusColor: '#34d399' },
  { partner: 'Zoe Dawson + Ava Bloome + 4 more', date: 'Apr 6', direction: '♥️', list: 'Various', status: 'Approved', statusColor: '#34d399' },
  { partner: 'Tessa Sloan', date: 'Apr 9', direction: '📣', list: '4,288', status: 'Applied — follow up', statusColor: '#fb7185' },
  { partner: 'Lisa Monroe + Lucy Barbee', date: 'Apr 13', direction: '📣', list: 'Various', status: 'Approved', statusColor: '#34d399' },
  { partner: 'Rachel J. Green', date: 'Apr 18', direction: '📣', list: '9,451', status: 'Applied — follow up', statusColor: '#fb7185' },
  { partner: 'Brandi Creek (FPA)', date: 'Apr 21', direction: '📣', list: '2,703', status: 'Approved', statusColor: '#34d399' },
  { partner: 'Lily-Mae Montana', date: 'Apr 30', direction: '📣 + ♥️', list: '1,168', status: 'Decision needed', statusColor: '#fbbf24' },
]

export default function SwapsPage() {
  return (
    <DarkPage title="🔁 Newsletter Swaps" subtitle="BookClicker · BookFunnel · Swap Calendar">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3.5 mb-7">
        {[
          { label: 'Active April Swaps', value: '18+', sub: 'Confirmed + applied', color: '#34d399' },
          { label: 'Next Send', value: 'Apr 1', sub: 'Mandy Baker + Madison', color: '#fbbf24' },
          { label: 'Needs Follow-up', value: '3', sub: 'Applied, not confirmed', color: '#fb7185' },
          { label: 'Best March Click', value: '1,949', sub: 'Hot Fire Romance Promos', color: '#38bdf8' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-4.5 relative overflow-hidden"
            style={{ background: '#1c1917', border: '1px solid #292524' }}>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, ${item.color}40, ${item.color})` }} />
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2" style={{ color: '#a8a29e' }}>
              {item.label}
            </div>
            <div className="font-mono text-[26px] font-medium leading-none mb-1.5" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="text-[11px]" style={{ color: '#a8a29e' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <DarkCoachBox color="#fb7185">
        April 6 has 6+ sends scheduled — this will spike your unsubscribe rate. Batch all April 6
        outbound swaps into 2 emails maximum. A "Fresh Reads" roundup works perfectly. Your readers
        won't notice the difference but your list health will recover. You already saw 34 unsubscribes
        in March from over-sending — don't repeat it.
      </DarkCoachBox>

      {/* Swap calendar */}
      <div className="rounded-xl overflow-hidden mb-5"
        style={{ background: '#1c1917', border: '1px solid #292524' }}>
        <div className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid #292524' }}>
          <div className="font-serif text-[17px]" style={{ color: '#fafaf9' }}>April Swap Calendar</div>
          <div className="flex gap-2">
            <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>📣 Inbound</span>
            <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(251,113,133,0.12)', color: '#fb7185' }}>♥️ Outbound</span>
          </div>
        </div>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr style={{ background: '#292524' }}>
              {['Partner', 'Date', 'Direction', 'List Size', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                  style={{ color: '#a8a29e' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UPCOMING_SWAPS.map((swap, i) => (
              <tr key={i} className="border-t hover:bg-white/[0.02] transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3 font-semibold" style={{ color: '#fafaf9' }}>{swap.partner}</td>
                <td className="px-4 py-3 font-mono" style={{ color: '#a8a29e' }}>{swap.date}</td>
                <td className="px-4 py-3">{swap.direction}</td>
                <td className="px-4 py-3 font-mono" style={{ color: '#a8a29e' }}>{swap.list}</td>
                <td className="px-4 py-3">
                  <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: `${swap.statusColor}20`,
                      color: swap.statusColor,
                    }}>
                    {swap.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Direction key */}
      <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
        <div className="text-[12px] font-bold uppercase tracking-[1px] mb-3" style={{ color: '#a8a29e' }}>How swaps work</div>
        <div className="grid grid-cols-2 gap-4 text-[12.5px]" style={{ color: '#d6d3d1' }}>
          <div>
            <span className="font-bold" style={{ color: '#34d399' }}>📣 Inbound</span> — They promote your book to their list.
            Great for rank boosts and new reader discovery.
          </div>
          <div>
            <span className="font-bold" style={{ color: '#fb7185' }}>♥️ Outbound</span> — You promote their book to your list.
            Keep these batched to avoid fatigue. Max 2–3 per send.
          </div>
        </div>
      </div>
    </DarkPage>
  )
}
