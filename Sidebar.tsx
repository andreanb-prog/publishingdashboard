'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const NAV_ITEMS = [
  { label: 'Morning Check-In', href: '/dashboard', icon: '📊', section: 'overview' },
  { label: 'Upload & Analyze', href: '/dashboard/upload', icon: '⚡', section: 'overview' },
]

const CHANNEL_ITEMS = [
  { label: 'KDP', href: '/dashboard/kdp', icon: '📚' },
  { label: 'Meta / Facebook', href: '/dashboard/meta', icon: '📣' },
  { label: 'MailerLite', href: '/dashboard/mailerlite', icon: '📧' },
  { label: 'Newsletter Swaps', href: '/dashboard/swaps', icon: '🔁' },
  { label: 'Pinterest', href: '/dashboard/pinterest', icon: '📌' },
]

const TOOL_ITEMS = [
  { label: 'Rank Tracker', href: '/dashboard/rank', icon: '📈' },
  { label: 'Daily ROAS Log', href: '/dashboard/roas', icon: '💰' },
  { label: 'Learn the Terms', href: '/dashboard/learn', icon: '📖' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const initials = session?.user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U'

  return (
    <aside
      className="w-[235px] flex-shrink-0 flex flex-col"
      style={{ background: '#0d1f35' }}
    >
      {/* Logo */}
      <div className="px-5 py-7 border-b border-white/[0.07]">
        <div className="font-serif text-[15px] text-white leading-snug">
          Publishing <em className="not-italic" style={{ color: '#e9a020' }}>Marketing</em>
          <br />Dashboard
        </div>
        <div className="text-[10px] mt-1 tracking-[1px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          BETA · v0.1
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3">
        <div className="text-[9px] font-bold tracking-[1.8px] uppercase px-3 pt-3 pb-1.5"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          Overview
        </div>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px]
                        mb-0.5 transition-all duration-150 no-underline
                        ${isActive(item.href)
                ? 'font-semibold'
                : 'hover:bg-white/5'
              }`}
            style={{
              color: isActive(item.href) ? '#e9a020' : 'rgba(255,255,255,0.45)',
              background: isActive(item.href) ? 'rgba(233,160,32,0.13)' : undefined,
            }}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="text-[9px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          Channel Deep Dives
        </div>
        {CHANNEL_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px]
                        mb-0.5 transition-all duration-150 no-underline
                        ${isActive(item.href)
                ? 'font-semibold'
                : 'hover:bg-white/[0.04]'
              }`}
            style={{
              color: isActive(item.href) ? '#e9a020' : 'rgba(255,255,255,0.45)',
              background: isActive(item.href) ? 'rgba(233,160,32,0.13)' : undefined,
            }}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="text-[9px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          Tools
        </div>
        {TOOL_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px]
                        mb-0.5 transition-all duration-150 no-underline
                        ${isActive(item.href) ? 'font-semibold' : 'hover:bg-white/5'}`}
            style={{
              color: isActive(item.href) ? '#e9a020' : 'rgba(255,255,255,0.45)',
              background: isActive(item.href) ? 'rgba(233,160,32,0.13)' : undefined,
            }}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-2.5 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#e9a020', color: '#0d1f35' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {session?.user?.name}
            </div>
            <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {session?.user?.email}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-[10px] px-2 py-1 rounded transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            title="Sign out"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
