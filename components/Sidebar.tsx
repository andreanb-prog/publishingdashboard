'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, BookOpen, TrendingUp, Mail, ArrowLeftRight, Pin,
  BarChart2, ArrowUpRight, DollarSign, Users, GraduationCap,
  Settings2, Database, LogOut, Rocket, Palette, PenLine, CheckSquare,
} from '@/components/icons'
import type { LucideIcon } from 'lucide-react'

type NavItem = { label: string; href: string; Icon: LucideIcon }

const NAV_ITEMS: NavItem[] = [
  { label: 'My Dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { label: 'Launch Planner', href: '/dashboard/launch', Icon: Rocket },
  { label: 'Task Center', href: '/dashboard/tasks', Icon: CheckSquare },
  { label: 'Creative Hub', href: '/dashboard/creative', Icon: Palette },
  { label: 'Writing Notebook', href: '/writing-notebook', Icon: PenLine },
]

const CHANNEL_ITEMS: NavItem[] = [
  { label: 'KDP',              href: '/dashboard/kdp',           Icon: BookOpen     },
  { label: 'Meta / Facebook',  href: '/dashboard/meta',          Icon: TrendingUp   },
  { label: 'MailerLite',       href: '/dashboard/mailerlite',    Icon: Mail         },
  { label: 'Swaps & Promos',   href: '/dashboard/swaps',         Icon: ArrowLeftRight },
  { label: 'Pinterest',        href: '/dashboard/pinterest',     Icon: Pin          },
]

const TOOL_ITEMS: NavItem[] = [
  { label: 'Advanced Metrics',   href: '/dashboard/metrics',       Icon: BarChart2      },
  { label: 'Rank Tracker',       href: '/dashboard/rank',          Icon: ArrowUpRight   },
  { label: 'Learn the Terms',    href: '/dashboard/learn',         Icon: GraduationCap  },
  { label: 'Settings',           href: '/dashboard/settings',      Icon: Settings2      },
  { label: 'My Data',            href: '/dashboard/data-vault',    Icon: Database       },
]

const ADMIN_TOOL_ITEMS: NavItem[] = [
  { label: 'Daily ROAS Log',     href: '/dashboard/roas',          Icon: DollarSign     },
  { label: 'List Building ROAS', href: '/dashboard/list-building', Icon: Users          },
]

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')

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

  function NavLink({ href, Icon, label }: NavItem) {
    const active = isActive(href)
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px]
                    mb-0.5 transition-all duration-150 no-underline
                    ${active ? 'font-semibold' : ''}`}
        style={{
          color:      active ? '#E9A020' : '#1E2D3D',
          background: active ? 'rgba(233,160,32,0.1)' : undefined,
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget.style.background = '#F5F5F4') }}
        onMouseLeave={e => { if (!active) (e.currentTarget.style.background = '') }}
      >
        <Icon size={16} strokeWidth={1.75} />
        {label}
      </Link>
    )
  }

  return (
    <aside
      className="w-[235px] flex-shrink-0 flex-col hidden md:flex"
      style={{ background: '#FFFFFF', borderRight: '1px solid #EEEBE6' }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="block px-5 py-6 no-underline hover:opacity-80 transition-opacity"
        style={{ borderBottom: '1px solid #EEEBE6' }}>
        <div>
          <span style={{ color: '#4A7290', fontWeight: 700, fontSize: '18px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Author</span>
          <span style={{ color: '#E9A020', fontWeight: 700, fontSize: '18px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dash</span>
        </div>
        <span className="inline-block mt-1 text-[10px] font-semibold tracking-[0.05em]"
          style={{ background: '#FFF4E0', color: '#E9A020', padding: '2px 8px', borderRadius: 20 }}>
          BETA
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pt-3 pb-1.5"
          style={{ color: '#6B7280' }}>
          Overview
        </div>
        {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: '#6B7280' }}>
          Channel Deep Dives
        </div>
        {CHANNEL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}

        <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pt-5 pb-1.5"
          style={{ color: '#6B7280' }}>
          Tools
        </div>
        {TOOL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
        {isAdmin && ADMIN_TOOL_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* User */}
      <div className="px-2.5 py-4" style={{ borderTop: '1px solid #EEEBE6' }}>
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
            <div className="text-[10px] truncate" style={{ color: '#6B7280' }}>
              {session?.user?.email}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1 rounded transition-all duration-150 bg-transparent border-none cursor-pointer"
            style={{ color: '#6B7280' }}
            title="Sign out"
          >
            <LogOut size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}
