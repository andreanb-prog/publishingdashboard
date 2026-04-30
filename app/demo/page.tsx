'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, BookOpen, TrendingUp, Mail, ArrowLeftRight, Pin,
  BarChart2, Settings2, Database, Rocket, PenTool,
  Search, ListChecks, CalendarDays, DollarSign, GraduationCap, Bot,
  X, ChevronDown, Repeat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Hardcoded demo data ───────────────────────────────────────────────────────
const DEMO = {
  authorName: 'Elle',
  kdp: {
    units: 847,
    kenp: 124350,
    royalties: 1243.18,
    estKuRevenue: 559.58,
    totalEstRevenue: 1802.76,
    readerDepth: 146.8,
    books: [
      { shortTitle: 'Fake Dating My Billionaire Protector', units: 423, kenp: 68420, color: '#F97B6B' },
      { shortTitle: 'My Off-Limits Roommate',               units: 291, kenp: 38970, color: '#F4A261' },
      { shortTitle: "My Ex's Secret Baby",                  units: 133, kenp: 16960, color: '#8B5CF6' },
    ],
  },
  meta: {
    spend: 487.23,
    impressions: 42180,
    clicks: 1687,
    ctr: 4.0,
    cpc: 0.29,
    topAd: "He said he'd protect her. He didn't say he'd fall for her.",
    newSubscribers: 203,
  },
  mailerLite: {
    listSize: 2847,
    openRate: 38.2,
    clickRate: 4.7,
    unsubscribes: 14,
  },
  crossChannel: {
    roas: 3.7,
    costPerSubscriber: 2.40,
    costPer1kKenp: 3.92,
  },
}

const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

// ── Sidebar nav definitions — mirrors Sidebar.tsx exactly, links → /demo ─────
type NavItem = { label: string; desc: string; href: string; Icon: LucideIcon; badge?: string; badgeType?: 'amber' | 'count' }

const SIMPLE_ITEMS: NavItem[] = [
  { label: 'Today',     desc: 'Your morning snapshot',    href: '/demo', Icon: LayoutDashboard },
  { label: 'Royalties', desc: 'KDP sales & KENP',         href: '/demo', Icon: DollarSign,  badge: '+12%', badgeType: 'amber' },
  { label: 'Readers',   desc: 'Your email list',          href: '/demo', Icon: Mail },
  { label: 'Write',     desc: '12-day streak · 1,842 w.', href: '/demo', Icon: PenTool },
  { label: 'Coach',     desc: '3 nudges waiting',         href: '/demo', Icon: Bot, badge: '3', badgeType: 'count' },
]
const LESS_OFTEN_ITEMS: NavItem[] = [
  { label: 'Settings', desc: 'Account · connections', href: '/demo', Icon: Settings2 },
]
const ALL_MAIN: NavItem[] = [
  { label: 'My Dashboard',    desc: 'Overview & insights', href: '/demo', Icon: LayoutDashboard },
  { label: 'Task Center',     desc: 'Your action plan',    href: '/demo', Icon: ListChecks },
  { label: 'Launch Planner',  desc: 'Book launches',       href: '/demo', Icon: Rocket },
  { label: 'Content Planner', desc: 'Plan content',        href: '/demo', Icon: CalendarDays },
]
const ALL_CHANNELS: NavItem[] = [
  { label: 'KDP',             desc: 'Amazon royalties',  href: '/demo', Icon: BookOpen },
  { label: 'Meta / Facebook', desc: 'Ad performance',    href: '/demo', Icon: TrendingUp },
  { label: 'MailerLite',      desc: 'Email list',        href: '/demo', Icon: Mail },
  { label: 'Swaps & Promos',  desc: 'Newsletter swaps',  href: '/demo', Icon: ArrowLeftRight },
  { label: 'Pinterest',       desc: 'Pinterest traffic', href: '/demo', Icon: Pin },
]
const ALL_TOOLS: NavItem[] = [
  { label: 'Category Research', desc: 'Research categories', href: '/demo', Icon: Search },
  { label: 'Advanced Metrics',  desc: 'Deep analytics',      href: '/demo', Icon: BarChart2 },
  { label: 'ROAS Hub',          desc: 'Ad returns tracking', href: '/demo', Icon: BarChart2 },
  { label: 'Learn the Terms',   desc: 'Publishing terms',    href: '/demo', Icon: GraduationCap },
  { label: 'My Data',           desc: 'Raw data vault',      href: '/demo', Icon: Database },
  { label: 'Settings',          desc: 'Account · connections', href: '/demo', Icon: Settings2 },
]

