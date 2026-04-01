'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  House,
  UploadSimple,
  BookOpen,
  Megaphone,
  EnvelopeSimple,
  ArrowsClockwise,
  PushPin,
  ChartBar,
  TrendUp,
  CurrencyDollar,
  ListPlus,
  GraduationCap,
  Gear,
  Lock,
  SignOut,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

const NAV_ITEMS: { label: string; href: string; icon: Icon }[] = [
  { label: 'My Dashboard',   href: '/dashboard',        icon: House },
  { label: 'Upload & Analyze', href: '/dashboard/upload', icon: UploadSimple },
]

const CHANNEL_ITEMS: { label: string; href: string; icon: Icon }[] = [
  { label: 'KDP',              href: '/dashboard/kdp',        icon: BookOpen },
  { label: 'Meta / Facebook',  href: '/dashboard/meta',       icon: Megaphone },
  { label: 'MailerLite',       href: '/dashboard/mailerlite',  icon: EnvelopeSimple },
  { label: 'Newsletter Swaps', href: '/dashboard/swaps',      icon: ArrowsClockwise },
  { label: 'Pinterest',        href: '/dashboard/pinterest',   icon: PushPin },
]

const TOOL_ITEMS: { label: string; href: string; icon: Icon }[] = [
  { label: 'Advanced Metrics',  href: '/dashboard/metrics',       icon: ChartBar },
  { label: 'Rank Tracker',      href: '/dashboard/rank',          icon: TrendUp },
  { label: 'Daily ROAS Log',    href: '/dashboard/roas',          icon: CurrencyDollar },
  { label: 'List Building ROAS', href: '/dashboard/list-building', icon: ListPlus },
  { label: 'Learn the Terms',   href: '/dashboard/learn',         icon: GraduationCap },
  { label: 'Settings',          href: '/dashboard/settings',      icon: Gear },
  { label: 'My Data',           href: '/dashboard/data-vault',    icon: Lock },
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

  function NavLink({ href, icon: IconComp, label }: { href: string; icon: Icon; label: string }) {
    const active = isActive(href)
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px]
                    mb-0.5 transition-all duration-150 no-underline
                    ${active ? 'font-semibold' : ''}`}
        style={{
          color:      active ? '#e9a020' : '#1E2D3D',
          background: active ? 'rgba(233,160,32,0.1)' : undefined,
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget.style.background = '#EDE8DF') }}
        onMouseLeave={e => { if (!active) (e.currentTarget.style.background = '') }}
      >
        <IconComp size={18} weight={active ? 'fill' : 'regular'} />
        {label}
      </Link>
    )
  }

  return (
    <aside
      className="w-[235px] flex-shrink-0 flex flex-col hidden md:flex"
      style={{ background: '#F5F0E8', borderRight: '1px solid #E8DDD0' }}
    >
      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid #E8DDD0' }}>
        <div className="font-serif text-[16px] leading-snug">
          <span style={{ color: '#1E2D3D' }}>Author</span>
          <span style={{ color: '#e9a020' }}>Dash</span>
        </div>
        <span className="inline-block text-[9px] font-bold tracking-[1.5px] uppercase mt-1 px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(233,160,32,0.15)', color: '#e9a020' }}>
          BETA
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pt-3 pb-1.5"
          style={{ color: '#9CA3AF' }}>
          Overview
        </div>
        {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: '#9CA3AF' }}>
          Channel Deep Dives
        </div>
        {CHANNEL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: '#9CA3AF' }}>
          Tools
        </div>
        {TOOL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* User */}
      <div className="px-2.5 py-4" style={{ borderTop: '1px solid #E8DDD0' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{ background: 'white' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#e9a020', color: '#0d1f35' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold truncate" style={{ color: '#1E2D3D' }}>
              {session?.user?.name}
            </div>
            <div className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
              {session?.user?.email}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1 rounded transition-all duration-150 bg-transparent border-none cursor-pointer"
            style={{ color: '#9CA3AF' }}
            title="Sign out"
          >
            <SignOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
