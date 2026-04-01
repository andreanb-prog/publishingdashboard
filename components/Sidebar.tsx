'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const NAV_ITEMS = [
  { label: 'My Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Upload & Analyze', href: '/dashboard/upload', icon: '⚡' },
]

const CHANNEL_ITEMS = [
  { label: 'KDP', href: '/dashboard/kdp', icon: '📚' },
  { label: 'Meta / Facebook', href: '/dashboard/meta', icon: '📣' },
  { label: 'MailerLite', href: '/dashboard/mailerlite', icon: '📧' },
  { label: 'Newsletter Swaps', href: '/dashboard/swaps', icon: '🔁' },
  { label: 'Pinterest', href: '/dashboard/pinterest', icon: '📌' },
]

const TOOL_ITEMS = [
  { label: 'Advanced Metrics', href: '/dashboard/metrics', icon: '📊' },
  { label: 'Rank Tracker',     href: '/dashboard/rank',    icon: '📈' },
  { label: 'Daily ROAS Log',   href: '/dashboard/roas',    icon: '💰' },
  { label: 'Learn the Terms',  href: '/dashboard/learn',   icon: '📖' },
  { label: 'Settings',         href: '/dashboard/settings', icon: '⚙️' },
]

const INACTIVE_COLOR  = 'rgba(255,255,255,0.70)'
const ACTIVE_COLOR    = '#e9a020'
const ACTIVE_BG       = 'rgba(233,160,32,0.13)'
const SECTION_COLOR   = 'rgba(255,255,255,0.35)'

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

  function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
    const active = isActive(href)
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px]
                    mb-0.5 transition-all duration-150 no-underline
                    ${active ? 'font-semibold' : 'hover:bg-white/5'}`}
        style={{ color: active ? ACTIVE_COLOR : INACTIVE_COLOR, background: active ? ACTIVE_BG : undefined }}
      >
        <span className="text-base w-5 text-center">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <aside className="w-[235px] flex-shrink-0 flex flex-col" style={{ background: '#0d1f35' }}>
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
          style={{ color: SECTION_COLOR }}>
          Overview
        </div>
        {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        <div className="text-[9px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: SECTION_COLOR }}>
          Channel Deep Dives
        </div>
        {CHANNEL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        <div className="text-[9px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: SECTION_COLOR }}>
          Tools
        </div>
        {TOOL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* User */}
      <div className="px-2.5 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#e9a020', color: '#0d1f35' }}>
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
