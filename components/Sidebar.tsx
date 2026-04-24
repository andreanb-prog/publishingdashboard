'use client'
// components/Sidebar.tsx — Boutique v2.3
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, BookOpen, TrendingUp, Mail, ArrowLeftRight, Pin,
  BarChart2, Settings2, Database, LogOut, Rocket, PenTool,
  Search, ListChecks, CalendarDays, DollarSign, GraduationCap, Bot,
} from '@/components/icons'
import type { LucideIcon } from 'lucide-react'

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

type NavItem = {
  label: string
  desc: string
  href: string
  Icon: LucideIcon
  badge?: string
  badgeType?: 'amber' | 'count'
}

const SIMPLE_ITEMS: NavItem[] = [
  { label: 'Today',     desc: 'Your morning snapshot',    href: '/dashboard',                  Icon: LayoutDashboard },
  { label: 'Royalties', desc: 'KDP sales & KENP',         href: '/dashboard/kdp',              Icon: DollarSign,  badge: '+12%', badgeType: 'amber' },
  { label: 'Readers',   desc: 'Your email list',          href: '/dashboard/mailerlite',       Icon: Mail },
  { label: 'Write',     desc: '12-day streak · 1,842 w.', href: '/dashboard/writing-notebook', Icon: PenTool },
  { label: 'Coach',     desc: '3 nudges waiting',         href: '/dashboard/tasks',            Icon: Bot, badge: '3', badgeType: 'count' },
]

const LESS_OFTEN_ITEMS: NavItem[] = [
  { label: 'Settings', desc: 'Account · connections', href: '/dashboard/settings', Icon: Settings2 },
]

const ALL_MAIN: NavItem[] = [
  { label: 'My Dashboard',    desc: 'Overview & insights', href: '/dashboard',       Icon: LayoutDashboard },
  { label: 'Task Center',     desc: 'Your action plan',    href: '/dashboard/tasks', Icon: ListChecks },
  { label: 'Launch Planner',  desc: 'Book launches',       href: '/dashboard/launch', Icon: Rocket },
  { label: 'Content Planner', desc: 'Plan content',        href: '/content',          Icon: CalendarDays },
]

const ALL_CHANNELS: NavItem[] = [
  { label: 'KDP',             desc: 'Amazon royalties',  href: '/dashboard/kdp',         Icon: BookOpen },
  { label: 'Meta / Facebook', desc: 'Ad performance',    href: '/dashboard/meta',        Icon: TrendingUp },
  { label: 'MailerLite',      desc: 'Email list',        href: '/dashboard/mailerlite',  Icon: Mail },
  { label: 'Swaps & Promos',  desc: 'Newsletter swaps',  href: '/dashboard/swaps',       Icon: ArrowLeftRight },
  { label: 'Pinterest',       desc: 'Pinterest traffic', href: '/dashboard/pinterest',   Icon: Pin },
]

