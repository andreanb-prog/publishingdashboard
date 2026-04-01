// components/ViewingBar.tsx

export function ViewingBar({
  start,
  end,
  days,
  summary,
}: {
  start: string
  end: string
  days?: number
  summary?: string
}) {
  return (
    <div
      className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span
        className="text-[10.5px] font-bold uppercase tracking-[1.2px]"
        style={{ color: '#57534e' }}
      >
        Viewing
      </span>
      <span style={{ color: '#3c3836' }}>·</span>
      <span
        className="text-[12.5px] font-mono font-semibold"
        style={{ color: '#d6d3d1' }}
      >
        {start} – {end}
      </span>
      {days != null && (
        <>
          <span style={{ color: '#3c3836' }}>·</span>
          <span className="text-[12px]" style={{ color: '#78716c' }}>
            {days} days
          </span>
        </>
      )}
      {summary && (
        <>
          <span style={{ color: '#3c3836' }}>·</span>
          <span className="text-[12px]" style={{ color: '#78716c' }}>
            {summary}
          </span>
        </>
      )}
    </div>
  )
}
