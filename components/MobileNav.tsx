'use client'
// components/MobileNav.tsx — hamburger + slide-out drawer for mobile
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  List,
  X,
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
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

const ALL_NAV: { label: string; href: string; icon: Icon; section?: string }[] = [
  { section: 'Overview', label: 'My Dashboard',     href: '/dashboard',            icon: House },
  { label: 'Upload & Analyze',                      href: '/dashboard/upload',     icon: UploadSimple },
  { section: 'Channels', label: 'KDP',              href: '/dashboard/kdp',        icon: BookOpen },
  { label: 'Meta / Facebook',                       href: '/dashboard/meta',       icon: Megaphone },
  { label: 'MailerLite',                             href: '/dashboard/mailerlite', icon: EnvelopeSimple },
  { label: 'Newsletter Swaps',                      href: '/dashboard/swaps',      icon: ArrowsClockwise },
  { label: 'Pinterest',                              href: '/dashboard/pinterest',  icon: PushPin },
  { section: 'Tools', label: 'Advanced Metrics',    href: '/dashboard/metrics',    icon: ChartBar },
  { label: 'Rank Tracker',                          href: '/dashboard/rank',       icon: TrendUp },
  { label: 'Daily ROAS Log',                        href: '/dashboard/roas',       icon: CurrencyDollar },
  { label: 'List Building ROAS',                    href: '/dashboard/list-building', icon: ListPlus },
  { label: 'Learn the Terms',                       href: '/dashboard/learn',      icon: GraduationCap },
  { label: 'Settings',                               href: '/dashboard/settings',   icon: Gear },
  { label: 'My Data',                                href: '/dashboard/data-vault', icon: Lock },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 h-[52px] flex-shrink-0"
        style={{ background: '#F5F0E8', borderBottom: '1px solid #E8DDD0' }}>
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer"
          style={{ color: '#1E2D3D' }}
          aria-label="Open menu"
        >
          <List size={24} />
        </button>
        <div className="font-serif text-[15px]">
          <span style={{ color: '#1E2D3D' }}>Author</span>
          <span style={{ color: '#e9a020' }}>Dash</span>
        </div>
        <Link
          href="/dashboard/upload"
          className="w-10 h-10 flex items-center justify-center rounded-lg no-underline"
          style={{ background: '#e9a020', color: '#0d1f35' }}
          aria-label="Upload files"
        >
          <UploadSimple size={18} weight="bold" />
        </Link>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          {/* Drawer */}
          <nav
            className="absolute top-0 left-0 bottom-0 w-[280px] overflow-y-auto"
            style={{ background: '#F5F0E8' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #E8DDD0' }}>
              <div className="font-serif text-[16px]">
                <span style={{ color: '#1E2D3D' }}>Author</span>
                <span style={{ color: '#e9a020' }}>Dash</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer"
                style={{ color: '#1E2D3D' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav items */}
            <div className="px-3 py-4">
              {ALL_NAV.map((item, i) => {
                const active = isActive(item.href)
                const IconComp = item.icon
                return (
                  <div key={item.href}>
                    {item.section && (
                      <div className={`text-[10px] font-bold tracking-[1.8px] uppercase px-3 pb-1.5 ${i > 0 ? 'pt-4' : 'pt-1'}`}
                        style={{ color: '#9CA3AF' }}>
                        {item.section}
                      </div>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] no-underline"
                      style={{
                        color:      active ? '#e9a020' : '#1E2D3D',
                        background: active ? 'rgba(233,160,32,0.1)' : undefined,
                        fontWeight: active ? 600 : 400,
                        minHeight:  44,
                      }}
                    >
                      <IconComp size={20} weight={active ? 'fill' : 'regular'} />
                      {item.label}
                    </Link>
                  </div>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
