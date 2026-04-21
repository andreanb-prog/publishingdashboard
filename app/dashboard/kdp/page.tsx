'use client'
// app/dashboard/kdp/page.tsx
import { Suspense, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import ChartJS from 'chart.js/auto'
import Link from 'next/link'
import { DarkPage, DarkKPIStrip, DarkCoachBox, PageSkeleton } from '@/components/DarkPage'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { FreshBanner } from '@/components/FreshBanner'
import { InsightCallouts } from '@/components/InsightCallout'
import { MetricTooltip } from '@/components/MetricHealth'
import { ViewingBar } from '@/components/ViewingBar'
import { GoalSection } from '@/components/GoalSection'
import { BarChart } from '@/components/ui'
import { ChartLegend } from '@/components/ChartLegend'
import { getCoachTitle } from '@/lib/coachTitle'
import { fmtCurrency } from '@/lib/utils'
import {
  CHART_COLORS,
  BASE_CHART_OPTIONS,
  areaDataset,
  barDataset,
  rollingAverage,
  peakPoints,
} from '@/lib/chartConfig'
import { LastUploadBadge } from '@/components/LastUploadBadge'
import CategoryIntelligence from '@/components/CategoryIntelligence'
import BsrTracker from '@/components/BsrTracker'
import type { Analysis, DailyData, RoasLog, MailerLiteCampaign } from '@/types'


// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d: Date) { return d.toISOString().split('T')[0] }

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDisplayRange(start: string, end: string): string {
  if (!start || !end) return ''
  return `${formatShortDate(start)} – ${formatShortDate(end)}`
}

function sumValues(arr: DailyData[]) { return arr.reduce((s, d) => s + d.value, 0) }

/** Normalise any date string to YYYY-MM-DD so comparisons always work,
 *  even if existing Analysis records were stored with a locale date string. */
function normalizeDate(d: string): string {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const parsed = new Date(d)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  return ''
}

type Preset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date()
  switch (preset) {
    case 'last7':
      return { start: fmt(new Date(today.getTime() - 6 * 86400000)), end: fmt(today) }
    case 'last30':
      return { start: fmt(new Date(today.getTime() - 29 * 86400000)), end: fmt(today) }
    case 'last90':
      return { start: fmt(new Date(today.getTime() - 89 * 86400000)), end: fmt(today) }
    case 'thisMonth':
      return { start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), end: fmt(today) }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last  = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: fmt(first), end: fmt(last) }
    }
    default:
      return { start: '', end: '' }
  }
}

function getPreviousPeriod(start: string, end: string): { start: string; end: string } {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevEnd   = new Date(s.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000)
  return { start: fmt(prevStart), end: fmt(prevEnd) }
}

// ── Date Range Picker ─────────────────────────────────────────────────────────
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'last7',     label: 'Last 7 days' },
  { key: 'last30',    label: 'Last 30 days' },
  { key: 'last90',    label: 'Last 90 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom',    label: 'Custom' },
]

