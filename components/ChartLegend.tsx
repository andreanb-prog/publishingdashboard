'use client'
// components/ChartLegend.tsx — Reusable chart legend, always below the canvas

export interface LegendItem {
  color: string
  label: string
  /** 'square' = filled 10×10 box · 'line' = 16px wide, 2px tall */
  type: 'square' | 'line'
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px]" style={{ color: '#6B7280' }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {item.type === 'square' ? (
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: item.color,
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 2,
                background: item.color,
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  )
}
