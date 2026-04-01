// components/ui.tsx — shared UI components
'use client'
import { getCoachTitle } from '@/lib/coachTitle'

interface TrafficLightProps {
  status: 'GREEN' | 'AMBER' | 'RED' | 'NEW'
  label?: string
}

export function TrafficLight({ status, label }: TrafficLightProps) {
  const config = {
    GREEN: { bg: '', text: '', dot: '', style: { background: 'rgba(91,191,181,0.12)', color: '#3a9e93' }, dotColor: '#5BBFB5', defaultLabel: '🟢 Growing' },
    AMBER: { bg: '', text: '', dot: '', style: { background: 'rgba(233,160,32,0.12)', color: '#92600a' }, dotColor: '#E9A020', defaultLabel: '🟡 Watch' },
    RED:   { bg: '', text: '', dot: '', style: { background: 'rgba(249,123,107,0.12)', color: '#b94034' }, dotColor: '#F97B6B', defaultLabel: '🔴 Fix this' },
    NEW:   { bg: '', text: '', dot: '', style: { background: 'rgba(139,92,246,0.12)', color: '#6d3fd4' }, dotColor: '#8B5CF6', defaultLabel: '🔵 Getting started' },
  }
  const c = config[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full"
      style={c.style}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dotColor }} />
      {label || c.defaultLabel}
    </span>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue'
  delay?: number
}

export function MetricCard({ label, value, sub, color = 'default', delay = 0 }: MetricCardProps) {
  const colorMap = {
    default: 'text-[#0d1f35]',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  }
  return (
    <div className={`card p-5 animate-fade-up animate-fade-up-delay-${delay}`}>
      <div className="metric-label mb-2">{label}</div>
      <div className={`font-serif text-3xl tracking-tight leading-none mb-1.5 ${colorMap[color]}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-stone-500">{sub}</div>}
    </div>
  )
}

interface CoachBoxProps {
  title?: string
  children: React.ReactNode
  color?: 'amber' | 'green' | 'red' | 'blue'
  dark?: boolean
}

export function CoachBox({ title, children, color = 'amber', dark = false }: CoachBoxProps) {
  const resolvedTitle = title ?? getCoachTitle()
  if (dark) {
    const borderColor = { amber: '#fbbf24', green: '#34d399', red: '#fb7185', blue: '#38bdf8' }[color]
    return (
      <div
        className="rounded-xl p-5 mb-5"
        style={{
          background: '#FFF8F0',
          border: `1px solid #EEEBE6`,
          borderLeft: `3px solid ${borderColor}`,
        }}
      >
        <div className="text-[10.5px] font-bold tracking-[1px] uppercase mb-2"
          style={{ color: borderColor }}>
          {resolvedTitle}
        </div>
        <div className="text-[13px] leading-[1.75]" style={{ color: '#374151' }}>
          {children}
        </div>
      </div>
    )
  }
  return (
    <div className={`card p-5 mb-5 border-l-[3px] ${
      color === 'amber' ? 'border-l-amber-brand' :
      color === 'green' ? 'border-l-emerald-500' :
      color === 'red' ? 'border-l-red-500' : 'border-l-blue-500'
    }`}>
      <div className={`text-[10.5px] font-bold tracking-[1px] uppercase mb-2 ${
        color === 'amber' ? 'text-amber-700' :
        color === 'green' ? 'text-emerald-700' :
        color === 'red' ? 'text-red-700' : 'text-blue-700'
      }`}>{resolvedTitle}</div>
      <div className="text-[13px] text-stone-600 leading-[1.75]">{children}</div>
    </div>
  )
}

interface ActionItemProps {
  priority: number
  type: 'RED' | 'AMBER' | 'GREEN'
  title: string
  body: string
  action?: string
  onAction?: () => void
}

export function ActionItem({ priority, type, title, body, action, onAction }: ActionItemProps) {
  const numColors = {
    RED: 'bg-red-50 text-red-600',
    AMBER: 'bg-amber-50 text-amber-700',
    GREEN: 'bg-emerald-50 text-emerald-700',
  }
  const labelColors = {
    RED: 'bg-red-50 text-red-600',
    AMBER: 'bg-amber-50 text-amber-700',
    GREEN: 'bg-emerald-50 text-emerald-700',
  }
  const labelText = { RED: '🔴 Do this today', AMBER: '🟡 This week', GREEN: '🟢 Keep doing this' }

  return (
    <div className="flex items-start gap-3.5 py-4 px-5 border-b border-stone-100 last:border-0 hover:bg-cream transition-colors">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${numColors[type]}`}>
        {priority}
      </div>
      <div className="flex-1">
        <div className={`inline-flex text-[10px] font-bold tracking-[0.8px] uppercase px-2 py-0.5 rounded-full mb-1.5 ${labelColors[type]}`}>
          {labelText[type]}
        </div>
        <div className="text-[14px] font-bold text-[#0d1f35] mb-1">{title}</div>
        <div className="text-[12.5px] text-stone-500 leading-[1.65]">{body}</div>
        {action && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-[11.5px] font-bold text-amber-brand bg-none border-0 p-0 cursor-pointer hover:text-[#0d1f35] transition-colors"
          >
            {action} →
          </button>
        )}
      </div>
    </div>
  )
}

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

export function Sparkline({ data, color = '#fb7185', height = 56 }: SparklineProps) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm min-w-[3px] opacity-75 hover:opacity-100 transition-opacity"
          style={{
            height: `${Math.max((val / max) * 100, 3)}%`,
            background: color,
          }}
          title={String(val)}
        />
      ))}
    </div>
  )
}

interface BarChartProps {
  items: { label: string; value: number; formatted?: string }[]
  color?: string
  maxWidth?: number
}

export function BarChart({ items, color = '#fb7185', maxWidth }: BarChartProps) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="w-32 text-[11px] text-right truncate flex-shrink-0"
            style={{ color: '#a8a29e' }}>
            {item.label}
          </div>
          <div className="flex-1 h-5 rounded bg-dk-surface2 overflow-hidden">
            <div
              className="h-full rounded flex items-center pl-2 text-[10px] font-mono text-white/90"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${color}60, ${color})`,
                minWidth: item.value > 0 ? '2rem' : '0',
              }}
            >
              {item.formatted || item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
