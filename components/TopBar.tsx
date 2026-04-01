'use client'
// components/TopBar.tsx
import Link from 'next/link'

interface TopBarProps {
  user: { name?: string | null; email?: string | null; id: string }
}

export function TopBar({ user }: TopBarProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <header
      className="px-8 h-[56px] flex items-center justify-between flex-shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}
    >
      <div>
        <div className="font-serif text-[17px] tracking-tight leading-none" style={{ color: '#1E2D3D' }}>
          Good morning{user.name ? `, ${user.name.split(' ')[0]}` : ''}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
          {dateStr}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(52,211,153,0.1)', color: '#0f6b46' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Connected
        </div>
        <Link
          href="/dashboard/upload"
          className="px-4 py-1.5 rounded-lg text-[12.5px] font-semibold no-underline transition-all"
          style={{ background: '#e9a020', color: '#0d1f35' }}
        >
          Upload Files
        </Link>
      </div>
    </header>
  )
}