function DateRangePicker({
  preset, onPreset, customStart, customEnd, onCustomStart, onCustomEnd,
}: {
  preset: Preset
  onPreset: (p: Preset) => void
  customStart: string
  customEnd: string
  onCustomStart: (v: string) => void
  onCustomEnd: (v: string) => void
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all duration-150"
            style={{
              background: preset === p.key ? '#E9A020' : '#FFF8F0',
              color:      preset === p.key ? 'white' : '#1E2D3D',
              border:     `0.5px solid ${preset === p.key ? '#E9A020' : '#EEEBE6'}`,
            }}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 mt-1 w-full ml-[62px]">
            <input
              type="date"
              value={customStart}
              onChange={e => onCustomStart(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-[Plus_Jakarta_Sans]"
            />
            <span style={{ color: '#6B7280' }}>→</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => onCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-[Plus_Jakarta_Sans]"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chart 1 & 2 — Daily Area Chart ───────────────────────────────────────────
// Uses areaDataset + peakPoints + rollingAverage from lib/chartConfig
function DailyAreaChart({
  data,
  lineColor,
  avgColor,
  peakDotColor,
  isKenp = false,
}: {
  data: DailyData[]
  lineColor: string
  avgColor: string
  peakDotColor: string
  isKenp?: boolean
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const chartRef     = useRef<ChartJS | null>(null)
  const tooltipElRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length < 5) return
    const ctx2d = canvasRef.current.getContext('2d')!
    if (chartRef.current) chartRef.current.destroy()

    const values  = data.map(d => d.value)
    const labels  = data.map(d => formatShortDate(d.date))

    // Chart 2 gets a 3-day momentum line in teal; Chart 1 gets 7-day avg
    const avgWindow = isKenp ? 3 : 7
    const avgData   = rollingAverage(values, avgWindow)
    const avgLine   = isKenp ? CHART_COLORS.teal : avgColor
    const avgLabel  = isKenp ? '3-day momentum' : '7-day avg'

    const mainDs = {
      ...areaDataset(values, lineColor, isKenp ? 'KENP Reads' : 'Units Sold'),
      ...peakPoints(values, peakDotColor),
      // Override with chartArea-aware gradient for smoother look
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      backgroundColor: (context: any) => {
        const { ctx: cCtx, chartArea } = context.chart
        if (!chartArea) return lineColor + '40'
        const g = cCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        g.addColorStop(0, lineColor + '3F')
        g.addColorStop(1, lineColor + '05')
        return g
      },
      pointHoverRadius: 4,
    }

    chartRef.current = new ChartJS(ctx2d, {
      type: 'line',
      data: {
        labels,
        datasets: [
          mainDs,
          {
            label: avgLabel,
            data: avgData,
            borderColor: avgLine,
            borderWidth: 1.5,
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: BASE_CHART_OPTIONS.animation,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            external: ({ chart, tooltip }: any) => {
              const el = tooltipElRef.current
              if (!el) return
              if (tooltip.opacity === 0) {
                el.style.display = 'none'
                return
              }
              const title = tooltip.title?.[0] ?? ''
              const lines = (tooltip.body ?? []).flatMap((b: any) => b.lines)
              const afterLines = tooltip.afterBody ?? []
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
              el.innerHTML = `
                <button
                  onclick="this.parentElement.style.display='none'"
                  style="position:absolute;top:4px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:#9CA3AF;line-height:1;padding:0"
                >×</button>
                <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;padding-right:16px">${title}</div>
                ${lines.map((l: string) => `<div style="font-size:12px;color:#1E2D3D">${l}</div>`).join('')}
                ${afterLines.map((l: string) => `<div style="font-size:11px;color:#9CA3AF;margin-top:2px">${l}</div>`).join('')}
                ${isMobile ? '<div style="font-size:10px;color:#9CA3AF;margin-top:6px;border-top:1px solid #EEEBE6;padding-top:4px">Tap × to close</div>' : ''}
              `
              const { offsetLeft: posX, offsetTop: posY } = chart.canvas
              const containerWidth = el.parentElement?.offsetWidth ?? 320
              const caretX = tooltip.caretX
              // Keep tooltip within container bounds
              const tipWidth = 200
              let left = posX + caretX
              let transform = 'translate(-50%, -110%)'
              if (left + tipWidth / 2 > containerWidth) {
                left = containerWidth - tipWidth / 2 - 8
                transform = 'translate(-50%, -110%)'
              } else if (left - tipWidth / 2 < 0) {
                left = tipWidth / 2 + 8
              }
              el.style.display = 'block'
              el.style.left = `${left}px`
              el.style.top = `${posY + tooltip.caretY}px`
              el.style.transform = transform
            },
          },
        },
        scales: {
          x: {
            ...BASE_CHART_OPTIONS.scales.x,
            ticks: { ...BASE_CHART_OPTIONS.scales.x.ticks, maxRotation: 0 },
          },
          y: BASE_CHART_OPTIONS.scales.y,
        },
      } as any,
    })

    return () => { chartRef.current?.destroy() }
  }, [data, lineColor, avgColor, peakDotColor, isKenp])

  if (data.length < 5) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px', color: '#9CA3AF' }}>
        <div className="text-[13px]">Not enough data to chart yet.</div>
        <div className="text-[12px] mt-1">Upload more KDP reports to see daily trends.</div>
      </div>
    )
  }

  const peakDay = data.reduce((best, d) => (d.value > best.value ? d : best), data[0])
  const avgWindow = isKenp ? 3 : 7
  const avgLine   = isKenp ? CHART_COLORS.teal : avgColor
  const avgLabel  = isKenp ? '3-day momentum' : '7-day avg'

  return (
    <div>
      <div style={{ minHeight: 220, position: 'relative' }}>
        <canvas ref={canvasRef} />
        {/* External HTML tooltip with dismiss button */}
        <div
          ref={tooltipElRef}
          style={{
            display: 'none',
            position: 'absolute',
            background: 'white',
            border: '0.5px solid #EEEBE6',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            padding: '10px 14px',
            pointerEvents: 'auto',
            maxWidth: 240,
            minWidth: 140,
            zIndex: 50,
          }}
        />
      </div>
      <ChartLegend items={[
        { color: lineColor,            label: isKenp ? 'KENP Reads' : 'Units Sold', type: 'square' },
        { color: avgLine,              label: avgLabel,                              type: 'line'   },
        { color: CHART_COLORS.amber,   label: `Peak: ${formatShortDate(peakDay.date)} (${peakDay.value.toLocaleString()})`, type: 'square' },
      ]} />
    </div>
  )
}

// ── Heatmap Calendar (Chart 5 — toggle view for Chart 1) ─────────────────────
function HeatmapCalendar({
  data,
  emailSendDates,
}: {
  data: DailyData[]
  emailSendDates: Set<string>
}) {
  if (data.length === 0) {
    return <div className="text-[12px] py-6 text-center" style={{ color: '#6B7280' }}>No data for this range</div>
  }

  const maxVal = Math.max(...data.map(d => d.value), 1)

  function cellColor(value: number): string {
    if (value === 0) return '#FFF8F0'
    const t = value / maxVal
    if (t < 0.33)  return `rgba(233,160,32,${(0.2 + t * 1.2).toFixed(2)})`
    if (t < 0.66)  return `rgba(233,160,32,${(0.6 + (t - 0.33) * 1.0).toFixed(2)})`
    return `rgba(249,123,107,${(0.5 + (t - 0.66) * 1.5).toFixed(2)})`
  }

  const peakVal = Math.max(...data.map(d => d.value))
  const showInline = data.length <= 31

  return (
    <div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 31)}, 1fr)`, minHeight: 60 }}
      >
        {data.map((d, i) => {
          const isEmail = emailSendDates.has(d.date)
          const isPeak  = d.value > 0 && d.value === peakVal
          const tooltipParts = [
            formatShortDate(d.date),
            `${d.value} units`,
            ...(isPeak ? ['Peak day'] : []),
            ...(isEmail ? ['Email sent'] : []),
          ]
          return (
            <div
              key={i}
              title={tooltipParts.join(' · ')}
              className="rounded-sm flex flex-col items-center justify-center gap-0.5 relative group"
              style={{
                background: cellColor(d.value),
                minHeight: 48,
                outline: isEmail ? `2px solid ${CHART_COLORS.plum}` : undefined,
                outlineOffset: isEmail ? '-2px' : undefined,
                cursor: 'default',
              }}
            >
              {showInline && (
                <span
                  className="text-[6px] leading-none"
                  style={{ color: d.value > maxVal * 0.5 ? 'rgba(30,45,61,0.45)' : '#9CA3AF' }}
                >
                  {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              <span
                className="text-[8px] font-bold leading-none"
                style={{ color: d.value > maxVal * 0.5 ? 'rgba(30,45,61,0.6)' : '#9CA3AF' }}
              >
                {d.value > 0 ? d.value : ''}
              </span>
            </div>
          )
        })}
      </div>
      {/* Date labels row — only when cells are too narrow for inline dates */}
      {!showInline && (
      <div
        className="grid gap-1 mt-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 31)}, 1fr)`, height: 28, overflow: 'hidden' }}
      >
        {data.map((d, i) => (
          <div key={i} className="flex items-start justify-center overflow-hidden">
            <span
              className="text-[7px] leading-none whitespace-nowrap"
              style={{
                color: '#9CA3AF',
                display: 'block',
                transform: 'rotate(-45deg)',
                transformOrigin: 'top left',
                marginLeft: 3,
              }}
            >
              {formatShortDate(d.date)}
            </span>
          </div>
        ))}
      </div>
      )}
      <div className="flex flex-wrap items-center justify-between mt-3 gap-2">
        <ChartLegend items={[
          { color: '#FFF8F0',          label: '0 units',   type: 'square' },
          { color: CHART_COLORS.amber, label: 'Mid',       type: 'square' },
          { color: CHART_COLORS.coral, label: 'Peak',      type: 'square' },
          { color: CHART_COLORS.plum,  label: 'Email day', type: 'square' },
        ]} />
      </div>
    </div>
  )
}

