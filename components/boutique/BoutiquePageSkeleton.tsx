export function BoutiquePageSkeleton({ cols = 4, rows = 2 }: { cols?: 3 | 4 | 5; rows?: number }) {
  const colsMap = { 3: 3, 4: 4, 5: 5 }[cols]
  return (
    <div style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${colsMap}, 1fr)`,
        gap: 14,
        marginBottom: 28,
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ background: '#EEEBE6', height: 96 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ background: '#EEEBE6', height: i === 0 ? 200 : 120 }} />
        ))}
      </div>
    </div>
  )
}
