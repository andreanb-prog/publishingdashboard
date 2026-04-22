'use client'
// app/dashboard/rank/page.tsx — ROAS Hub
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary'
// Central page for "Is my ad spend working?" — tabbed BSR + ad tracker with LM cost-per-sub
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useBooks, type BookRecord } from '@/hooks/useBooks'
import NoBooksEmptyState from '@/components/NoBooksEmptyState'
import BsrFetchButton from '@/components/bsr/BsrFetchButton'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoasRow {
  id?: string
  date: string
  rank: number | null
  rankChange: number | null
  adSpend: number | null
  adSpendAutoFilled: boolean
  clicks: number | null
  cpc: number | null
  ctr: number | null
  revenue: number | null
  roas: number | null
  pageReads: number | null
  orders: number | null
  newSubs: number | null
  newSubsAutoFilled: boolean
  lpv?: number | null
  notes?: string | null
  costPerSub?: number | null
}

interface SummaryData {
  totalSpend: number | null
  bestBsr: number | null
  bestBsrTitle: string | null
  overallRoas: number | null
  costPerSub: number | null
}

// ── Feature Flags ─────────────────────────────────────────────────────────────

// Set to true to restore the 7-day data tables (BSR/ROAS spreadsheet grids)
const SHOW_DAILY_TABLE = false

// ── Constants ─────────────────────────────────────────────────────────────────

