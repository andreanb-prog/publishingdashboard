'use client'
// components/TopBar.tsx
import Link from 'next/link'

interface TopBarProps {
  user: { name?: string | null; email?: string | null; id: string }
}

export function TopBar({ user }: TopBarProps) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <header className="bg-white border-b border-stone-200 px-8 h-[60px] flex items-center justify-between flex-shrink-0">
      <div>
        <div className="font-serif text-[19px] text-[#0d1f35] tracking-tight leading-none">
          Good morning{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
        </div>
        <div className="text-[11px] text-stone-400 mt-0.5">
          Your marketing coach is ready when you are.
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: '#eaf7f1', color: '#0f6b46' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          All systems connected
        </div>
        <Link
          href="/dashboard/upload"
          className="btn-primary text-[13px] no-underline"
        >
          Upload Files
        </Link>
      </div>
    </header>
  )
}
