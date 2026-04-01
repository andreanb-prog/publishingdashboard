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
        background: '#F5F5F4',
        border: '1px solid #F0E0C8',
      }}
    >
      <span
        className="text-[10.5px] font-bold uppercase tracking-[1.2px]"
        style={{ color: '#6B7280' }}
      >
        Viewing
      </span>
      <span style={{ color: '#D6D3D1' }}>·</span>
      <span
        className="text-[12.5px] font-mono font-semibold"
        style={{ color: '#1E2D3D' }}
      >
        {start} – {end}
      </span>
      {days != null && (
        <>
          <span style={{ color: '#D6D3D1' }}>·</span>
          <span className="text-[12px]" style={{ color: '#6B7280' }}>
            {days} days
          </span>
        </>
      )}
      {summary && (
        <>
          <span style={{ color: '#D6D3D1' }}>·</span>
          <span className="text-[12px]" style={{ color: '#6B7280' }}>
            {summary}
          </span>
        </>
      )}
    </div>
  )
}
