'use client'
// components/MetricHealth.tsx — Health benchmarks, projection badges, and metric tooltips

import { useState, useRef, useEffect } from 'react'

// ── 1. Health Benchmark Bar ──────────────────────────────────────────────────

interface BenchmarkConfig {
  weak: [number, number]   // [min, max] for weak zone
  healthy: [number, number]
  strong: [number, number]
  invert?: boolean          // true if lower is better (e.g. cost metrics)
}

const BENCHMARKS: Record<string, BenchmarkConfig> = {
  ctr:              { weak: [0, 1],   healthy: [1, 3],   strong: [3, 8] },
  emailOpenRate:    { weak: [0, 20],  healthy: [20, 30], strong: [30, 60] },
  emailClickRate:   { weak: [0, 2],   healthy: [2, 4],   strong: [4, 10] },
  readerDepth:      { weak: [0, 20],  healthy: [20, 60], strong: [60, 150] },
  costPerSub:       { weak: [5, 20],  healthy: [2, 5],   strong: [0, 2],   invert: true },
  costPer1kKenp:    { weak: [120, 300], healthy: [60, 120], strong: [0, 60], invert: true },
}

function getZone(metric: string, value: number): 'weak' | 'healthy' | 'strong' {
  const b = BENCHMARKS[metric]
  if (!b) return 'healthy'
  if (b.invert) {
    if (value <= b.strong[1]) return 'strong'
    if (value <= b.healthy[1]) return 'healthy'
    return 'weak'
  }
  if (value >= b.strong[0]) return 'strong'
  if (value >= b.healthy[0]) return 'healthy'
  return 'weak'
}

function getDotPosition(metric: string, value: number): number {
  const b = BENCHMARKS[metric]
  if (!b) return 50
  const fullMin = b.invert ? b.strong[0] : b.weak[0]
  const fullMax = b.invert ? b.weak[1] : b.strong[1]
  const range = fullMax - fullMin || 1
  const pct = b.invert
    ? ((fullMax - value) / range) * 100
    : ((value - fullMin) / range) * 100
  return Math.max(2, Math.min(98, pct))
}

const ZONE_COLORS = { weak: '#F97B6B', healthy: '#D97706', strong: '#6EBF8B' }