// ── Sidebar subcomponents (pixel-matched to Sidebar.tsx) ──────────────────────
function NavLink({ label, desc, Icon, badge, badgeType, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href="/demo"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '7px 8px', borderRadius: 12, textDecoration: 'none', marginBottom: 2,
        background: active ? 'var(--ink)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--amber-boutique)' : 'var(--paper2)',
      }}>
        <Icon size={16} strokeWidth={1.75} color={active ? '#fff' : 'var(--ink3)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2, color: active ? 'var(--paper)' : 'var(--ink)', fontFamily: 'var(--font-sans)' }}>
          {label}
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.2, marginTop: 1, color: active ? 'rgba(247,241,229,0.65)' : 'var(--ink4)', fontFamily: 'var(--font-sans)' }}>
          {desc}
        </div>
      </div>
      {badge && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, flexShrink: 0,
          padding: '2px 6px', borderRadius: 99,
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
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.2em', textTransform: 'uppercase',
      color: 'var(--ink4)', padding: '14px 8px 5px',
    }}>
      {children}
    </div>
  )
}

// ── Demo sidebar — exact structure of Sidebar.tsx ─────────────────────────────
function DemoSidebar({ bannerVisible }: { bannerVisible: boolean }) {
  const [mode, setMode] = useState<'simple' | 'all'>('simple')

  return (
    <aside style={{
      width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--paper)', borderRight: '1px solid var(--line)',
      height: bannerVisible ? 'calc(100vh - 41px)' : '100vh',
      position: 'sticky', top: bannerVisible ? 41 : 0,
      overflowY: 'auto',
    }}>
      {/* Brand block */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Link href="/demo" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>Author</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, fontStyle: 'italic', color: 'var(--amber-boutique)' }}>Dash</span>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink4)', marginTop: 3 }}>v2.0</span>
      </div>

      {/* Simple / Show all toggle */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6 }}>
        {(['simple', 'all'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 8,
              fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--font-sans)',
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
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 0' }}>
        {mode === 'simple' ? (
          <>
            {SIMPLE_ITEMS.map((item, i) => <NavLink key={item.label} {...item} active={i === 0} />)}
            <SectionLabel>Less often</SectionLabel>
            {LESS_OFTEN_ITEMS.map(item => <NavLink key={item.label} {...item} active={false} />)}
          </>
        ) : (
          <>
            <SectionLabel>Overview</SectionLabel>
            {ALL_MAIN.map((item, i) => <NavLink key={item.label} {...item} active={i === 0} />)}
            <SectionLabel>Channels</SectionLabel>
            {ALL_CHANNELS.map(item => <NavLink key={item.label} {...item} active={false} />)}
            <SectionLabel>Tools</SectionLabel>
            {ALL_TOOLS.map(item => <NavLink key={item.label} {...item} active={false} />)}
          </>
        )}
      </nav>

      {/* Footer — sign-out replaced with sign-up CTA */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {(['sm', 'md', 'lg'] as const).map((size, i) => (
            <button
              key={size}
              style={{
                flex: 1, padding: '4px 0', borderRadius: 6,
                fontFamily: 'var(--font-serif)', fontSize: [13, 15, 17][i], fontWeight: 500,
                border: 'none',
                background: size === 'md' ? 'var(--ink)' : 'var(--paper2)',
                color: size === 'md' ? 'var(--paper)' : 'var(--ink3)',
                cursor: 'default',
              }}
            >
              A
            </button>
          ))}
        </div>
        <Link href="/login" style={{
          display: 'block', textAlign: 'center', textDecoration: 'none',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.04em', background: '#E9A020', color: '#1E2D3D',
          padding: '9px 14px', borderRadius: 8,
        }}>
          Get Started Free →
        </Link>
      </div>
    </aside>
  )
}

// ── Content sub-components ────────────────────────────────────────────────────
function MetricTile({ label, value, subtext, delta, isProjection, color }: {
  label: string; value: string; subtext?: string; delta?: string; isProjection?: boolean; color?: string
}) {
  return (
    <div style={{ background: 'var(--card-boutique)', border: '1px solid var(--line)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {color && <span style={{ width: 8, height: 8, background: color, display: 'inline-block', flexShrink: 0 }} />}
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, color: 'var(--ink)', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: 3 }}>
        {isProjection && <span style={{ color: 'var(--amber-boutique)', fontSize: 26 }}>~</span>}
        {value}
      </div>
      {delta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#245c3f' }}>↑ {delta} <span style={{ color: 'var(--ink4)' }}>vs last month</span></div>}
      {subtext && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)' }}>{subtext}</div>}
    </div>
  )
}

function ChannelCard({ label, value, subtext, badge }: { label: string; value: string; subtext?: string; badge?: string }) {
  return (
    <div style={{ background: 'var(--card-boutique)', border: '1px solid var(--line)', padding: '20px 24px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink4)', marginBottom: 12 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {subtext && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', marginTop: 6 }}>{subtext}</div>}
      {badge && (
        <div style={{ display: 'inline-flex', marginTop: 10, background: 'rgba(47,109,78,0.08)', color: '#245c3f', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 2 }}>
          {badge}
        </div>
      )}
    </div>
  )
}

function PriorityCard({ color, label, title, body, expanded, onToggle }: {
  color: string; label: string; title: string; body: string; expanded: boolean; onToggle: () => void
}) {
  return (
    <div style={{ background: 'var(--card-boutique)', border: `1px solid var(--line)`, borderLeft: `3px solid ${color}`, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color, padding: '2px 7px', border: `1px solid ${color}40`, borderRadius: 2 }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)', fontWeight: 400 }}>{title}</span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--ink4)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink3)', margin: '10px 0 0', lineHeight: 1.6 }}>{body}</p>
          <Link href="/login" style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber-boutique)', textDecoration: 'none', letterSpacing: '0.04em' }}>
            Sign up to take action →
          </Link>
        </div>
      )}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>{label}</div>
      <div style={{ height: 1, background: 'var(--line)' }} />
    </div>
  )
}