const ALL_TOOLS: NavItem[] = [
  { label: 'Category Research', desc: 'Research categories', href: '/dashboard/kdp#category-intelligence', Icon: Search },
  { label: 'Advanced Metrics',  desc: 'Deep analytics',      href: '/dashboard/metrics',    Icon: BarChart2 },
  { label: 'ROAS Hub',          desc: 'Ad returns tracking', href: '/dashboard/rank',       Icon: BarChart2 },
  { label: 'Learn the Terms',   desc: 'Publishing terms',    href: '/dashboard/learn',      Icon: GraduationCap },
  { label: 'My Data',           desc: 'Raw data vault',      href: '/dashboard/data-vault', Icon: Database },
  { label: 'Settings',          desc: 'Account · connections', href: '/dashboard/settings', Icon: Settings2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')
  const [mode, setMode] = useState<'simple' | 'all'>('simple')
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')

  useEffect(() => {
    try {
      const m = localStorage.getItem('sidebar-mode')
      if (m === 'all' || m === 'simple') setMode(m as 'simple' | 'all')
    } catch {}
  }, [])

  function toggleMode(next: 'simple' | 'all') {
    setMode(next)
    try { localStorage.setItem('sidebar-mode', next) } catch {}
  }

  const isActive = (href: string) => {
    const base = href.split('#')[0]
    if (base === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(base)
  }

  function NavLink({ label, desc, href, Icon, badge, badgeType }: NavItem) {
    const active = isActive(href)
    return (
      <Link
        href={href}
        className="flex items-center gap-2.5 w-full no-underline mb-0.5 transition-all duration-150"
        style={{ borderRadius: 2, padding: '7px 8px', background: active ? 'var(--ink)' : 'transparent' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--paper2)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'var(--amber-boutique)' : 'var(--paper2)',
        }}>
          <Icon size={16} strokeWidth={1.75} color={active ? '#fff' : 'var(--ink3)'} />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{
            fontSize: 14, fontWeight: 500, lineHeight: 1.2,
            color: active ? 'var(--paper)' : 'var(--ink)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 11, lineHeight: 1.2, marginTop: 1,
            color: active ? 'rgba(247,241,229,0.65)' : 'var(--ink4)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {desc}
          </div>
        </div>
        {badge && (
          <span style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 10, fontWeight: 600, flexShrink: 0,
            padding: '2px 6px', borderRadius: 2,
            background: badgeType === 'amber' ? 'var(--amber-soft)' : 'var(--amber-boutique)',
            color: badgeType === 'amber' ? 'var(--amber-text)' : '#fff',
          }}>
            {badge}
          </span>
        )}
      </Link>
    )
  }

  function SectionLabel({ children }: { children: string }) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 10, fontWeight: 500,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'var(--ink4)', padding: '14px 8px 5px',
      }}>
        {children}
      </div>
    )
  }

  return (
    <aside
      className="w-[240px] flex-shrink-0 flex-col hidden md:flex"
      style={{
        background: 'var(--paper)',
        borderRight: '1px solid var(--line)',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Brand block */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Link href="/dashboard" className="no-underline hover:opacity-80 transition-opacity">
          <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>Author</span>
          <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 20, fontWeight: 500, fontStyle: 'italic', color: 'var(--amber-boutique)' }}>Dash</span>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, color: 'var(--ink4)', marginTop: 3 }}>v2.0</span>
      </div>

      {/* Simple / Show all toggle */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6 }}>
        {(['simple', 'all'] as const).map(m => (
          <button
            key={m}
            onClick={() => toggleMode(m)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 2,
              fontSize: 11.5, fontWeight: 500,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: mode === m ? 'none' : '1px solid var(--line)',
              background: mode === m ? 'var(--ink)' : 'var(--paper)',
              color: mode === m ? 'var(--paper)' : 'var(--ink3)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {m === 'simple' ? 'Simple' : 'Show all'}
          </button>
        ))}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 8px 0' }}>
        {mode === 'simple' ? (
          <>
            {SIMPLE_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
            <SectionLabel>Less often</SectionLabel>
            {LESS_OFTEN_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
          </>
        ) : (
          <>
            <SectionLabel>Overview</SectionLabel>
            {ALL_MAIN.map(item => <NavLink key={item.href} {...item} />)}
            <SectionLabel>Channels</SectionLabel>
            {ALL_CHANNELS.map(item => <NavLink key={item.href} {...item} />)}
            <SectionLabel>Tools</SectionLabel>
            {ALL_TOOLS.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--line)', marginTop: 'auto' }}>
        {/* Text size controls */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {(['sm', 'md', 'lg'] as const).map((size, i) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              style={{
                flex: 1, padding: '4px 0', borderRadius: 2,
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: [13, 15, 17][i],
                fontWeight: 500,
                border: 'none',
                background: fontSize === size ? 'var(--ink)' : 'var(--paper2)',
                color: fontSize === size ? 'var(--paper)' : 'var(--ink3)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              A
            </button>
          ))}
        </div>

        {/* Contact */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11.5, color: 'var(--ink3)', marginBottom: 1 }}>
            Need a hand? Call{' '}
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontWeight: 700, color: 'var(--ink)' }}>Andrea</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10.5, color: 'var(--ink4)' }}>
            (555) 000-0000
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 8px', borderRadius: 2, fontSize: 11.5,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink4)', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--paper2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <LogOut size={13} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