// ── Chart 3 — Ad Spend vs Royalties ──────────────────────────────────────────
function AdSpendRoyaltiesChart({ logs }: { logs: RoasLog[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    if (!canvasRef.current || logs.length === 0) return
    const ctx2d = canvasRef.current.getContext('2d')!
    if (chartRef.current) chartRef.current.destroy()

    const labels = logs.map(r => formatShortDate(r.date))
    const spends = logs.map(r => r.spend)

    // Cumulative spend and royalties
    const cumSpend: number[] = []
    const cumRoyalties: number[] = []
    let runSpend = 0, runEarnings = 0
    logs.forEach(r => {
      runSpend    += r.spend
      runEarnings += r.earnings
      cumSpend.push(parseFloat(runSpend.toFixed(2)))
      cumRoyalties.push(parseFloat(runEarnings.toFixed(2)))
    })

    chartRef.current = new ChartJS(ctx2d, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          // Daily spend bars on left y-axis
          { ...barDataset(spends, CHART_COLORS.coral, 'Daily Spend'), yAxisID: 'y' },
          // Cumulative royalties on right y-axis
          {
            type: 'line' as any,
            label: 'Cumulative Royalties',
            data: cumRoyalties,
            borderColor: CHART_COLORS.sage,
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: CHART_COLORS.sage,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            yAxisID: 'y2',
          },
          // Break-even = running cumulative spend (dashed amber)
          {
            type: 'line' as any,
            label: 'Break-even',
            data: cumSpend,
            borderColor: CHART_COLORS.amber,
            borderWidth: 1.5,
            borderDash: [6, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: BASE_CHART_OPTIONS.animation,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...BASE_CHART_OPTIONS.plugins.tooltip,
            callbacks: {
              title: (items: any[]) => items.length ? labels[items[0].dataIndex] : '',
              label: (item: any) => {
                if (item.datasetIndex === 0) return ` Daily spend: $${item.raw}`
                if (item.datasetIndex === 1) return ` Cumulative royalties: $${Number(item.raw).toFixed(2)}`
                return ` Break-even threshold: $${Number(item.raw).toFixed(2)}`
              },
            },
          },
        },
        scales: {
          x: {
            ...BASE_CHART_OPTIONS.scales.x,
            ticks: { ...BASE_CHART_OPTIONS.scales.x.ticks, maxRotation: 0 },
          },
          y: {
            ...BASE_CHART_OPTIONS.scales.y,
            position: 'left' as const,
            title: { display: true, text: 'Spend ($)', font: { size: 9 }, color: 'rgba(30,45,61,0.4)' },
          },
          y2: {
            ...BASE_CHART_OPTIONS.scales.y,
            position: 'right' as const,
            grid: { display: false },
            title: { display: true, text: 'Royalties ($)', font: { size: 9 }, color: 'rgba(30,45,61,0.4)' },
          },
        },
      } as any,
    })

    return () => { chartRef.current?.destroy() }
  }, [logs])

  // Break-even insight
  let cumSpend = 0, cumEarnings = 0
  let breakEvenDate: string | null = null
  let daysToBreakEven = 0
  for (const log of logs) {
    daysToBreakEven++
    cumSpend    += log.spend
    cumEarnings += log.earnings
    if (!breakEvenDate && cumEarnings >= cumSpend) {
      breakEvenDate = log.date
      break
    }
  }
  const totalSpend    = logs.reduce((s, r) => s + r.spend, 0)
  const totalEarnings = logs.reduce((s, r) => s + r.earnings, 0)

  if (logs.length === 0) {
    return (
      <div className="text-[12px] py-6 text-center" style={{ color: '#6B7280' }}>
        No ROAS data for this range.{' '}
        <a href="/dashboard/roas" style={{ color: CHART_COLORS.amber }}>Log entries on the ROAS page →</a>
      </div>
    )
  }

  return (
    <div>
      <div style={{ minHeight: 220, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      <ChartLegend items={[
        { color: CHART_COLORS.coral, label: 'Daily Ad Spend',        type: 'square' },
        { color: CHART_COLORS.sage,  label: 'Cumulative Royalties',  type: 'line'   },
        { color: CHART_COLORS.amber, label: 'Break-even threshold',  type: 'line'   },
      ]} />
      {breakEvenDate ? (
        <div className="mt-3 text-[12px] px-3 py-2 rounded-lg" style={{ background: 'rgba(110,191,139,0.08)', color: '#374151' }}>
          You crossed break-even on <strong>{formatShortDate(breakEvenDate)}</strong> — {daysToBreakEven} day{daysToBreakEven !== 1 ? 's' : ''} into the period.
        </div>
      ) : totalSpend > 0 ? (
        <div className="mt-3 text-[12px] px-3 py-2 rounded-lg" style={{ background: 'rgba(249,123,107,0.08)', color: '#374151' }}>
          You&apos;re <strong>${(totalSpend - totalEarnings).toFixed(2)}</strong> from break-even this period. One good day covers it.
        </div>
      ) : null}
    </div>
  )
}

// ── Chart 4 — Email Sends vs Sales ───────────────────────────────────────────
function EmailVsSalesChart({
  data,
  emailSendDates,
  emailCampaignMap,
}: {
  data: DailyData[]
  emailSendDates: Set<string>
  emailCampaignMap: Record<string, string>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return
    const ctx2d = canvasRef.current.getContext('2d')!
    if (chartRef.current) chartRef.current.destroy()

    const values = data.map(d => d.value)
    const labels = data.map(d => formatShortDate(d.date))

    // Thin plum bars on email send days
    const emailBarData = data.map(d => emailSendDates.has(d.date) ? d.value : 0)

    // Peach points on day-after-email
    const pointRadii  = data.map((d, i) => (i > 0 && emailSendDates.has(data[i - 1].date)) ? 5 : 0)
    const pointColors = data.map((d, i) => (i > 0 && emailSendDates.has(data[i - 1].date)) ? CHART_COLORS.peach : CHART_COLORS.coral)

    chartRef.current = new ChartJS(ctx2d, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          // Email send day bars — plum, behind units
          {
            type: 'bar' as any,
            label: 'Email sent',
            data: emailBarData,
            backgroundColor: CHART_COLORS.plum + '28',
            hoverBackgroundColor: CHART_COLORS.plum + '50',
            borderWidth: 0,
            order: 2,
          },
          // Units area chart — coral, in front
          {
            ...areaDataset(values, CHART_COLORS.coral, 'Units Sold'),
            pointRadius: pointRadii,
            pointBackgroundColor: pointColors,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: BASE_CHART_OPTIONS.animation,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...BASE_CHART_OPTIONS.plugins.tooltip,
            callbacks: {
              title: (items: any[]) => items.length ? labels[items[0].dataIndex] : '',
              label: (item: any) => {
                if (item.datasetIndex === 0 && emailBarData[item.dataIndex] > 0) {
                  const name   = emailCampaignMap[data[item.dataIndex].date] || 'Email sent'
                  const next   = data[item.dataIndex + 1]
                  const u48    = data[item.dataIndex].value + (next?.value ?? 0)
                  return ` 📧 ${name} · +${u48} units next 48hrs`
                }
                if (item.datasetIndex === 1) return ` ${(item.raw as number).toLocaleString()} units`
                return ''
              },
            },
          },
        },
        scales: {
          x: {
            ...BASE_CHART_OPTIONS.scales.x,
            ticks: { ...BASE_CHART_OPTIONS.scales.x.ticks, maxRotation: 0 },
          },
          y: BASE_CHART_OPTIONS.scales.y,
        },
      } as any,
    })

    return () => { chartRef.current?.destroy() }
  }, [data, emailSendDates, emailCampaignMap])

  // Best email insight
  const dailyAvg = data.length > 0 ? sumValues(data) / data.length : 0
  const topEmailInsight = data
    .flatMap((d, i) => {
      if (!emailSendDates.has(d.date)) return []
      const units48  = d.value + (data[i + 1]?.value ?? 0)
      const name     = emailCampaignMap[d.date] || 'Email'
      const multiple = dailyAvg > 0 ? units48 / (dailyAvg * 2) : 0
      return [{ name, units48, multiple, date: d.date }]
    })
    .sort((a, b) => b.units48 - a.units48)[0] ?? null

  if (data.length === 0) {
    return <div className="text-[12px] py-6 text-center" style={{ color: '#6B7280' }}>No data for this range</div>
  }

  return (
    <div>
      <div style={{ minHeight: 220, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      <ChartLegend items={[
        { color: CHART_COLORS.coral, label: 'Units Sold',      type: 'square' },
        { color: CHART_COLORS.plum,  label: 'Email send day',  type: 'square' },
        { color: CHART_COLORS.peach, label: 'Day after email', type: 'square' },
      ]} />
      {topEmailInsight && (
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid #EEEBE6' }}>
          <div className="text-[12px] px-3 py-2" style={{ background: 'rgba(233,160,32,0.06)', color: '#374151' }}>
            <strong>{topEmailInsight.name}</strong> → {topEmailInsight.units48} units in 48hrs
            {topEmailInsight.multiple > 0 && ` (${topEmailInsight.multiple.toFixed(1)}× your 2-day average)`}
          </div>
          <div className="px-3 py-2.5" style={{ background: '#FFF8F0', borderTop: '1px solid #EEEBE6' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] mb-1" style={{ color: '#E9A020' }}>
              What To Do Next
            </div>
            <div className="text-[12px] leading-relaxed" style={{ color: '#374151' }}>
              Your <strong>{topEmailInsight.name}</strong> on {formatShortDate(topEmailInsight.date)} drove <strong>{topEmailInsight.units48} units</strong> in 48 hours
              {topEmailInsight.multiple > 0 ? ` — ${topEmailInsight.multiple.toFixed(1)}× your normal pace` : ''}.
              {' '}Go to MailerLite, find this campaign, and schedule a follow-up to non-openers within 5 days while momentum is live.
            </div>
          </div>
        </div>
      )}
      {emailSendDates.size === 0 && (
        <p className="mt-2 text-[11px]" style={{ color: '#6B7280' }}>
          Connect MailerLite in <a href="/dashboard/settings" style={{ color: CHART_COLORS.amber }}>Settings</a> to overlay email send days on sales.
        </p>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function KDPPage() {
  const [coachTitle]  = useState(() => getCoachTitle())
  const [allAnalyses, setAllAnalyses] = useState<Analysis[]>([])
  const [roasLogs,    setRoasLogs]    = useState<RoasLog[]>([])
  const [mlCampaigns, setMlCampaigns] = useState<MailerLiteCampaign[]>([])
  const [preset,      setPreset]      = useState<Preset>('last30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [heatmapView, setHeatmapView] = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [downloading,   setDownloading]   = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [excludedAsins, setExcludedAsins] = useState<Set<string>>(new Set())
  // ASINs the user has registered in Settings → My Books (used to filter out unknown titles)
  const [knownAsins,   setKnownAsins]   = useState<Set<string>>(new Set())
  // My Books list sorted by sortOrder — used for stable ASIN-based color assignment
  const [myBooksList,  setMyBooksList]  = useState<any[]>([])
  const [kdpLastUploadedAt, setKdpLastUploadedAt] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    // Build query params from the current date preset so the server can filter by month range
    const r = preset === 'custom'
      ? { start: customStart, end: customEnd }
      : getPresetRange(preset)
    const qp = r.start && r.end
      ? '?' + new URLSearchParams({ start: r.start, end: r.end }).toString()
      : ''
    Promise.all([
      fetch(`/api/analyze${qp}`).then(r => r.json()).catch(() => ({})),
      fetch('/api/roas').then(r => r.json()).catch(() => ({ logs: [] })),
      fetch('/api/mailerlite').then(r => r.json()).catch(() => ({ data: null })),
      fetch('/api/books').then(r => r.json()).catch(() => ({ books: [] })),
      fetch('/api/prefs').then(r => r.json()).catch(() => ({})),
    ]).then(([analyzeData, roasData, mlData, booksData, prefsData]) => {
      const analyses: Analysis[] = (analyzeData.analyses ?? []).map(
        (a: any) => a.data ?? a
      )
      setAllAnalyses(analyses)
      if (analyzeData.kdpLastUploadedAt) setKdpLastUploadedAt(analyzeData.kdpLastUploadedAt)
      setRoasLogs((roasData.logs ?? []).map((r: any) => ({
        ...r,
        date: (r.date as string).substring(0, 10),
      })))
      if (mlData?.data?.campaigns) setMlCampaigns(mlData.data.campaigns)

      const books: any[] = booksData.books ?? []
      setMyBooksList(books)

      // Build excluded set: books the user has explicitly hidden in Settings
      const excluded = new Set<string>(
        books
          .filter((b: any) => b.excludeFromDashboard && b.asin)
          .map((b: any) => String(b.asin).trim().toUpperCase())
      )
      const strayExcluded: string[] = Array.isArray(prefsData?.columnPrefs?.excludedKdpTitles)
        ? prefsData.columnPrefs.excludedKdpTitles
        : []
      strayExcluded.forEach((asin: string) => excluded.add(String(asin).trim().toUpperCase()))
      setExcludedAsins(excluded)

      // Build known-ASINs set from My Books (non-excluded).
      // When non-empty, any KDP book whose ASIN is not in this set will be hidden —
      // this filters out books from other pen names (e.g. "162 Questions…").
      const known = new Set<string>(
        books
          .filter((b: any) => b.asin)
          .map((b: any) => String(b.asin).trim().toUpperCase())
      )
      setKnownAsins(known)
    }).finally(() => setLoading(false))
  }, [preset, customStart, customEnd])

  useEffect(() => {
    fetchData()
    window.addEventListener('dashboard-data-refresh', fetchData)
    return () => window.removeEventListener('dashboard-data-refresh', fetchData)
  }, [fetchData])

  const allDailyUnits = useMemo(() => {
    const merged: DailyData[] = []
    allAnalyses.forEach(a => { if (a.kdp?.dailyUnits) merged.push(...a.kdp.dailyUnits) })
    return merged
      .map(d => ({ ...d, date: normalizeDate(d.date) }))
      .filter(d => d.date)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allAnalyses])

  const allDailyKENP = useMemo(() => {
    const merged: DailyData[] = []
    allAnalyses.forEach(a => { if (a.kdp?.dailyKENP) merged.push(...a.kdp.dailyKENP) })
    return merged
      .map(d => ({ ...d, date: normalizeDate(d.date) }))
      .filter(d => d.date)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allAnalyses])

  const range = useMemo((): { start: string; end: string } => {
    if (preset === 'custom') return { start: customStart, end: customEnd }
    return getPresetRange(preset)
  }, [preset, customStart, customEnd])

  const filteredUnits = useMemo(() =>
    range.start && range.end
      ? allDailyUnits.filter(d => d.date >= range.start && d.date <= range.end)
      : allDailyUnits,
  [allDailyUnits, range])

  const filteredKENP = useMemo(() =>
    range.start && range.end
      ? allDailyKENP.filter(d => d.date >= range.start && d.date <= range.end)
      : allDailyKENP,
  [allDailyKENP, range])

  const filteredRoas = useMemo(() => {
    const sorted = [...roasLogs].sort((a, b) => a.date.localeCompare(b.date))
    return range.start && range.end
      ? sorted.filter(r => r.date >= range.start && r.date <= range.end)
      : sorted
  }, [roasLogs, range])

  const prevPeriod = useMemo(() => {
    if (!range.start || !range.end) return null
    return getPreviousPeriod(range.start, range.end)
  }, [range])

  const compareUnits = useMemo(() => {
    if (!compareMode || !prevPeriod) return undefined
    return allDailyUnits.filter(d => d.date >= prevPeriod.start && d.date <= prevPeriod.end)
  }, [compareMode, allDailyUnits, prevPeriod])

  const compareKENP = useMemo(() => {
    if (!compareMode || !prevPeriod) return undefined
    return allDailyKENP.filter(d => d.date >= prevPeriod.start && d.date <= prevPeriod.end)
  }, [compareMode, allDailyKENP, prevPeriod])

  const filteredTotalUnits = useMemo(() => sumValues(filteredUnits), [filteredUnits])
  const filteredTotalKENP  = useMemo(() => sumValues(filteredKENP),  [filteredKENP])

  // When no daily data exists (flat-format upload or date-column mismatch in KDP report),
  // fall back to the monthly aggregate so all KPI cards show data consistently.
  const noDailyData = allDailyUnits.length === 0 && allDailyKENP.length === 0
  const displayUnits = noDailyData ? (allAnalyses[0]?.kdp?.totalUnits ?? filteredTotalUnits) : filteredTotalUnits
  const displayKENP  = noDailyData ? (allAnalyses[0]?.kdp?.totalKENP  ?? filteredTotalKENP)  : filteredTotalKENP

  // Email send dates for Chart 4 and heatmap — prefer live MailerLite fetch, fall back to stored analysis
  const analysis = allAnalyses[0] ?? null
  const emailSendDates = useMemo(() => {
    const campaigns = mlCampaigns.length > 0 ? mlCampaigns : (analysis?.mailerLite?.campaigns ?? [])
    return new Set(campaigns.map(c => c.sentAt.substring(0, 10)).filter(Boolean))
  }, [mlCampaigns, analysis])

  const emailCampaignMap = useMemo(() => {
    const map: Record<string, string> = {}
    const campaigns = mlCampaigns.length > 0 ? mlCampaigns : (analysis?.mailerLite?.campaigns ?? [])
    campaigns.forEach(c => { if (c.sentAt) map[c.sentAt.substring(0, 10)] = c.name })
    return map
  }, [mlCampaigns, analysis])

  const kdp   = analysis?.kdp
  const coach = (analysis as any)?.kdpCoach

  // Map ASIN → color index based on My Books sort order (B1=0, B2=1, …).
  // This ensures color assignment is stable and tied to ASIN, not array position.
  const bookColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    myBooksList.forEach((b: any, i: number) => {
      if (b.asin) map[String(b.asin).trim().toUpperCase()] = i
    })
    return map
  }, [myBooksList])

  // Returns true when a KDP book should appear on the dashboard:
  // 1. Not explicitly excluded via Settings → My Books (excludeFromDashboard flag)
  // 2. If My Books list is non-empty, only show books whose ASIN is registered there
  //    (filters out books from other pen names that appear in the XLSX)
  function isBookVisible(b: { asin?: string }): boolean {
    const asinUpper = b.asin?.trim().toUpperCase() ?? ''
    if (excludedAsins.has(asinUpper)) return false
    if (knownAsins.size > 0 && asinUpper && !knownAsins.has(asinUpper)) return false
    return true
  }

  // Books present in KDP data but not yet added to My Books catalog
  const unmatchedBooks = useMemo(() => {
    if (!kdp?.books || knownAsins.size === 0) return []
    return kdp.books.filter(b => {
      const asinUpper = b.asin?.trim().toUpperCase() ?? ''
      if (excludedAsins.has(asinUpper)) return false
      return asinUpper && !knownAsins.has(asinUpper)
    })
  }, [kdp, knownAsins, excludedAsins])

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  const handleDownloadTracker = async () => {
    setDownloading(true)
    try {
      const body: Record<string, unknown> = {}
      if (range.start && range.end) body.dateRange = { start: range.start, end: range.end }
      const res = await fetch('/api/kdp/generate-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Failed to generate tracker')
        return
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `AuthorDash_Ad_Tracker_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <DarkPage title="KDP — Sales & Royalties" subtitle="Kindle Direct Publishing · Units sold, KENP reads, royalties">
        <PageSkeleton cols={5} />
      </DarkPage>
    )
  }

  return (
    <DarkPage title="KDP — Sales & Royalties" subtitle="Kindle Direct Publishing · Units sold, KENP reads, royalties"
      headerRight={
        <div>
          <DateRangePicker preset={preset} onPreset={handlePreset}
            customStart={customStart} customEnd={customEnd}
            onCustomStart={setCustomStart} onCustomEnd={setCustomEnd} />
          <p className="text-[11px] mt-1.5" style={{ color: '#9CA3AF' }}>
            {kdpLastUploadedAt
              ? (() => {
                  const uploadDate = new Date(kdpLastUploadedAt)
                  const today = new Date()
                  const isToday = uploadDate.toDateString() === today.toDateString()
                  return isToday
                    ? <>Showing data from today&apos;s upload ✅</>
                    : <>Showing data from your last upload — {uploadDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. <a href="/dashboard?upload=1" style={{ color: '#E9A020', textDecoration: 'underline' }}>Upload a new report</a> to see the latest numbers.</>
                })()
              : <>No data uploaded yet. <a href="/dashboard?upload=1" style={{ color: '#E9A020', textDecoration: 'underline' }}>Upload your KDP report</a> to get started.</>
            }
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
            KDP data typically lags 48–72 hours. Recent days may show incomplete numbers.
          </p>
          {kdp && (
            <div className="mt-2">
              <button
                onClick={handleDownloadTracker}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-opacity"
                style={{ background: '#E9A020', color: '#1E2D3D', opacity: downloading ? 0.7 : 1 }}
              >
                {downloading ? 'Building tracker…' : 'Download Ad Tracker →'}
              </button>
            </div>
          )}
        </div>
      }>
      <Suspense fallback={null}><FreshBanner /></Suspense>
      <LastUploadBadge channel="kdp" />
      {unmatchedBooks.length > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.25)' }}>
          <span>📚</span>
          <p className="text-[13px] m-0" style={{ color: '#92400E' }}>
            We found data for <strong>{unmatchedBooks.length} title{unmatchedBooks.length !== 1 ? 's' : ''}</strong> not in your catalog.{' '}
            <a href="/dashboard/settings" style={{ color: '#E9A020', textDecoration: 'underline', fontWeight: 600 }}>
              Add them to see full insights →
            </a>
          </p>
        </div>
      )}
      {!kdp ? (
        <div className="text-center py-16" style={{ color: '#6B7280' }}>
          <div className="text-4xl mb-4">📚</div>
          <div className="text-xl font-semibold mb-2" style={{ color: '#1E2D3D' }}>No KDP data yet</div>
          <p className="text-sm mb-4">Upload your KDP Excel report to see your analysis</p>
          <a href="/dashboard?upload=1" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>
            Upload Files →
          </a>
        </div>
      ) : (
        <>
          <GoalSection
            page="kdp"
            currentValues={{
              kdp_units:     displayUnits,
              kdp_kenp:      displayKENP,
              kdp_royalties: kdp.totalRoyaltiesUSD,
            }}
          />

          {/* KPI Strip */}
          {(() => {
            // KDP monthly reports have no per-day royalty breakdown, so Total Est. Revenue
            // always includes the full-period royalties regardless of the date filter.
            // displayUnits / displayKENP fall back to monthly aggregate when no daily data.
            const estKu = Math.round(displayKENP * 0.0045 * 100) / 100
            const totalEstRevenue = Math.round((kdp.totalRoyaltiesUSD + estKu) * 100) / 100
            const prev = allAnalyses[1]?.kdp
            const unitsDelta = prev ? displayUnits - prev.totalUnits : null
            const kenpDelta  = prev ? displayKENP  - prev.totalKENP  : null
            const revDelta   = prev ? totalEstRevenue - Math.round((prev.totalRoyaltiesUSD + prev.totalKENP * 0.0045) * 100) / 100 : null

            const kpis = [
              { label: 'Units Sold',        value: displayUnits.toLocaleString(), delta: unitsDelta, color: '#38bdf8', tooltip: 'totalUnits' },
              { label: 'KENP Reads',        value: displayKENP.toLocaleString(),  delta: kenpDelta,  color: '#fbbf24', tooltip: 'kenp' },
              { label: 'Est. KU Revenue',   value: fmtCurrency(estKu),          delta: null,       color: '#a78bfa', tooltip: 'estKuEarnings',    projection: true },
              { label: 'Total Est. Revenue',value: fmtCurrency(totalEstRevenue), delta: revDelta,   color: '#fb7185', tooltip: 'totalEstRevenue', projection: true },
            ]

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {kpis.map((kpi, i) => {
                  const isEmpty = kpi.value === '—' || kpi.value === '0' || kpi.value === '$0'
                  return (
                    <div key={i} className="rounded-xl relative p-4"
                      style={{
                        background: 'white',
                        border: '1px solid #EEEBE6',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        minWidth: 0,
                        overflow: 'hidden',
                        paddingBottom: 16,
                      }}>
                      <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ background: isEmpty ? '#EEEBE6' : kpi.color }} />
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[11px] font-medium uppercase" style={{ color: '#6B7280', letterSpacing: '0.3px' }}>
                          {kpi.label}
                        </span>
                        <MetricTooltip metric={kpi.tooltip} />
                      </div>
                      {isEmpty ? (
                        <div className="flex flex-col items-start" style={{ minHeight: 40 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mb-1" style={{ opacity: 0.15 }}>
                            <rect x="3" y="14" width="4" height="7" rx="1" fill="#1E2D3D" />
                            <rect x="10" y="9" width="4" height="12" rx="1" fill="#1E2D3D" />
                            <rect x="17" y="4" width="4" height="17" rx="1" fill="#1E2D3D" />
                          </svg>
                          <div className="text-[11px]" style={{ color: '#6B7280' }}>No data yet</div>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold leading-none tracking-tight"
                            style={{ color: '#1E2D3D', fontSize: 'clamp(20px, 2vw, 28px)' }}>
                            {kpi.value}
                          </div>
                          {kpi.delta != null && kpi.delta !== 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-[11px] font-semibold"
                                style={{ color: kpi.delta > 0 ? '#6EBF8B' : '#F97B6B' }}>
                                {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta).toLocaleString()}
                              </span>
                              <span className="text-[10px]" style={{ color: '#6B7280' }}>vs prev</span>
                            </div>
                          )}
                          {kpi.projection && (
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5"
                              style={{ background: '#FEF3C7', color: '#92400E' }}>⚠ Estimate</span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {analysis && <InsightCallouts analysis={{ ...analysis, meta: undefined, mailerLite: undefined, pinterest: undefined }} page="kdp" />}
          {coach && <DarkCoachBox color="#fbbf24" title={coachTitle}>{coach}</DarkCoachBox>}

          {/* Book Title Picker — excludes books marked as hidden in Settings > My Books */}
          {kdp.books.filter(isBookVisible).length > 1 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[11px] font-medium uppercase" style={{ color: '#6B7280', letterSpacing: '0.3px' }}>Filter:</span>
              <button
                onClick={() => setSelectedBooks(new Set())}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{
                  background: selectedBooks.size === 0 ? '#E9A020' : '#FFF8F0',
                  color: selectedBooks.size === 0 ? 'white' : '#1E2D3D',
                  border: `0.5px solid ${selectedBooks.size === 0 ? '#E9A020' : '#EEEBE6'}`,
                  cursor: 'pointer',
                }}>
                All Books
              </button>
              {kdp.books.filter(isBookVisible).map((b) => {
                const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA']
                const colorIdx = bookColorMap[b.asin?.trim().toUpperCase() ?? ''] ?? kdp.books.indexOf(b)
                const c = BOOK_COLORS[colorIdx] || '#6B7280'
                const isSelected = selectedBooks.has(b.asin)
                const isPB = (b as any).format === 'paperback'
                return (
                  <button key={b.asin || b.shortTitle}
                    onClick={() => setSelectedBooks(prev => {
                      const next = new Set(prev)
                      if (next.has(b.asin)) next.delete(b.asin); else next.add(b.asin)
                      return next
                    })}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                    style={{
                      background: isSelected ? c : '#FFF8F0',
                      color: isSelected ? 'white' : '#1E2D3D',
                      border: `0.5px solid ${isSelected ? c : '#EEEBE6'}`,
                      cursor: 'pointer',
                    }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: isSelected ? 'white' : c }} />
                    {b.shortTitle}
                    {isPB && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{ background: isSelected ? 'rgba(255,255,255,0.25)' : '#F5F5F4', color: isSelected ? 'white' : '#6B7280', lineHeight: 1 }}>
                        PB
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Book Performance Charts */}
          {(() => {
            const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA']
            const dashboardBooks = kdp.books.filter(isBookVisible)
            const visibleBooks = selectedBooks.size > 0
              ? dashboardBooks.filter(b => selectedBooks.has(b.asin))
              : dashboardBooks

            function BookBar({ books, metric, title }: { books: typeof visibleBooks; metric: 'units' | 'kenp'; title: string }) {
              const maxVal = Math.max(...books.map(b => b[metric]), 1)
              return (
                <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <h3 className="text-[14px] font-semibold mb-4" style={{ color: '#1E2D3D' }}>{title}</h3>
                  <div className="space-y-3">
                    {books.map((b) => {
                      const colorIdx = bookColorMap[b.asin?.trim().toUpperCase() ?? ''] ?? kdp!.books.indexOf(b)
                      const color = BOOK_COLORS[colorIdx] || '#6B7280'
                      const val = b[metric]
                      return (
                        <div key={b.asin || b.shortTitle}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: '#374151' }}>
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                              {b.shortTitle}
                            </span>
                            <span className="text-[13px] font-bold" style={{ color: '#1E2D3D' }}>{val.toLocaleString()}</span>
                          </div>
                          <div className="rounded-full overflow-hidden" style={{ height: 24, background: '#F5F5F4' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(val / maxVal) * 100}%`, background: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <BookBar books={visibleBooks} metric="units" title="Sales by Title" />
                <BookBar books={visibleBooks} metric="kenp" title="Reader Engagement by Title" />
              </div>
            )
          })()}

          {/* Unmatched books — present in KDP data but not in My Books catalog */}
          {unmatchedBooks.length > 0 && (
            <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(233,160,32,0.25)' }}>
              <div className="px-5 py-3" style={{ background: 'rgba(233,160,32,0.06)', borderBottom: '1px solid rgba(233,160,32,0.15)' }}>
                <span className="text-[12px] font-semibold" style={{ color: '#92400E' }}>
                  Titles not in your catalog — data saved, not yet matched
                </span>
              </div>
              <div className="divide-y divide-[#EEEBE6]" style={{ background: 'white' }}>
                {unmatchedBooks.map(b => (
                  <div key={b.asin || b.shortTitle} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>{b.title || b.shortTitle}</div>
                      {b.asin && (
                        <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>ASIN: {b.asin}</div>
                      )}
                      <div className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>
                        {b.units.toLocaleString()} units · {b.kenp.toLocaleString()} KENP
                      </div>
                    </div>
                    <a
                      href="/dashboard/settings"
                      className="text-[11px] font-semibold whitespace-nowrap ml-4"
                      style={{ color: '#E9A020', textDecoration: 'none' }}
                    >
                      Add to catalog →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewing bar */}
          {range.start && range.end && (
            <ViewingBar
              start={formatShortDate(range.start)}
              end={formatShortDate(range.end)}
              days={filteredUnits.length || undefined}
              summary={filteredTotalUnits > 0 ? `${filteredTotalUnits.toLocaleString()} units · ${filteredTotalKENP.toLocaleString()} KENP` : undefined}
            />
          )}

          {/* Compare toggle */}
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => setCompareMode(m => !m)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all duration-150"
              style={{
                background: compareMode ? 'rgba(233,160,32,0.12)' : '#F5F5F4',
                border: `1px solid ${compareMode ? 'rgba(233,160,32,0.4)' : 'transparent'}`,
                color: compareMode ? '#e9a020' : '#6B7280',
              }}
            >
              <span>{compareMode ? '◉' : '○'}</span>
              Compare to previous period
            </button>
          </div>

          {/* ── Chart 1 — Daily Units Sold (with Chart 5 heatmap toggle) ── */}
          <CollapsibleSection
            title="Daily Units Sold"
            storageKey="kdp-section-daily-units"
            className="mb-5"
            subtitle={compareMode && prevPeriod ? `vs ${formatDisplayRange(prevPeriod.start, prevPeriod.end)}` : undefined}
            headerRight={
              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #EEEBE6' }}>
                <button
                  onClick={() => setHeatmapView(false)}
                  className="px-3 py-1 text-[11px] font-medium transition-all"
                  style={{ background: !heatmapView ? '#E9A020' : '#FFF8F0', color: !heatmapView ? 'white' : '#6B7280' }}
                >
                  Area view
                </button>
                <button
                  onClick={() => setHeatmapView(true)}
                  className="px-3 py-1 text-[11px] font-medium transition-all"
                  style={{ background: heatmapView ? '#E9A020' : '#FFF8F0', color: heatmapView ? 'white' : '#6B7280' }}
                >
                  Heatmap
                </button>
              </div>
            }
          >
            <div className="px-5 py-4">
              {heatmapView ? (
                <HeatmapCalendar data={filteredUnits} emailSendDates={emailSendDates} />
              ) : (
                <DailyAreaChart
                  data={filteredUnits}
                  lineColor={CHART_COLORS.coral}
                  avgColor={CHART_COLORS.amber}
                  peakDotColor={CHART_COLORS.amber}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* ── Chart 2 — Daily KENP Reads ── */}
          {filteredKENP.length > 0 && (
            <CollapsibleSection
              title="Daily KENP Reads"
              storageKey="kdp-section-kenp"
              className="mb-5"
              subtitle={compareMode && prevPeriod ? `vs ${formatDisplayRange(prevPeriod.start, prevPeriod.end)}` : 'Kindle Unlimited page reads · est. $0.0045/page'}
            >
              <div className="px-5 py-4">
                <DailyAreaChart
                  data={filteredKENP}
                  lineColor={CHART_COLORS.amber}
                  avgColor={CHART_COLORS.navy}
                  peakDotColor={CHART_COLORS.coral}
                  isKenp
                />
              </div>
            </CollapsibleSection>
          )}

          {/* ── Chart 3 — Ad Spend vs Royalties ── */}
          <CollapsibleSection
            title="Ad Spend vs Royalties"
            storageKey="kdp-section-ad-spend"
            className="mb-5"
            subtitle="Daily ad spend vs cumulative royalties — lines cross at break-even"
            badge={<span className="text-[10.5px]" style={{ color: '#6B7280' }}>From ROAS log</span>}
          >
            <div className="px-5 py-4">
              <AdSpendRoyaltiesChart logs={filteredRoas} />
            </div>
          </CollapsibleSection>

          {/* ── Chart 4 — Email Sends vs Sales ── */}
          <CollapsibleSection
            title="Email Sends vs Sales"
            storageKey="kdp-section-email"
            className="mb-5"
            subtitle="Units sold with email send days overlaid — peach dot = day after email"
          >
            <div className="px-5 py-4">
              <EmailVsSalesChart
                data={filteredUnits}
                emailSendDates={emailSendDates}
                emailCampaignMap={emailCampaignMap}
              />
            </div>
          </CollapsibleSection>

          {/* ── Category Intelligence ── */}
          <CollapsibleSection
            title="Category Intelligence"
            storageKey="kdp-section-categories"
            className="mb-5"
            subtitle="See every Amazon category your book is in and how you rank"
          >
            <CategoryIntelligence />
          </CollapsibleSection>

          {/* ── Sales Rank Tracker ── */}
          <CollapsibleSection
            title="Sales Rank Tracker"
            storageKey="kdp-section-bsr"
            className="mb-5"
            subtitle="Track your Amazon Best Seller Rank over time"
          >
            <BsrTracker />
          </CollapsibleSection>
        </>
      )}
    </DarkPage>
  )
}