function InsightRow({ label, value, note, good }: { label: string; value: string; note: string; good: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)' }}>{note}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>{value}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 2, background: good ? 'rgba(47,109,78,0.08)' : 'rgba(176,50,42,0.08)', color: good ? '#245c3f' : '#b0322a' }}>
          {good ? 'Healthy' : 'Watch this'}
        </span>
      </div>
    </div>
  )
}

// ── Main demo page ────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [bannerVisible, setBannerVisible] = useState(true)
  const [expandedPriority, setExpandedPriority] = useState<number | null>(null)

  const { kdp, meta, mailerLite, crossChannel } = DEMO
  const maxUnits = Math.max(...kdp.books.map(b => b.units))
  const maxKenp  = Math.max(...kdp.books.map(b => b.kenp))

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--paper)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky demo banner ── */}
      {bannerVisible && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50, height: 41,
          background: '#E9A020', color: '#1E2D3D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
            You&apos;re viewing a demo with sample data. Ready to see your numbers?{' '}
            <Link href="/login" style={{ color: '#1E2D3D', textDecoration: 'underline', fontWeight: 700 }}>
              Start Free Trial →
            </Link>
          </span>
          <button
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E2D3D', padding: 4, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Two-panel layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <DemoSidebar bannerVisible={bannerVisible} />

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)' }}>
          <div style={{ padding: '40px 48px 80px', maxWidth: 1060 }}>

            {/* Page header */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink4)', marginBottom: 8 }}>Last 30 days · Sample data</p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.1, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>
                Good morning, {DEMO.authorName}.
              </h1>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink3)', margin: '6px 0 0' }}>
                Here&apos;s your publishing snapshot for the Stillwater Series.
              </p>
            </div>

            {/* Revenue KPIs */}
            <SectionDivider label="Revenue" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <MetricTile label="Est. Revenue"  value={fmt$(kdp.totalEstRevenue)} isProjection delta="+$284"   subtext="royalties + KU est." color="#F97B6B" />
              <MetricTile label="Royalties"     value={fmt$(kdp.royalties)}                                    color="#F97B6B" />
              <MetricTile label="KENP Reads"    value={kdp.kenp.toLocaleString()}           delta="+18,200"    color="#F97B6B" />
              <MetricTile label="Units Sold"    value={kdp.units.toLocaleString()}          delta="+63"        color="#F97B6B" />
            </div>

            {/* Today's Priorities */}
            <SectionDivider label="Today's Priorities" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
              <PriorityCard
                color="#F97B6B" label="Scale"
                title="Your Meta CTR is 4.0% — above benchmark. Scale your top ad."
                body={`Your best-performing ad — "${meta.topAd}" — is converting at 4.0% CTR, well above the 1–3% healthy range. Increase your daily budget by 20% this week to capture more KU page reads before momentum fades.`}
                expanded={expandedPriority === 0}
                onToggle={() => setExpandedPriority(expandedPriority === 0 ? null : 0)}
              />
              <PriorityCard
                color="#E9A020" label="Send"
                title="You haven't emailed your list in 8 days — send a re-engagement."
                body={`Your ${mailerLite.listSize.toLocaleString()} subscribers have an open rate of ${mailerLite.openRate}% — that's excellent. A list this warm goes cold fast. Send a short 3-paragraph email today: one story hook, one sales nudge, one link. Don't overthink it.`}
                expanded={expandedPriority === 1}
                onToggle={() => setExpandedPriority(expandedPriority === 1 ? null : 1)}
              />
              <PriorityCard
                color="#60A5FA" label="Watch"
                title={`${mailerLite.unsubscribes} unsubscribes this month — review your welcome sequence.`}
                body="14 unsubscribes is within normal range for a list your size, but check whether they're coming from a specific email in your welcome sequence. If one step is losing readers consistently, a small copy tweak can stop the bleed."
                expanded={expandedPriority === 2}
                onToggle={() => setExpandedPriority(expandedPriority === 2 ? null : 2)}
              />
            </div>

            {/* What's Working */}
            <SectionDivider label="What's Working" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <MetricTile label="Reader Depth"    value={kdp.readerDepth.toString()} subtext="KENP ÷ units — readers finish your books" color="#6EBF8B" />
              <MetricTile label="Meta CTR"        value={`${meta.ctr}%`}             subtext="top 5% of romance ads this month"          color="#6EBF8B" />
              <MetricTile label="Email Open Rate" value={`${mailerLite.openRate}%`}  subtext="top 10% for romance genre"                  color="#6EBF8B" />
            </div>

            {/* Performance by Channel */}
            <SectionDivider label="Performance by Channel" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <ChannelCard label="KDP · Amazon"     value={fmt$(kdp.totalEstRevenue)}          subtext={`${kdp.units} units · ${kdp.kenp.toLocaleString()} pg`} badge="Strong" />
              <ChannelCard label="Meta Ads"          value={`${crossChannel.roas}× ROAS`}       subtext={`${fmt$(meta.spend)} spend · ${meta.ctr}% CTR`}         badge="Healthy" />
              <ChannelCard label="MailerLite"        value={mailerLite.listSize.toLocaleString()} subtext={`${mailerLite.openRate}% open · ${mailerLite.clickRate}% click`} badge="Strong" />
              <ChannelCard label="Cost / Subscriber" value={`$${crossChannel.costPerSubscriber.toFixed(2)}`} subtext={`${meta.newSubscribers} new subs from ads`} badge="Healthy" />
            </div>

            {/* Book Performance */}
            <SectionDivider label="Book Performance" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <div style={{ background: 'var(--card-boutique)', padding: 24 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink4)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={10} /> Units Sold by Title
                </div>
                {kdp.books.map(b => (
                  <div key={b.shortTitle} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.shortTitle}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', flexShrink: 0 }}>{b.units.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--paper3)', borderRadius: 999 }}>
                      <div style={{ height: '100%', borderRadius: 999, background: b.color, width: `${(b.units / maxUnits) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--card-boutique)', padding: 24 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink4)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Repeat size={10} /> KENP Page Reads by Title
                </div>
                {kdp.books.map(b => (
                  <div key={b.shortTitle} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.shortTitle}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', flexShrink: 0 }}>{b.kenp.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--paper3)', borderRadius: 999 }}>
                      <div style={{ height: '100%', borderRadius: 999, background: b.color, width: `${(b.kenp / maxKenp) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cross-Channel Health */}
            <SectionDivider label="Cross-Channel Health" />
            <div style={{ background: 'var(--card-boutique)', border: '1px solid var(--line)', padding: '0 24px', marginBottom: 40 }}>
              <InsightRow label="Total ROAS"          value={`${crossChannel.roas}×`}                              note="total revenue ÷ ad spend"          good />
              <InsightRow label="Cost per Subscriber" value={`$${crossChannel.costPerSubscriber.toFixed(2)}`}      note="ad spend ÷ new subs from ads"      good />
              <InsightRow label="Cost per 1K KENP"    value={`$${crossChannel.costPer1kKenp.toFixed(2)}`}          note="(ad spend ÷ KENP) × 1000"         good />
              <InsightRow label="Meta CPC"             value={`$${meta.cpc.toFixed(2)}`}                           note="cost per click on Meta ads"        good />
              <InsightRow label="Email Click Rate"     value={`${mailerLite.clickRate}%`}                          note="benchmark: 2–4% healthy"           good />
              <InsightRow label="Email Unsubscribes"   value={`${mailerLite.unsubscribes}`}                        note="last 30 days · monitor trend"      good={mailerLite.unsubscribes < 30} />
            </div>

            {/* Coach insight */}
            <SectionDivider label="Your Coach" />
            <div style={{ borderLeft: '3px solid #D97706', paddingLeft: 20, marginBottom: 40 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D97706', marginBottom: 10 }}>What This Means For You</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: "What's happening",  text: `You're earning ${fmt$(kdp.totalEstRevenue)} this month with a ${crossChannel.roas}× return on ad spend — your ads are working.` },
                  { label: 'Why it matters',    text: `Your reader depth of ${kdp.readerDepth} tells you readers aren't just buying — they're finishing. That's the foundation of a long-tail KU revenue engine.` },
                  { label: 'What to do next',   text: "Scale your top Meta ad by 20%, email your list today, and keep feeding the series — your readers are primed for Book 4." },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D97706', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.65, color: '#1E2D3D' }}>{s.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign-up CTA */}
            <div style={{ background: 'var(--card-boutique)', border: '1px solid var(--line)', padding: '32px 36px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink4)', marginBottom: 12 }}>Ready to see your own numbers?</p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                Connect your KDP, Meta, and MailerLite accounts.
              </h2>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink3)', margin: '0 0 24px' }}>
                14-day free trial. No credit card required. Your data stays yours.
              </p>
              <Link href="/login" style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', background: '#E9A020', color: '#1E2D3D', padding: '14px 32px', borderRadius: 6, textDecoration: 'none' }}>
                Start Free Trial →
              </Link>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', marginTop: 14 }}>$37/month after trial · Cancel anytime</p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