const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA']
const LM_COLOR = '#E9A020'
const GOALS_BG = '#FFF8F0'
const ROW_STRIPE = '#FFF8F0'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—'
  return `$${v.toFixed(2)}`
}
function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString()
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}
function fmtRoas(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(2)}x`
}
function fmtBsr(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString()
}

// ── Summary Strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/books/bsr/summary')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const tiles: { label: string; value: string | null; sublabel?: string | null }[] = [
    { label: "Today's Total Spend", value: data?.totalSpend != null ? `$${data.totalSpend.toFixed(2)}` : null },
    {
      label: 'Best BSR Today',
      value: data?.bestBsr != null ? `#${data.bestBsr.toLocaleString()}` : null,
      sublabel: data?.bestBsrTitle ?? null,
    },
    { label: 'Overall ROAS (7d)',   value: data?.overallRoas != null ? `${data.overallRoas.toFixed(2)}x` : null },
    { label: 'Cost Per Subscriber', value: data?.costPerSub  != null ? `$${data.costPerSub.toFixed(2)}` : null },
  ]

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {tiles.map((tile, i) => (
        <div
          key={i}
          className="flex-1 min-w-[150px] rounded-lg px-5 py-4"
          style={{ background: GOALS_BG }}
        >
          {loading ? (
            <div className="animate-pulse rounded h-7 w-20 mb-1" style={{ background: '#EEEBE6' }} />
          ) : (
            <div
              className="font-semibold leading-none mb-1"
              style={{ fontSize: 28, color: tile.value ? '#1E2D3D' : '#9CA3AF' }}
            >
              {tile.value ?? (
                <span className="text-[14px] font-normal" style={{ color: '#E9A020' }}>⚠ No data</span>
              )}
            </div>
          )}
          <div className="text-[12px]" style={{ color: '#9CA3AF' }}>
            {tile.label}{tile.sublabel ? ` · ${tile.sublabel}` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Editable Cell ─────────────────────────────────────────────────────────────

interface EditableCellProps {
  value: number | string | null | undefined
  field: string
  rowDate: string
  asin: string
  onSave: (field: string, date: string, raw: string) => void
  displayValue: string
  disabled?: boolean
  autoFilled?: boolean
  cellStyle?: React.CSSProperties
  isText?: boolean
  maxLen?: number
}

function EditableCell({
  value, field, rowDate, asin, onSave, displayValue, disabled, autoFilled, cellStyle, isText, maxLen,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    if (disabled) return
    setDraft(value != null ? String(value) : '')
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (draft !== String(value ?? '')) {
      onSave(field, rowDate, draft)
    }
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  return (
    <td
      className="px-2 py-1.5 text-[12px] relative"
      style={{ color: '#1E2D3D', cursor: disabled ? 'default' : 'text', ...cellStyle }}
      onClick={startEdit}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(maxLen ? e.target.value.slice(0, maxLen) : e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full rounded px-1 py-0 text-[12px] outline-none"
          style={{
            border: '1.5px solid #E9A020',
            background: 'white',
            color: '#1E2D3D',
            minWidth: isText ? 80 : 60,
          }}
          type={isText ? 'text' : 'number'}
          step={field === 'adSpend' || field === 'revenue' ? '0.01' : '1'}
          min="0"
        />
      ) : (
        <span className="flex items-center gap-0.5">
          {displayValue}
          {autoFilled && (
            <span className="text-[8px] leading-none" style={{ color: LM_COLOR }}>●</span>
          )}
        </span>
      )}
    </td>
  )
}

// ── ROAS Table (Book tabs) ─────────────────────────────────────────────────────

interface RoasTableProps {
  rows: RoasRow[]
  loading: boolean
  asin: string
  onSave: (field: string, date: string, raw: string) => void
}

const GOALS = { cpc: 0.10, ctr: 15 }

function cpcColor(v: number | null) {
  if (v == null) return undefined
  return v <= GOALS.cpc ? '#6EBF8B' : '#F97B6B'
}
function ctrColor(v: number | null) {
  if (v == null) return undefined
  return v >= GOALS.ctr ? '#6EBF8B' : '#F97B6B'
}
function roasColor(v: number | null): string {
  if (v == null) return '#1E2D3D'
  if (v >= 1) return '#6EBF8B'
  if (v >= 0.5) return '#E9A020'
  return '#F97B6B'
}

function RoasTable({ rows, loading, asin, onSave }: RoasTableProps) {
  const days = getLast7Days()
  const rowMap = new Map(rows.map(r => [r.date, r]))

  const tableRows: (RoasRow & { isEmpty: boolean })[] = days.map(date => {
    const r = rowMap.get(date)
    return r ? { ...r, isEmpty: false } : {
      date, isEmpty: true, rank: null, rankChange: null, adSpend: null,
      adSpendAutoFilled: false, clicks: null, cpc: null, ctr: null,
      revenue: null, roas: null, pageReads: null, orders: null,
      newSubs: null, newSubsAutoFilled: false,
    }
  })

  const allEmpty = tableRows.every(r => r.isEmpty)

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th
      className="px-2 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
      style={{ color: '#9CA3AF', background: 'white', top: 0, position: 'sticky' }}
    >
      {children}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg mb-5" style={{ border: '0.5px solid #EEEBE6' }}>
      <table className="w-full" style={{ minWidth: 900 }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid #EEEBE6' }}>
            <TH>DATE</TH>
            <TH>BSR</TH>
            <TH>Δ RANK</TH>
            <TH>AD SPEND</TH>
            <TH>CLICKS</TH>
            <TH>CPC</TH>
            <TH>CTR</TH>
            <TH>REVENUE</TH>
            <TH>ROAS</TH>
            <TH>PAGE READS</TH>
            <TH>ORDERS</TH>
            <TH>NEW SUBS</TH>
          </tr>
          {/* Goals row */}
          <tr style={{ background: GOALS_BG, borderBottom: '0.5px solid #EEEBE6' }}>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>GOALS</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>≤$0.10</td>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>≥15%</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [1,2,3,4,5,6,7].map(i => (
              <tr key={i}>
                {[...Array(12)].map((_, j) => (
                  <td key={j} className="px-2 py-2">
                    <div className="animate-pulse rounded h-4" style={{ background: '#F3F0EB', width: j === 0 ? 56 : 40 }} />
                  </td>
                ))}
              </tr>
            ))
          ) : allEmpty ? (
            <tr>
              <td colSpan={12} className="px-4 py-6 text-center text-[12.5px]"
                style={{ color: '#9CA3AF', border: '1px dashed #D1CBC2' }}>
                No data yet. Log your first rank above.
              </td>
            </tr>
          ) : (
            tableRows.map((row, i) => {
              const bg = i % 2 === 0 ? 'white' : ROW_STRIPE
              return (
                <tr key={row.date} style={{ background: bg, borderBottom: '0.5px solid #F3F0EB' }}>
                  {/* DATE */}
                  <td className="px-2 py-1.5 text-[12px] font-medium whitespace-nowrap"
                    style={{ color: '#1E2D3D' }}>
                    {fmtDate(row.date)}
                  </td>
                  {/* BSR */}
                  <EditableCell
                    field="rank" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.rank} displayValue={row.rank != null ? `#${fmtBsr(row.rank)}` : '—'}
                  />
                  {/* Δ RANK */}
                  <td className="px-2 py-1.5 text-[12px]">
                    {row.rankChange == null ? (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    ) : (
                      <span style={{ color: row.rankChange > 0 ? '#6EBF8B' : '#F97B6B', fontWeight: 600 }}>
                        {row.rankChange > 0 ? '↑' : '↓'} {Math.abs(row.rankChange).toLocaleString()}
                      </span>
                    )}
                  </td>
                  {/* AD SPEND */}
                  <EditableCell
                    field="adSpend" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.adSpend} displayValue={fmtMoney(row.adSpend)}
                    autoFilled={row.adSpendAutoFilled}
                  />
                  {/* CLICKS */}
                  <EditableCell
                    field="clicks" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.clicks} displayValue={fmtInt(row.clicks)}
                  />
                  {/* CPC — computed, read-only */}
                  <td className="px-2 py-1.5 text-[12px]"
                    style={{ color: row.cpc != null ? cpcColor(row.cpc) : '#9CA3AF', fontWeight: row.cpc != null ? 600 : undefined }}>
                    {fmtMoney(row.cpc)}
                  </td>
                  {/* CTR — computed, read-only */}
                  <td className="px-2 py-1.5 text-[12px]"
                    style={{ color: row.ctr != null ? ctrColor(row.ctr) : '#9CA3AF', fontWeight: row.ctr != null ? 600 : undefined }}>
                    {fmtPct(row.ctr)}
                  </td>
                  {/* REVENUE */}
                  <EditableCell
                    field="revenue" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.revenue} displayValue={fmtMoney(row.revenue)}
                  />
                  {/* ROAS — computed, read-only */}
                  <td className="px-2 py-1.5 text-[12px] font-semibold"
                    style={{ color: roasColor(row.roas) }}>
                    {fmtRoas(row.roas)}
                  </td>
                  {/* PAGE READS */}
                  <EditableCell
                    field="pageReads" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.pageReads} displayValue={fmtInt(row.pageReads)}
                  />
                  {/* ORDERS */}
                  <EditableCell
                    field="orders" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.orders} displayValue={fmtInt(row.orders)}
                  />
                  {/* NEW SUBS */}
                  <EditableCell
                    field="newSubs" rowDate={row.date} asin={asin} onSave={onSave}
                    value={row.newSubs} displayValue={fmtInt(row.newSubs)}
                    autoFilled={row.newSubsAutoFilled}
                  />
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Lead Magnet Table ─────────────────────────────────────────────────────────

interface LmTableProps {
  rows: RoasRow[]
  loading: boolean
  onSave: (field: string, date: string, raw: string) => void
}

const LM_GOALS = { cpc: 0.10, ctr: 15, costPerSub: 2.00 }

function costPerSubColor(v: number | null): string {
  if (v == null) return '#1E2D3D'
  if (v < LM_GOALS.costPerSub) return '#6EBF8B'
  if (v <= 5) return '#E9A020'
  return '#F97B6B'
}

function LmTable({ rows, loading, onSave }: LmTableProps) {
  const days = getLast7Days()
  const rowMap = new Map(rows.map(r => [r.date, r]))

  const tableRows = days.map(date => {
    const r = rowMap.get(date)
    return r ? { ...r, isEmpty: false } : {
      date, isEmpty: true, adSpend: null, adSpendAutoFilled: false,
      clicks: null, cpc: null, ctr: null, newSubs: null, newSubsAutoFilled: false,
      costPerSub: null, lpv: null, notes: null,
      rank: null, rankChange: null, revenue: null, roas: null, pageReads: null, orders: null,
    } as RoasRow & { isEmpty: boolean }
  })

  const allEmpty = tableRows.every(r => r.isEmpty)

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th className="px-2 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
      style={{ color: '#9CA3AF', background: 'white', top: 0, position: 'sticky' }}>
      {children}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg mb-5" style={{ border: '0.5px solid #EEEBE6' }}>
      <table className="w-full" style={{ minWidth: 780 }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid #EEEBE6' }}>
            <TH>DATE</TH><TH>AD SPEND</TH><TH>CLICKS</TH><TH>CPC</TH><TH>CTR</TH>
            <TH>NEW SUBS</TH><TH>COST PER SUB</TH><TH>LPV</TH><TH>NOTES</TH>
          </tr>
          {/* Goals row */}
          <tr style={{ background: GOALS_BG, borderBottom: '0.5px solid #EEEBE6' }}>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>GOALS</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>≤$0.10</td>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>≥15%</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px] font-bold" style={{ color: '#1E2D3D' }}>&lt;$2.00</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
            <td className="px-2 py-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>—</td>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [1,2,3,4,5,6,7].map(i => (
              <tr key={i}>
                {[...Array(9)].map((_, j) => (
                  <td key={j} className="px-2 py-2">
                    <div className="animate-pulse rounded h-4" style={{ background: '#F3F0EB', width: j === 0 ? 56 : 40 }} />
                  </td>
                ))}
              </tr>
            ))
          ) : allEmpty ? (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-[12.5px]"
                style={{ color: '#9CA3AF', border: '1px dashed #D1CBC2' }}>
                No data yet. Log your first entry above.
              </td>
            </tr>
          ) : (
            tableRows.map((row, i) => {
              const bg = i % 2 === 0 ? 'white' : ROW_STRIPE
              return (
                <tr key={row.date} style={{ background: bg, borderBottom: '0.5px solid #F3F0EB' }}>
                  <td className="px-2 py-1.5 text-[12px] font-medium whitespace-nowrap" style={{ color: '#1E2D3D' }}>
                    {fmtDate(row.date)}
                  </td>
                  <EditableCell field="adSpend" rowDate={row.date} asin="LM" onSave={onSave}
                    value={row.adSpend} displayValue={fmtMoney(row.adSpend)} autoFilled={row.adSpendAutoFilled} />
                  <EditableCell field="clicks" rowDate={row.date} asin="LM" onSave={onSave}
                    value={row.clicks} displayValue={fmtInt(row.clicks)} />
                  {/* CPC read-only */}
                  <td className="px-2 py-1.5 text-[12px]"
                    style={{ color: row.cpc != null ? cpcColor(row.cpc) : '#9CA3AF', fontWeight: row.cpc != null ? 600 : undefined }}>
                    {fmtMoney(row.cpc)}
                  </td>
                  {/* CTR read-only */}
                  <td className="px-2 py-1.5 text-[12px]"
                    style={{ color: row.ctr != null ? ctrColor(row.ctr) : '#9CA3AF', fontWeight: row.ctr != null ? 600 : undefined }}>
                    {fmtPct(row.ctr)}
                  </td>
                  <EditableCell field="newSubs" rowDate={row.date} asin="LM" onSave={onSave}
                    value={row.newSubs} displayValue={fmtInt(row.newSubs)} autoFilled={row.newSubsAutoFilled} />
                  {/* COST PER SUB read-only */}
                  <td className="px-2 py-1.5 text-[12px] font-semibold"
                    style={{ color: costPerSubColor(row.costPerSub ?? null) }}>
                    {fmtMoney(row.costPerSub)}
                  </td>
                  <EditableCell field="lpv" rowDate={row.date} asin="LM" onSave={onSave}
                    value={row.lpv} displayValue={fmtInt(row.lpv)} />
                  <EditableCell field="notes" rowDate={row.date} asin="LM" onSave={onSave}
                    value={row.notes} displayValue={row.notes ?? '—'} isText maxLen={100}
                    cellStyle={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Correlation Chart (Book tabs) ─────────────────────────────────────────────

interface CorrelationChartProps {
  rows: RoasRow[]
  color: string
}

function CorrelationChart({ rows, color }: CorrelationChartProps) {
  const days = getLast7Days()
  const rowMap = new Map(rows.map(r => [r.date, r]))

  const chartData = days.map(date => {
    const r = rowMap.get(date)
    return {
      date: fmtDate(date),
      bsr: r?.rank ?? null,
      adSpend: r?.adSpend ?? null,
      newSubs: r?.newSubs ?? null,
    }
  })

  const hasBsr = chartData.some(d => d.bsr != null)
  const hasSpend = chartData.some(d => d.adSpend != null)
  const hasSubs = chartData.some(d => d.newSubs != null)

  if (!hasBsr && !hasSpend && !hasSubs) {
    return (
      <div className="flex items-center justify-center py-8 rounded-lg"
        style={{ border: '1px dashed #D1CBC2', color: '#9CA3AF', fontSize: 12 }}>
        No chart data yet — log rank + spend to see correlation.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="left"
          orientation="left"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <YAxis
          yAxisId="bsr"
          orientation="right"
          reversed
          tick={{ fontSize: 11, fill: color }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={v => `#${Number(v).toLocaleString()}`}
          label={{ value: 'BSR ↓ better', angle: 90, position: 'insideRight', fill: '#9CA3AF', fontSize: 10, offset: 10 }}
        />
        <Tooltip
          contentStyle={{ background: 'white', border: '0.5px solid #EEEBE6', borderRadius: 8, fontSize: 12 }}
          formatter={(value: unknown, name: unknown) => {
            const label = String(name)
            if (typeof value !== 'number') return ['—', label]
            if (label === 'BSR') return [`#${value.toLocaleString()}`, label]
            if (label === 'Ad Spend') return [`$${value.toFixed(2)}`, label]
            return [value.toLocaleString(), label]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          yAxisId="bsr" type="monotone" dataKey="bsr" name="BSR"
          stroke={color} dot={{ r: 3, fill: color }} strokeWidth={2}
          strokeDasharray={hasBsr ? undefined : '5 5'}
          connectNulls
        />
        <Line
          yAxisId="left" type="monotone" dataKey="adSpend" name="Ad Spend"
          stroke={LM_COLOR} dot={{ r: 3, fill: LM_COLOR }} strokeWidth={2}
          strokeDasharray={hasSpend ? undefined : '5 5'}
          connectNulls
        />
        <Line
          yAxisId="left" type="monotone" dataKey="newSubs" name="New Subs"
          stroke="#6EBF8B" dot={{ r: 3, fill: '#6EBF8B' }} strokeWidth={2}
          strokeDasharray={hasSubs ? undefined : '5 5'}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── LM Trend Chart ─────────────────────────────────────────────────────────────

function TrendChart({ rows }: { rows: RoasRow[] }) {
  const days = getLast7Days()
  const rowMap = new Map(rows.map(r => [r.date, r]))

  const chartData = days.map(date => {
    const r = rowMap.get(date)
    return {
      date: fmtDate(date),
      adSpend: r?.adSpend ?? null,
      costPerSub: r?.costPerSub ?? null,
    }
  })

  const hasData = chartData.some(d => d.adSpend != null || d.costPerSub != null)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-8 rounded-lg"
        style={{ border: '1px dashed #D1CBC2', color: '#9CA3AF', fontSize: 12 }}>
        No trend data yet — log spend + subscriber data to see trends.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={40} />
        <YAxis
          yAxisId="right" orientation="right" reversed
          tick={{ fontSize: 11, fill: '#F97B6B' }} tickLine={false} axisLine={false} width={48}
          tickFormatter={v => `$${Number(v).toFixed(2)}`}
          label={{ value: 'Cost/Sub ↓ better', angle: 90, position: 'insideRight', fill: '#9CA3AF', fontSize: 10, offset: 10 }}
        />
        <Tooltip
          contentStyle={{ background: 'white', border: '0.5px solid #EEEBE6', borderRadius: 8, fontSize: 12 }}
          formatter={(value: unknown, name: unknown) => {
            const label = String(name)
            if (typeof value !== 'number') return ['—', label]
            return [`$${value.toFixed(2)}`, label]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line yAxisId="left" type="monotone" dataKey="adSpend" name="Ad Spend"
          stroke={LM_COLOR} dot={{ r: 3, fill: LM_COLOR }} strokeWidth={2} connectNulls />
        <Line yAxisId="right" type="monotone" dataKey="costPerSub" name="Cost Per Sub"
          stroke="#F97B6B" dot={{ r: 3, fill: '#F97B6B' }} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Book Tab ──────────────────────────────────────────────────────────────────

function BookTab({ book, onLogSuccess }: { book: BookRecord; onLogSuccess?: () => void }) {
  const [rows, setRows] = useState<RoasRow[]>([])
  const [loading, setLoading] = useState(false)
  const [bsrInput, setBsrInput] = useState('')
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logConfirmed, setLogConfirmed] = useState(false)
  const [logError, setLogError] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!book.asin) return
    setLoading(true)
    try {
      const r = await fetch(`/api/books/bsr/history?asin=${encodeURIComponent(book.asin)}&days=7`)
      const d = await r.json()
      if (Array.isArray(d.rows)) setRows(d.rows)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [book.asin])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function handleLog() {
    if (!book.asin) return
    const rankNum = parseInt(bsrInput)
    if (isNaN(rankNum) || rankNum < 1) return
    setLogLoading(true)
    setLogError(false)
    try {
      const r = await fetch('/api/books/bsr/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: book.asin, bookTitle: book.title, rank: rankNum }),
      })
      const d = await r.json()
      if (d.success) {
        setLogConfirmed(true)
        setTimeout(() => setLogConfirmed(false), 3000)
        setBsrInput('')
        loadHistory()
        onLogSuccess?.()
      } else {
        setLogError(true)
        setTimeout(() => setLogError(false), 4000)
      }
    } catch {
      setLogError(true)
      setTimeout(() => setLogError(false), 4000)
    } finally {
      setLogLoading(false)
    }
  }

  async function handleCellSave(field: string, date: string, raw: string) {
    if (!book.asin) return
    let parsed: number | string | null = parseFloat(raw)
    if (field === 'notes') parsed = raw
    else if (isNaN(parsed as number)) parsed = null

    // Optimistic update
    setRows(prev => prev.map(row => {
      if (row.date !== date) return row
      const updated = { ...row, [field]: parsed }
      // Recompute derived fields
      const cpc = updated.adSpend && updated.clicks && updated.clicks > 0
        ? updated.adSpend / updated.clicks : null
      const roas = updated.revenue && updated.adSpend && updated.adSpend > 0
        ? updated.revenue / updated.adSpend : null
      return { ...updated, cpc, roas }
    }))

    await fetch('/api/books/bsr/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin: book.asin, bookTitle: book.title, date, [field]: parsed }),
    })
    loadHistory()
  }

  return (
    <div>
      {!book.asin ? (
        <div className="rounded-lg p-4 text-[13px] mb-4" style={{ background: '#FFF8F0', border: '0.5px solid #E9A020', color: '#92400e' }}>
          No ASIN for this book.{' '}
          <a href="/dashboard/settings#my-books" className="font-semibold underline" style={{ color: '#E9A020' }}>
            Add it in Settings →
          </a>
        </div>
      ) : (
        <>
          {/* BSR Input Row */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <BsrFetchButton
              asin={book.asin}
              onResult={rank => { setBsrInput(String(rank)); setLastFetchedAt(new Date().toISOString()) }}
              onError={() => {}}
              size="md"
            />
            <input
              type="number" min="1" placeholder="e.g. 45,000"
              value={bsrInput}
              onChange={e => setBsrInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLog()}
              className="rounded-lg px-3 py-2 text-[13px] w-36"
              style={{ border: '0.5px solid #D1CBC2', background: 'white', color: '#1E2D3D', outline: 'none' }}
            />
            <button
              onClick={handleLog}
              disabled={logLoading || !bsrInput}
              className="px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all disabled:opacity-40"
              style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {logLoading ? '…' : 'Log Today →'}
            </button>
            {logConfirmed && (
              <span className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: '#eaf7f1', color: '#0f6b46' }}>
                Rank logged ✓
              </span>
            )}
            {logError && (
              <span className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: '#fff1f0', color: '#b91c1c' }}>
                ⚠ Save failed — try again
              </span>
            )}
            <span className="text-[12px] ml-auto" style={{ color: '#9CA3AF' }}>
              {lastFetchedAt ? `Last fetched: ${timeAgo(lastFetchedAt)}` : 'Last fetched: Never'}
            </span>
          </div>

          {/* 7-day table — hidden via SHOW_DAILY_TABLE flag */}
          {SHOW_DAILY_TABLE && (
            <RoasTable rows={rows} loading={loading} asin={book.asin} onSave={handleCellSave} />
          )}

          {/* Correlation chart */}
          <div className="rounded-lg p-4" style={{ background: 'white', border: '0.5px solid #EEEBE6' }}>
            <div className="text-[13px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>
              7-Day Correlation — BSR · Spend · Subscribers
            </div>
            <CorrelationChart rows={rows} color={book.color} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Lead Magnet Tab ───────────────────────────────────────────────────────────

function LeadMagnetTab() {
  const [rows, setRows] = useState<RoasRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/books/bsr/history?asin=LM&days=7`)
      const d = await r.json()
      if (Array.isArray(d.rows)) setRows(d.rows)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function handleCellSave(field: string, date: string, raw: string) {
    let parsed: number | string | null = field === 'notes' ? raw : parseFloat(raw)
    if (typeof parsed === 'number' && isNaN(parsed)) parsed = null

    setRows(prev => prev.map(row => {
      if (row.date !== date) return row
      const updated = { ...row, [field]: parsed }
      const cpc = updated.adSpend && updated.clicks && updated.clicks > 0
        ? updated.adSpend / updated.clicks : null
      const costPerSub = updated.adSpend && updated.newSubs && updated.newSubs > 0
        ? updated.adSpend / updated.newSubs : null
      return { ...updated, cpc, costPerSub }
    }))

    await fetch('/api/books/bsr/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin: 'LM', date, [field]: parsed }),
    })
    loadHistory()
  }

  // 7-day KPI tiles
  const last7 = rows
  const totalSpend7 = last7.reduce((s, r) => s + (r.adSpend ?? 0), 0)
  const totalSubs7  = last7.reduce((s, r) => s + (r.newSubs ?? 0), 0)
  const costPerSub7 = totalSubs7 > 0 ? totalSpend7 / totalSubs7 : null

  return (
    <div>
      {/* Top metric tiles */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[140px] rounded-lg px-5 py-4" style={{ background: GOALS_BG }}>
          <div className="font-bold leading-none mb-1" style={{ fontSize: 28, color: costPerSubColor(costPerSub7) }}>
            {costPerSub7 != null ? `$${costPerSub7.toFixed(2)}` : '—'}
          </div>
          <div className="text-[12px]" style={{ color: '#9CA3AF' }}>Cost Per Sub (7d)</div>
          <div className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>Goal: &lt;$2.00</div>
        </div>
        <div className="flex-1 min-w-[140px] rounded-lg px-5 py-4" style={{ background: GOALS_BG }}>
          <div className="font-semibold leading-none mb-1" style={{ fontSize: 28, color: '#1E2D3D' }}>
            {totalSpend7 > 0 ? `$${totalSpend7.toFixed(2)}` : '—'}
          </div>
          <div className="text-[12px]" style={{ color: '#9CA3AF' }}>Total Spend (7d)</div>
        </div>
        <div className="flex-1 min-w-[140px] rounded-lg px-5 py-4" style={{ background: GOALS_BG }}>
          <div className="font-semibold leading-none mb-1" style={{ fontSize: 28, color: '#1E2D3D' }}>
            {totalSubs7 > 0 ? totalSubs7.toLocaleString() : '—'}
          </div>
          <div className="text-[12px]" style={{ color: '#9CA3AF' }}>New Subs (7d)</div>
        </div>
      </div>

      {/* 7-day table — hidden via SHOW_DAILY_TABLE flag */}
      {SHOW_DAILY_TABLE && (
        <LmTable rows={rows} loading={loading} onSave={handleCellSave} />
      )}

      {/* Trend chart */}
      <div className="rounded-lg p-4" style={{ background: 'white', border: '0.5px solid #EEEBE6' }}>
        <div className="text-[13px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>
          7-Day Trend — Spend · Cost Per Sub
        </div>
        <TrendChart rows={rows} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabId = 0 | 1 | 2 | 3

export default function RoasHubPage() {
  const { books, loading } = useBooks()
  const [activeTab, setActiveTab] = useState<TabId>(0)
  const [exporting, setExporting] = useState(false)
  const [summaryKey, setSummaryKey] = useState(0)

  const refreshSummary = () => setSummaryKey(k => k + 1)

  async function handleExport() {
    setExporting(true)
    try {
      const { exportRoasHub } = await import('./export-xlsx')
      await exportRoasHub()
    } catch (e) {
      console.error('ROAS Hub export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  // First 3 non-LM books
  const bookTabs = books.slice(0, 3)

  const TAB_CONFIG: { label: string; color: string }[] = [
    ...bookTabs.map((b, i) => ({
      label: `B${i + 1} · ${b.title}`,
      color: BOOK_COLORS[i] ?? '#9CA3AF',
    })),
    { label: 'Lead Magnet', color: LM_COLOR },
  ]
  // Ensure we always have 4 tabs (pad with empty book slots if fewer books)
  while (TAB_CONFIG.length < 4) {
    const idx = TAB_CONFIG.length
    TAB_CONFIG.splice(idx - 1, 0, { label: `B${idx} · (no book)`, color: '#D1CBC2' })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 pb-8 max-w-[1240px]">
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse rounded-lg h-16" style={{ background: '#F3F0EB' }} />
          ))}
        </div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="p-4 sm:p-8 pb-8 max-w-[1240px]">
        <div className="mb-6">
          <h1 className="font-sans text-[24px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
            ROAS Hub
          </h1>
          <p className="text-[13px]" style={{ color: '#9CA3AF' }}>
            Is your spend working? Track rank, revenue, and cost per result — every day.
          </p>
        </div>
        <NoBooksEmptyState />
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
    <div className="p-4 sm:p-8 pb-8 max-w-[1240px]">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-sans text-[24px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
            ROAS Hub
          </h1>
          <p className="text-[13px]" style={{ color: '#9CA3AF' }}>
            Is your spend working? Track rank, revenue, and cost per result — every day.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-3 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50 whitespace-nowrap"
          style={{
            background: 'white',
            border: '1px solid #E9A020',
            color: '#E9A020',
            cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? 'Exporting…' : 'Export →'}
        </button>
      </div>

      {/* ── Summary Strip ── */}
      <SummaryStrip refreshKey={summaryKey} />

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#EEEBE6' }}>
        {TAB_CONFIG.map((tab, i) => {
          const isActive = activeTab === i
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i as TabId)}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all"
              style={{
                color: isActive ? '#1E2D3D' : '#9CA3AF',
                fontWeight: isActive ? 700 : 400,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #1E2D3D' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                outline: 'none',
                paddingBottom: 10,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: tab.color }}
              />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      {activeTab < 3 && bookTabs[activeTab] ? (
        <BookTab key={bookTabs[activeTab].id} book={bookTabs[activeTab]} onLogSuccess={refreshSummary} />
      ) : activeTab < 3 && !bookTabs[activeTab] ? (
        <div className="rounded-lg p-6 text-center text-[13px]"
          style={{ border: '1px dashed #D1CBC2', color: '#9CA3AF' }}>
          No book in this slot yet.{' '}
          <a href="/dashboard/settings#my-books" className="font-semibold underline" style={{ color: '#E9A020' }}>
            Add books in Settings →
          </a>
        </div>
      ) : (
        <LeadMagnetTab />
      )}
    </div>
    </DashboardErrorBoundary>
  )
}
