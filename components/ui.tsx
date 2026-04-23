// components/ui.tsx — shared UI components
'use client'

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
      <div className={`font-sans text-3xl tracking-tight leading-none mb-1.5 ${colorMap[color]}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-stone-500">{sub}</div>}
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
