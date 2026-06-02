'use client'
// components/MobileNav.tsx — hamburger + slide-out drawer for mobile
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { List, X, House, UploadSimple, GraduationCap, Gear } from '@phosphor-icons/react'

function openUploadModal() {
  try { window.dispatchEvent(new CustomEvent('open-upload-modal')) } catch {}
}
import { Rocket } from 'lucide-react'
import {
  IconKDP, IconMeta, IconMailerLite, IconPinterest,
  IconMetrics, IconRank, IconMyData,
} from '@/components/icons'

type NavEntry = {
  label: string
  href: string
  render: () => React.ReactNode
  section?: string
}

function ph(Icon: typeof House) {
  return () => <Icon size={20} />
}

function ic(Icon: (props: { size?: number; color?: string }) => React.ReactNode, color: string) {
  return () => <Icon size={20} color={color} />
}

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

const ALL_NAV: NavEntry[] = [
  { section: 'Overview', label: 'My Dashboard',   href: '/dashboard',              render: ph(House) },
  { section: 'Channels', label: 'KDP',            href: '/dashboard/kdp',          render: ic(IconKDP, '#E9A020') },
  { label: 'Meta / Facebook',                     href: '/dashboard/meta',         render: ic(IconMeta, '#60A5FA') },
  { label: 'MailerLite',                           href: '/dashboard/mailerlite',   render: ic(IconMailerLite, '#34d399') },
  { section: 'Tools', label: 'Advanced Metrics',  href: '/dashboard/metrics',      render: ic(IconMetrics, '#E9A020') },
  { label: 'Settings',                             href: '/dashboard/settings',     render: ph(Gear) },
  { label: 'My Data',                              href: '/dashboard/data-vault',   render: ic(IconMyData, '#fb7185') },
]

const DEV_NAV: NavEntry[] = [
  { label: 'Content Planner',  href: '/content',              render: () => <Rocket size={20} color="#6B7280" /> },
  { label: 'Launch Planner',   href: '/dashboard/launch',     render: () => <Rocket size={20} color="#6B7280" /> },
  { label: 'ROAS Hub',         href: '/dashboard/rank',       render: ic(IconRank, '#6B7280') },
  { label: 'Pinterest',        href: '/dashboard/pinterest',  render: ic(IconPinterest, '#6B7280') },
  { label: 'Learn the Terms',  href: '#',                     render: ph(GraduationCap) },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')
  const navItems = ALL_NAV.filter(item => item.href !== '/dashboard/list-building' || isAdmin)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 h-[52px] flex-shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}>
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer"
          style={{ color: '#1E2D3D' }}
          aria-label="Open menu"
        >
          <List size={24} />
        </button>
        <div className="text-[15px]" style={{ fontFamily: "var(--font-sans)" }}>
          <span style={{ color: '#4A7290', fontWeight: 700 }}>Author</span>
          <span style={{ color: '#E9A020', fontWeight: 700 }}>Dash</span>
        </div>
        <button
          onClick={openUploadModal}
          className="w-10 h-10 flex items-center justify-center rounded-lg"
          style={{ background: '#e9a020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
          aria-label="Upload files"
        >
          <UploadSimple size={18} weight="bold" />
        </button>
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
            style={{ background: '#FFFFFF' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #EEEBE6' }}>
              <div className="text-[16px]" style={{ fontFamily: "var(--font-sans)" }}>
                <span style={{ color: '#4A7290', fontWeight: 700 }}>Author</span>
                <span style={{ color: '#E9A020', fontWeight: 700 }}>Dash</span>
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
              {navItems.map((item, i) => {
                const active = isActive(item.href)
                return (
                  <div key={item.href}>
                    {item.section && (
                      <div className={`text-[10px] font-bold tracking-[1.8px] uppercase px-3 pb-1.5 ${i > 0 ? 'pt-4' : 'pt-1'}`}
                        style={{ color: '#6B7280' }}>
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
                      {item.render()}
                      {item.label}
                    </Link>
                  </div>
                )
              })}

              {/* In Development */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EEEBE6' }}>
                <div className="text-[10px] font-bold tracking-[1.8px] uppercase px-3 pb-1.5 pt-1"
                  style={{ color: 'rgba(30,45,61,0.4)' }}>
                  In Development
                </div>
                {DEV_NAV.map(item => {
                  const nonClickable = item.href === '#'
                  const inner = (
                    <div
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-[14px]"
                      style={{ opacity: 0.5, minHeight: 44, color: '#1E2D3D', fontWeight: 400, cursor: nonClickable ? 'default' : undefined }}
                    >
                      {item.render()}
                      {item.label}
                    </div>
                  )
                  if (nonClickable) return <div key={item.href}>{inner}</div>
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="no-underline block"
                    >
                      {inner}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
