'use client'
// app/(dashboard)/rank/page.tsx
import { useEffect, useState } from 'react'

const BOOKS = [
  { key: 'MOLR', title: 'My Off-Limits Roommate', asin: 'B0GSC2RTF8', launched: 'Mar 19, 2026', currentRank: 47907, movement: 1843 },
  { key: 'FDMBP', title: 'Fake Dating My Billionaire Protector', asin: 'B0GQD4J6VT', launched: 'Mar 4, 2026', currentRank: 276953, movement: 34437 },
]

function getRankColor(rank: number) {
  if (rank < 50000) return '#34d399'
  if (rank < 200000) return '#fbbf24'
  return '#fb7185'
}

function getRankLabel(rank: number) {
  if (rank < 50000) return '🟢 Strong momentum'
  if (rank < 200000) return '🟡 Steady — keep promoting'
  return '🔴 Run a promo'
}

export default function RankPage() {
  const [logs, setLogs] = useState<Record<string, any[]>>({ MOLR: [], FDMBP: [] })
  const [inputs, setInputs] = useState<Record<string, string>>({ MOLR: '', FDMBP: '' })
  const [saving, setSaving] = useState<Record<string, boolean>>({ MOLR: false, FDMBP: false })
  const [feedback, setFeedback] = useState<Record<string, string>>({ MOLR: '', FDMBP: '' })

  useEffect(() => {
    BOOKS.forEach(async book => {
      const res = await fetch(`/api/rank?book=${book.key}`)
      const data = await res.json()
      if (data.logs) {
        setLogs(prev => ({ ...prev, [book.key]: data.logs }))
      }
    })
  }, [])

  async function handleLog(book: typeof BOOKS[0]) {
    const rank = parseInt(inputs[book.key])
    if (!rank || rank < 1) return

    setSaving(s => ({ ...s, [book.key]: true }))
    try {
      const res = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: book.key, asin: book.asin, rank }),
      })
      const json = await res.json()
      if (json.success) {
        setLogs(prev => ({ ...prev, [book.key]: [json.log, ...prev[book.key]] }))
        setInputs(i => ({ ...i, [book.key]: '' }))
        const prevRank = logs[book.key][0]?.rank || book.currentRank
        const movement = prevRank - rank
        setFeedback(f => ({
          ...f,
          [book.key]: movement > 0
            ? `↑ Up ${movement.toLocaleString()} spots — great! ${getRankLabel(rank)}`
            : movement < 0
              ? `↓ Down ${Math.abs(movement).toLocaleString()} spots. Run a promo to push it back up.`
              : `Rank unchanged at #${rank.toLocaleString()}`,
        }))
        setTimeout(() => setFeedback(f => ({ ...f, [book.key]: '' })), 4000)
      }
    } finally {
      setSaving(s => ({ ...s, [book.key]: false }))
    }
  }

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="font-serif text-[22px] text-navy-DEFAULT mb-1">Sales Rank Tracker</h1>
        <p className="text-[12.5px] text-stone-400">
          Log your rank every morning — takes 10 seconds. Over 30 days you'll see exactly which promo days moved the needle.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {BOOKS.map(book => {
          const bookLogs = logs[book.key] || []
          const latestRank = bookLogs[0]?.rank || book.currentRank
          const prevRank = bookLogs[1]?.rank || book.currentRank + book.movement
          const diff = prevRank - latestRank
          const rankColor = getRankColor(latestRank)

          return (
            <div key={book.key} className="card p-6">
              <div className="text-[13px] font-bold text-navy-DEFAULT mb-0.5">{book.title}</div>
              <div className="text-[10.5px] text-stone-400 mb-4">{book.asin} · Launched {book.launched}</div>

              <div className="font-serif mb-1" style={{ fontSize: '42px', color: '#0d1f35', letterSpacing: '-2px', lineHeight: 1 }}>
                #{latestRank.toLocaleString()}
              </div>
              <div className="text-[12.5px] font-semibold mb-4"
                style={{ color: diff >= 0 ? '#1a9e68' : '#c73c3c' }}>
                {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toLocaleString()} spots since last log
              </div>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full mb-4"
                style={{ background: `${rankColor}15`, color: rankColor }}>
                {getRankLabel(latestRank)}
              </span>

              {/* Log form */}
              <div className="border-t border-stone-100 pt-4">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-400 mb-2">
                  Log today's rank
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={`e.g. ${(latestRank * 0.95).toFixed(0)}`}
                    value={inputs[book.key]}
                    onChange={e => setInputs(i => ({ ...i, [book.key]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLog(book)}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => handleLog(book)}
                    disabled={saving[book.key] || !inputs[book.key]}
                    className="px-4 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: '#0d1f35', border: 'none', cursor: 'pointer' }}
                  >
                    {saving[book.key] ? '...' : 'Log It'}
                  </button>
                </div>
                {feedback[book.key] && (
                  <div className="mt-2 text-[12px] font-semibold px-3 py-2 rounded-lg"
                    style={{ background: '#eaf7f1', color: '#0f6b46' }}>
                    {feedback[book.key]}
                  </div>
                )}
              </div>

              {/* Mini history */}
              {bookLogs.length > 0 && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <div className="text-[10px] uppercase tracking-[0.8px] text-stone-400 mb-2 font-bold">Recent logs</div>
                  <div className="space-y-1">
                    {bookLogs.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-center justify-between text-[11.5px]">
                        <span className="text-stone-400">{new Date(log.date).toLocaleDateString()}</span>
                        <span className="font-mono font-semibold" style={{ color: getRankColor(log.rank) }}>
                          #{log.rank.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* How to read your rank */}
      <div className="card p-5">
        <div className="text-[13px] font-bold text-navy-DEFAULT mb-3">How to read your rank</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '🟢 Top 50,000', bg: '#eaf7f1', text: '#0f6b46', body: 'Strong sales momentum. Your promos are working. Keep the swap calendar full.' },
            { label: '🟡 50K – 200K', bg: '#fdf5e3', text: '#7a4f00', body: 'Steady sales. Good for a newer title. Schedule a promo week to push higher.' },
            { label: '🔴 200K+', bg: '#fdf0f0', text: '#8c2020', body: 'Slow sales right now. Run a newsletter swap or paid promo to boost visibility.' },
          ].map(b => (
            <div key={b.label} className="rounded-lg p-3" style={{ background: b.bg }}>
              <div className="text-[12px] font-bold mb-1" style={{ color: b.text }}>{b.label}</div>
              <div className="text-[11.5px]" style={{ color: b.text }}>{b.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
