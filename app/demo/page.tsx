'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, DollarSign, TrendingUp, Mail, ArrowLeftRight,
  Pin, BarChart2, Settings2, Database, Rocket, PenTool,
  ListChecks, GraduationCap, Bot, X, ChevronDown,
  BookOpen, Repeat, TrendingUp as Trend,
} from 'lucide-react'

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
      { title: 'Fake Dating My Billionaire Protector', shortTitle: 'Fake Dating…', units: 423, kenp: 68420, color: '#F97B6B', pct: 100 },
      { title: 'My Off-Limits Roommate',               shortTitle: 'Off-Limits Roommate',  units: 291, kenp: 38970, color: '#F4A261', pct: 69 },
      { title: "My Ex's Secret Baby",                  shortTitle: "Ex's Secret Baby",      units: 133, kenp: 16960, color: '#8B5CF6', pct: 31 },
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
    activeSequences: 3,
  },
  crossChannel: {
    roas: 3.7,
    costPerSubscriber: 2.40,
    costPer1kKenp: 3.92,
  },
}

const fmt$ = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

// ── Demo sidebar nav items (all pointing to /demo to prevent auth redirects) ──
const NAV_ITEMS = [
  { label: 'Today',        href: '/demo', Icon: LayoutDashboard, active: true  },
  { label: 'Royalties',    href: '/demo', Icon: DollarSign,      active: false },
  { label: 'Ads',          href: '/demo', Icon: TrendingUp,      active: false },
  { label: 'Readers',      href: '/demo', Icon: Mail,            active: false },
  { label: 'Task Center',  href: '/demo', Icon: ListChecks,      active: false },
  { label: 'Write',        href: '/demo', Icon: PenTool,         active: false },
]

const LESS_ITEMS = [
  { label: 'Launch Planner', href: '/demo', Icon: Rocket    },
  { label: 'Advanced Metrics', href: '/demo', Icon: BarChart2 },
  { label: 'Settings',       href: '/demo', Icon: Settings2  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function DemoNavItem({ label, href, Icon, active }: { label: string; href: string; Icon: any; active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 6, textDecoration: 'none',
      background: active ? 'rgba(194,131,31,0.1)' : 'transparent',
      color: active ? '#c2831f' : '#564e46',
      fontSize: 13, fontWeight: active ? 600 : 400,
      transition: 'background 0.1s',
    }}>
      <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }} />
      {label}
    </Link>
  )
}

function MetricTile({
  label, value, subtext, delta, isProjection, color,
}: {
  label: string; value: string; subtext?: string; delta?: string; isProjection?: boolean; color?: string
}) {
  return (
    <div style={{
      background: 'var(--card-boutique)', border: '1px solid var(--line)',
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {color && <span style={{ width: 8, height: 8, background: color, display: 'inline-block', flexShrink: 0 }} />}
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32,
        color: 'var(--ink)', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: 3,
      }}>
        {isProjection && <span style={{ color: 'var(--amber-boutique)', fontSize: 26 }}>~</span>}
        {value}
      </div>
      {delta && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#245c3f', display: 'flex', alignItems: 'center', gap: 3 }}>
          ↑ {delta} <span style={{ color: 'var(--ink4)' }}>vs last month</span>
        </div>
      )}
      {subtext && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)' }}>{subtext}</div>
      )}
    </div>
  )
}

function ChannelCard({
  label, value, subtext, badge, badgeColor, valueColor,
}: {
  label: string; value: string; subtext?: string; badge?: string; badgeColor?: string; valueColor?: string
}) {
  return (
    <div style={{
      background: 'var(--card-boutique)', border: '1px solid var(--line)',
      borderRadius: 0, padding: '20px 24px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink4)', marginBottom: 12 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: valueColor || 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {subtext && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', marginTop: 6 }}>{subtext}</div>}
      {badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', marginTop: 10, gap: 4,
          background: badgeColor ? badgeColor + '18' : 'rgba(47,109,78,0.08)',
          color: badgeColor || '#245c3f',
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
          padding: '3px 8px', borderRadius: 2,
        }}>{badge}</div>
      )}
    </div>
  )
}

