'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { House, UploadSimple, GraduationCap, Gear, SignOut } from '@phosphor-icons/react'
import {
  IconKDP, IconMeta, IconMailerLite, IconPinterest, IconSwaps,
  IconMetrics, IconRank, IconROAS, IconListBuilding, IconMyData,
} from '@/components/icons'

type NavItem = { label: string; href: string; render: (active: boolean) => React.ReactNode }

function phosphor(Icon: typeof House) {
  return (active: boolean) => <Icon size={18} weight={active ? 'fill' : 'regular'} />
}

function custom(Icon: (props: { size?: number; color?: string }) => React.ReactNode, color: string) {
  return (_active: boolean) => <Icon size={18} color={color} />
}

const NAV_ITEMS: NavItem[] = [
  { label: 'My Dashboard',     href: '/dashboard',        render: phosphor(House) },
  { label: 'Upload & Analyze', href: '/dashboard/upload',  render: phosphor(UploadSimple) },
]

const CHANNEL_ITEMS: NavItem[] = [
  { label: 'KDP',              href: '/dashboard/kdp',        render: custom(IconKDP, '#E9A020') },
  { label: 'Meta / Facebook',  href: '/dashboard/meta',       render: custom(IconMeta, '#60A5FA') },
  { label: 'MailerLite',       href: '/dashboard/mailerlite',  render: custom(IconMailerLite, '#34d399') },
  { label: 'Newsletter Swaps', href: '/dashboard/swaps',      render: custom(IconSwaps, '#E9A020') },
  { label: 'Pinterest',        href: '/dashboard/pinterest',   render: custom(IconPinterest, '#fb7185') },
]

const TOOL_ITEMS: NavItem[] = [
  { label: 'Advanced Metrics',   href: '/dashboard/metrics',       render: custom(IconMetrics, '#E9A020') },
  { label: 'Rank Tracker',       href: '/dashboard/rank',          render: custom(IconRank, '#34d399') },
  { label: 'Daily ROAS Log',     href: '/dashboard/roas',          render: custom(IconROAS, '#E9A020') },
  { label: 'List Building ROAS', href: '/dashboard/list-building',  render: custom(IconListBuilding, '#34d399') },
  { label: 'Learn the Terms',    href: '/dashboard/learn',          render: phosphor(GraduationCap) },
  { label: 'Settings',           href: '/dashboard/settings',       render: phosphor(Gear) },
  { label: 'My Data',            href: '/dashboard/data-vault',     render: custom(IconMyData, '#fb7185') },
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

  function NavLink({ href, render, label }: NavItem) {
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
        {render(active)}
        {label}
      </Link>
    )
  }

  return (
    <aside
      className="w-[235px] flex-shrink-0 flex-col hidden md:flex"
      style={{ background: '#F5F0E8', borderRight: '1px solid #E8DDD0' }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="block px-5 py-6 no-underline hover:opacity-80 transition-opacity"
        style={{ borderBottom: '1px solid #E8DDD0' }}>
        <div>
          <span style={{ color: '#1E2D3D', fontWeight: 600, fontSize: '18px' }}>Author</span>
          <span style={{ color: '#E9A020', fontWeight: 600, fontSize: '18px' }}>Dash</span>
        </div>
        <span className="inline-block mt-1 text-[10px] font-semibold tracking-[0.05em]"
          style={{ background: '#FFF4E0', color: '#E9A020', padding: '2px 8px', borderRadius: 20 }}>
          BETA
        </span>
      </Link>

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