export function HealthBenchmarkBar({ metric, value }: { metric: string; value: number }) {
  if (!BENCHMARKS[metric] || value == null || isNaN(value)) return null
  const zone = getZone(metric, value)
  const dotPos = getDotPosition(metric, value)

  return (
    <div style={{ marginTop: 10 }}>
      <div className="relative" style={{ height: 6 }}>
        <div className="flex rounded-full overflow-hidden" style={{ height: 6 }}>
          <div className="flex-1" style={{ background: ZONE_COLORS.weak }} />
          <div className="flex-1" style={{ background: ZONE_COLORS.healthy }} />
          <div className="flex-1" style={{ background: ZONE_COLORS.strong }} />
        </div>
        <div className="absolute"
          style={{ left: `${dotPos}%`, top: '50%', width: 10, height: 10, borderRadius: '50%', background: '#1E2D3D', border: '2px solid white', transform: 'translateX(-50%) translateY(-50%)', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
      </div>
      <div className="flex justify-between" style={{ marginTop: 5 }}>
        <span className="text-[8px] font-bold uppercase" style={{ color: ZONE_COLORS.weak }}>Weak</span>
        <span className="text-[8px] font-bold uppercase" style={{ color: ZONE_COLORS.healthy }}>Healthy</span>
        <span className="text-[8px] font-bold uppercase" style={{ color: ZONE_COLORS.strong }}>Strong</span>
      </div>
    </div>
  )
}

// ── 2. Projection Warning Badge ──────────────────────────────────────────────

const PROJECTION_NOTES: Record<string, string> = {
  'estKuEarnings':       'Projection — KU payout per page fluctuates monthly. We use $0.0045 as a reasonable estimate.',
  'totalEstRevenue':     'Projection — based on $0.0045/page KU estimate plus reported sales royalties.',
  'totalRoas':           'Projection — attribution lag between ad spend and KU reads may affect accuracy.',
  'subPaybackWindow':    'Projection — based on current averages, actual may vary.',
  'readerDepth':         '~ Early indicator — KENP ÷ units is a directional proxy, not true read-through rate.',
  'readMomentum':        '~ Directional signal — compares daily averages, not a precise measurement.',
}

export function ProjectionBadge({ metric }: { metric: string }) {
  const note = PROJECTION_NOTES[metric]
  if (!note) return null
  return (
    <span className="inline-flex items-center gap-1 ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706' }}
      title={note}>
      ⚠ {note.split(' — ')[0]}
    </span>
  )
}

// ── 3. "How do we calculate this?" Tooltip ───────────────────────────────────

interface TooltipContent {
  formula: string
  explanation: string
  example: string
  caution?: string
}

const METRIC_TOOLTIPS: Record<string, TooltipContent> = {
  readerDepth: {
    formula: 'KENP Reads ÷ Units Sold',
    explanation: 'How many KU pages were read per book sold.',
    example: '6,522 ÷ 168 = 38.8',
    caution: 'This is a directional proxy, not true read-through.',
  },
  estKuEarnings: {
    formula: 'KENP Reads × $0.0045',
    explanation: 'Estimated Kindle Unlimited earnings based on average per-page rate.',
    example: '6,522 × $0.0045 = $29.35',
    caution: 'KU payout fluctuates monthly — treat as estimate.',
  },
  costPer1kKenp: {
    formula: '(Ad Spend ÷ KENP Reads) × 1,000',
    explanation: 'How much you spend in ads per 1,000 KU pages read.',
    example: '($488.77 ÷ 6,522) × 1,000 = $74.94',
    caution: 'Use to compare ad efficiency across creatives.',
  },
  totalRoas: {
    formula: 'Total Revenue ÷ Ad Spend',
    explanation: 'Return on ad spend — how much revenue each ad dollar generates.',
    example: '$31.24 ÷ $488.77 = 0.064',
    caution: 'Below 1x is normal for early-stage authors building read-through.',
  },
  costPerClick: {
    formula: 'Total Ad Spend ÷ Total Clicks',
    explanation: 'Average cost each time someone clicks your ad.',
    example: '$488.77 ÷ 1,247 = $0.39',
  },
  costPerReader: {
    formula: 'Total Ad Spend ÷ (Units + Estimated KU Borrows)',
    explanation: 'How much you spend in ads per actual reader acquired.',
    example: '$488.77 ÷ 203 = $2.41',
  },
  costPerSub: {
    formula: 'Total Ad Spend ÷ Email Subscribers',
    explanation: 'How much you spend in ads per email subscriber on your list.',
    example: '$488.77 ÷ 2,167 = $0.23',
    caution: 'Only meaningful if ads drive list signups.',
  },
  ctr: {
    formula: 'Clicks ÷ Impressions × 100',
    explanation: 'What percentage of people who saw your ad clicked it.',
    example: '1,247 ÷ 96,430 × 100 = 1.29%',
  },
  emailOpenRate: {
    formula: 'Opens ÷ Delivered × 100',
    explanation: 'What percentage of subscribers opened your email.',
    example: '840 ÷ 2,167 × 100 = 38.8%',
  },
  emailClickRate: {
    formula: 'Clicks ÷ Opens × 100',
    explanation: 'What percentage of openers clicked a link in your email.',
    example: '135 ÷ 840 × 100 = 16.1%',
  },
  totalRoyalties: {
    formula: 'Sum of all book royalties for the month',
    explanation: 'Your total KDP earnings across all formats and marketplaces.',
    example: '$1.89 (Book A) + $0.00 (Book B) = $1.89',
  },
  totalUnits: {
    formula: 'Paid Units + Free Units + Paperback Units',
    explanation: 'Total books sold or downloaded across all formats.',
    example: '49 paid + 0 free + 0 paperback = 49',
  },
  kenp: {
    formula: 'Total Kindle Edition Normalized Pages read in KU',
    explanation: 'How many pages KU subscribers read across all your books.',
    example: '6,522 pages across 3 titles',
  },
  seriesHealth: {
    formula: 'Weighted score: Read-through (40%) + Best Rank (30%) + List Growth (30%)',
    explanation: 'A composite health score for your entire series ecosystem.',
    example: '65% read-through × 0.4 + rank score × 0.3 + list growth × 0.3 = 72/100',
  },
  readMomentum: {
    formula: 'Current period daily KENP ÷ Prior period daily KENP',
    explanation: 'Whether your KU reads are growing or cooling.',
    example: '272 ÷ 215 = 1.26 — momentum growing',
  },
  dailyReadVelocity: {
    formula: 'Total KENP ÷ Days in period',
    explanation: 'Average pages read per day.',
    example: '6,522 ÷ 24 = 271.75 pages/day',
  },
  topBookShare: {
    formula: 'Top title revenue ÷ Total revenue',
    explanation: 'How much of your earnings come from one book.',
    example: '$20 ÷ $31 = 65%',
  },
  totalEstRevenue: {
    formula: '(KENP × $0.0045) + KDP Royalties',
    explanation: 'Estimated total revenue combining sales royalties and KU earnings.',
    example: '($29.35 KU) + ($1.89 sales) = $31.24',
    caution: 'KU component is estimated — actual KDP payout may differ.',
  },
  kenpPerClick: {
    formula: 'Total KENP Reads ÷ Ad Clicks',
    explanation: 'Whether your ad traffic is actually reading. Low = weak hook. High = quality traffic.',
    example: '6,522 ÷ 1,247 = 5.23 pages per click',
  },
  clickToSubRate: {
    formula: 'New Subscribers ÷ Landing Page Clicks',
    explanation: 'Whether your lead magnet is converting visitors into subscribers.',
    example: '45 ÷ 1,247 = 3.6%',
  },
}

export function MetricTooltip({ metric }: { metric: string }) {
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [fixedPos, setFixedPos] = useState<{ top: number; left: number } | null>(null)
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const content = METRIC_TOOLTIPS[metric]

  // Close on outside click — must be before any conditional return
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!content) return null

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const isMobile = window.innerWidth < 640
      if (isMobile) {
        const tipWidth = Math.min(280, window.innerWidth - 16)
        let left = rect.left
        if (left + tipWidth > window.innerWidth - 8) left = window.innerWidth - tipWidth - 8
        if (left < 8) left = 8
        setFixedPos({ top: rect.bottom + 8, left })
      } else {
        setFixedPos(null)
        setSide(rect.right >= 288 ? 'right' : 'left')
      }
    }
    setOpen(o => !o)
  }

  const tooltipContent = (
    <div className="p-3.5">
      <div className="text-[10px] font-bold tracking-[1px] uppercase mb-2" style={{ color: '#D97706' }}>
        How we calculate this
      </div>
      <div className="text-[12px] font-mono font-semibold mb-2 px-2 py-1.5 rounded"
        style={{ background: '#F5F5F4', color: '#1E2D3D' }}>
        {content.formula}
      </div>
      <div className="text-[11.5px] leading-relaxed mb-2" style={{ color: '#374151' }}>
        {content.explanation}
      </div>
      <div className="text-[11px] mb-2" style={{ color: '#6B7280' }}>
        <strong style={{ color: '#1E2D3D' }}>Example:</strong> {content.example}
      </div>
      {content.caution && (
        <div className="text-[10.5px] px-2 py-1.5 rounded" style={{ background: 'rgba(217,119,6,0.08)', color: '#D97706' }}>
          ⚠ {content.caution}
        </div>
      )}
    </div>
  )

  return (
    <div ref={ref} className="relative inline-block ml-1">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
                   transition-all hover:scale-110 cursor-pointer"
        style={{
          background: open ? '#1E2D3D' : 'rgba(30,45,61,0.08)',
          color: open ? 'white' : '#6B7280',
          border: 'none',
        }}
        title="How do we calculate this?"
      >
        i
      </button>
      {open && (fixedPos ? (
        /* Mobile: fixed position to prevent card overflow */
        <div
          className="fixed z-50 max-w-[280px]"
          style={{
            borderRadius: 0,
            top: fixedPos.top,
            left: fixedPos.left,
            width: Math.min(280, window.innerWidth - 16),
            background: 'white',
            border: '1px solid #E8E1D3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
          {tooltipContent}
        </div>
      ) : (
        /* Desktop: absolute position anchored to button */
        <div
          className={`absolute z-50 mt-2 max-w-[280px] ${side === 'right' ? 'right-0' : 'left-0'}`}
          style={{
            borderRadius: 0,
            width: 280,
            background: 'white',
            border: '1px solid #E8E1D3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
          {tooltipContent}
        </div>
      ))}
    </div>
  )
}