function PriorityCard({
  color, label, title, body, expanded, onToggle,
}: {
  color: string; label: string; title: string; body: string; expanded: boolean; onToggle: () => void
}) {
  return (
    <div style={{
      borderLeft: `3px solid ${color}`, background: 'var(--card-boutique)',
      border: `1px solid var(--line)`, borderLeftWidth: 3, borderLeftColor: color,
      borderRadius: 0, overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: '0.1em', color, padding: '2px 7px',
            border: `1px solid ${color}40`, borderRadius: 2,
          }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)', fontWeight: 400 }}>
            {title}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{ color: 'var(--ink4)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink3)', margin: '10px 0 0', lineHeight: 1.6 }}>{body}</p>
          <a href="/login" style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber-boutique)', textDecoration: 'none', letterSpacing: '0.04em' }}>
            Sign up to take action →
          </a>
        </div>
      )}
    </div>
  )
}

function BookBar({ title, units, kenp, color, maxUnits, maxKenp }: {
  title: string; units: number; kenp: number; color: string; maxUnits: number; maxKenp: number
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', flex: 1 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ flex: 1, height: 6, background: 'var(--paper3)', borderRadius: 999 }}>
          <div style={{ height: '100%', borderRadius: 999, background: color, width: `${(units / maxUnits) * 100}%`, transition: 'width 0.6s ease' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', width: 60, textAlign: 'right' }}>{units.toLocaleString()} units</span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--paper3)', borderRadius: 999 }}>
          <div style={{ height: '100%', borderRadius: 999, background: color + '80', width: `${(kenp / maxKenp) * 100}%`, transition: 'width 0.6s ease' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', width: 60, textAlign: 'right' }}>{kenp.toLocaleString()} pg</span>
      </div>
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
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
          padding: '2px 7px', borderRadius: 2,
          background: good ? 'rgba(47,109,78,0.08)' : 'rgba(176,50,42,0.08)',
          color: good ? '#245c3f' : '#b0322a',
        }}>{good ? 'Healthy' : 'Watch this'}</span>
      </div>
    </div>
  )
}

// ── Main demo page ────────────────────────────────────────────────────────────
export default function DemoPage() {
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [expandedPriority, setExpandedPriority] = useState<number | null>(null)

  const { kdp, meta, mailerLite, crossChannel } = DEMO
  const maxUnits = Math.max(...kdp.books.map(b => b.units))
  const maxKenp  = Math.max(...kdp.books.map(b => b.kenp))

  return (
    <div style={{ fontFamily: 'var(--font-sans)', background: 'var(--paper)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky demo banner ── */}
      {!bannerDismissed && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: '#E9A020', color: '#1E2D3D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 20px', gap: 12,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
            You&apos;re viewing a demo with sample data. Ready to see your numbers?{' '}
            <Link href="/login" style={{ color: '#1E2D3D', textDecoration: 'underline', fontWeight: 700 }}>
              Start Free Trial →
            </Link>
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss demo banner"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E2D3D', padding: 4, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Two-panel layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Demo sidebar ── */}
        <aside style={{
          width: 220, flexShrink: 0, background: 'var(--card-boutique)',
          borderRight: '1px solid var(--line)', padding: '24px 12px',
          display: 'flex', flexDirection: 'column', gap: 2,
          position: 'sticky', top: bannerDismissed ? 0 : 41, height: bannerDismissed ? '100vh' : 'calc(100vh - 41px)',
          overflowY: 'auto',
        }}>
          {/* Wordmark */}
          <div style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Author<em style={{ color: 'var(--amber-boutique)', fontStyle: 'italic' }}>Dash</em>
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sample data · Demo mode
            </div>
          </div>

          {/* Main nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(item => <DemoNavItem key={item.label} {...item} />)}
          </div>

          <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {LESS_ITEMS.map(item => <DemoNavItem key={item.label} {...item} active={false} />)}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <Link href="/login" style={{
              display: 'block', textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              background: '#E9A020', color: '#1E2D3D',
              padding: '10px 14px', borderRadius: 6, textDecoration: 'none',
              letterSpacing: '0.04em',
            }}>
              Get Started →
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--paper)' }}>
          <div style={{ padding: '40px 48px 80px', maxWidth: 1100 }}>

            {/* ── Page header ── */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink4)', marginBottom: 8 }}>
                Last 30 days · Sample data
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.1, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>
                Good morning, {DEMO.authorName}.
              </h1>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--ink3)', margin: '6px 0 0' }}>
                Here&apos;s your publishing snapshot for the Stillwater Series.
              </p>
            </div>

            {/* ── Revenue KPIs ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>Revenue</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <MetricTile label="Est. Revenue"  value={fmt$(kdp.totalEstRevenue)} isProjection delta="+$284" subtext="royalties + KU est." color="#F97B6B" />
              <MetricTile label="Royalties"     value={fmt$(kdp.royalties)}                                                                      color="#F97B6B" />
              <MetricTile label="KENP Reads"    value={kdp.kenp.toLocaleString()}           delta="+18,200"                                       color="#F97B6B" />
              <MetricTile label="Units Sold"    value={kdp.units.toLocaleString()}          delta="+63"                                           color="#F97B6B" />
            </div>

            {/* ── Today's Priorities ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>Today&apos;s Priorities</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
              <PriorityCard
                color="#F97B6B"
                label="Scale"
                title="Your Meta CTR is 4.0% — above benchmark. Scale your top ad."
                body={`Your best-performing ad — "${meta.topAd}" — is converting at 4.0% CTR, well above the 1–3% healthy range. Increase your daily budget by 20% this week to capture more KU page reads before momentum fades.`}
                expanded={expandedPriority === 0}
                onToggle={() => setExpandedPriority(expandedPriority === 0 ? null : 0)}
              />
              <PriorityCard
                color="#E9A020"
                label="Send"
                title="You haven't emailed your list in 8 days — send a re-engagement."
                body={`Your 2,847 subscribers have an open rate of ${mailerLite.openRate}% — that's excellent. A list this warm goes cold fast. Send a short 3-paragraph email today: one story hook, one sales nudge, one link. Don't overthink it.`}
                expanded={expandedPriority === 1}
                onToggle={() => setExpandedPriority(expandedPriority === 1 ? null : 1)}
              />
              <PriorityCard
                color="#60A5FA"
                label="Watch"
                title={`${mailerLite.unsubscribes} unsubscribes this month — review your welcome sequence.`}
                body="14 unsubscribes is within normal range for a list your size, but check whether they're coming from a specific email in your welcome sequence. If one step is losing readers consistently, a small copy tweak can stop the bleed."
                expanded={expandedPriority === 2}
                onToggle={() => setExpandedPriority(expandedPriority === 2 ? null : 2)}
              />
            </div>

            {/* ── What's Working ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>What&apos;s Working</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <MetricTile
                label="Reader Depth"
                value={kdp.readerDepth.toString()}
                subtext="KENP ÷ units — readers finish your books"
                color="#6EBF8B"
              />
              <MetricTile
                label="Meta CTR"
                value={`${meta.ctr}%`}
                subtext="top 5% of romance ads this month"
                color="#6EBF8B"
              />
              <MetricTile
                label="Email Open Rate"
                value={`${mailerLite.openRate}%`}
                subtext="top 10% for romance genre"
                color="#6EBF8B"
              />
            </div>

            {/* ── Performance by Channel ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>Performance by Channel</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              <ChannelCard
                label="KDP · Amazon"
                value={fmt$(kdp.totalEstRevenue)}
                subtext={`${kdp.units} units · ${kdp.kenp.toLocaleString()} pg reads`}
                badge="Strong"
                badgeColor="#245c3f"
              />
              <ChannelCard
                label="Meta Ads"
                value={`${crossChannel.roas}× ROAS`}
                subtext={`${fmt$(meta.spend)} spend · ${meta.ctr}% CTR`}
                badge="Healthy"
                badgeColor="#245c3f"
              />
              <ChannelCard
                label="MailerLite"
                value={mailerLite.listSize.toLocaleString()}
                subtext={`${mailerLite.openRate}% open · ${mailerLite.clickRate}% click`}
                badge="Strong"
                badgeColor="#245c3f"
              />
              <ChannelCard
                label="Cost / Subscriber"
                value={`$${crossChannel.costPerSubscriber.toFixed(2)}`}
                subtext={`${meta.newSubscribers} new subs from ads`}
                badge="Healthy"
                badgeColor="#245c3f"
              />
            </div>

            {/* ── Book Performance ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>Book Performance</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 40 }}>
              {/* Units by title */}
              <div style={{ background: 'var(--card-boutique)', padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink4)', marginBottom: 20 }}>
                  <BookOpen size={10} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Units Sold by Title
                </div>
                {kdp.books.map(b => (
                  <BookBar key={b.title} title={b.shortTitle} units={b.units} kenp={b.kenp} color={b.color} maxUnits={maxUnits} maxKenp={maxKenp} />
                ))}
              </div>

              {/* KENP by title */}
              <div style={{ background: 'var(--card-boutique)', padding: '24px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink4)', marginBottom: 20 }}>
                  <Repeat size={10} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  KENP Page Reads by Title
                </div>
                {kdp.books.map(b => {
                  const maxKenpVal = Math.max(...kdp.books.map(x => x.kenp))
                  return (
                    <div key={b.title} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', flex: 1 }}>{b.shortTitle}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--paper3)', borderRadius: 999 }}>
                          <div style={{ height: '100%', borderRadius: 999, background: b.color, width: `${(b.kenp / maxKenpVal) * 100}%` }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', width: 70, textAlign: 'right' }}>{b.kenp.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Cross-Channel Health ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>Cross-Channel Health</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ background: 'var(--card-boutique)', border: '1px solid var(--line)', padding: '0 24px', marginBottom: 40 }}>
              <InsightRow label="Total ROAS"          value={`${crossChannel.roas}×`}   note="total revenue ÷ ad spend" good />
              <InsightRow label="Cost per Subscriber" value={`$${crossChannel.costPerSubscriber.toFixed(2)}`} note="ad spend ÷ new subs from ads" good />
              <InsightRow label="Cost per 1K KENP"    value={`$${crossChannel.costPer1kKenp.toFixed(2)}`}    note="(ad spend ÷ KENP) × 1000" good />
              <InsightRow label="Meta CPC"             value={`$${meta.cpc.toFixed(2)}`} note="cost per click on Meta ads" good />
              <InsightRow label="Email Click Rate"     value={`${mailerLite.clickRate}%`} note="benchmark: 2–4% healthy" good />
              <div style={{ padding: '12px 0' }}>
                <InsightRow label="Email Unsubscribes" value={`${mailerLite.unsubscribes}`} note="last 30 days · monitor trend" good={mailerLite.unsubscribes < 30} />
              </div>
            </div>

            {/* ── Coach insight ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink3)', marginBottom: 8 }}>Your Coach</div>
              <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            </div>
            <div style={{ borderLeft: '3px solid #D97706', paddingLeft: 20, marginBottom: 40 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D97706', marginBottom: 10 }}>
                What This Means For You
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  {
                    label: "What's happening",
                    text: "You're earning $1,802.76 this month with a 3.7× return on ad spend — your ads are working.",
                  },
                  {
                    label: 'Why it matters',
                    text: "Your reader depth of 146.8 tells you readers aren't just buying — they're finishing. That's the foundation of a long-tail KU revenue engine.",
                  },
                  {
                    label: 'What to do next',
                    text: "Scale your top Meta ad by 20%, email your list today, and keep feeding the series — your readers are primed for Book 4.",
                  },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D97706', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.65, color: '#1E2D3D' }}>{s.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sign-up CTA ── */}
            <div style={{
              background: 'var(--card-boutique)', border: '1px solid var(--line)',
              padding: '32px 36px', textAlign: 'center', borderRadius: 0,
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink4)', marginBottom: 12 }}>
                Ready to see your own numbers?
              </p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                Connect your KDP, Meta, and MailerLite accounts.
              </h2>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink3)', margin: '0 0 24px' }}>
                14-day free trial. No credit card required. Your data stays yours.
              </p>
              <Link href="/login" style={{
                display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 12,
                fontWeight: 700, letterSpacing: '0.06em',
                background: '#E9A020', color: '#1E2D3D',
                padding: '14px 32px', borderRadius: 6, textDecoration: 'none',
              }}>
                Start Free Trial →
              </Link>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', marginTop: 14 }}>
                $37/month after trial · Cancel anytime
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
