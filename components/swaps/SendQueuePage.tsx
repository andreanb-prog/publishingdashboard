'use client'

// The Swaps page, rebuilt around the send queue. Direction semantics everywhere:
// amber = your sends, sage = partners promoting your books, coral = catch-up only.
// Role mapping: 'outbound-send' = send queue · 'inbound' + future date + approved =
// Promoting Your Books · 'inbound'/'outbound' + confirmation 'applied' = Requests.
// The BookClicker sync is the sole writer — there is no Add Swap here.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, CalendarDays } from 'lucide-react'
import type { SerializedSwap } from '@/lib/swaps'

const NAVY  = '#1E2D3D'
const AMBER = '#E9A020'
const SAGE  = '#6EBF8B'
const CORAL = '#F97B6B'
const SERIF = "var(--font-playfair), 'Playfair Display', Georgia, serif"

const card: React.CSSProperties = {
  background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
}

// ─── Date helpers (all on 'YYYY-MM-DD' strings, local time) ──────────────────

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function dstr(iso: string) {
  return iso.split('T')[0]
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function weekday(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}
function monthAbbr(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}
function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDate()
}
function relativeTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// BookClicker send bookings often carry a placeholder instead of the real title
// ("July Launch", "TBD", a bare month). Heuristic: no title, an obviously generic
// word, or a short month-led phrase. Real titles can contain "May"/"June" as a
// name, so the month test only fires on short (≤3 word) titles.
function isPlaceholderTitle(t: string | null | undefined): boolean {
  if (!t || !t.trim()) return true
  const s = t.trim()
  if (/\b(tbd|untitled|title pending|coming soon)\b/i.test(s)) return true
  const short = s.split(/\s+/).length <= 3
  if (short && /\b(launch|promo|newsletter|swap)\b/i.test(s)) return true
  if (short && /^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(s)) return true
  return false
}

function fmtListSize(n: number | null): string {
  if (!n) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K subs` : `${n} subs`
}

// ─── Small shared pieces ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
      letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px',
    }}>
      {children}
    </p>
  )
}

function TypeChip({ type }: { type: string | null }) {
  if (!type) return null
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.55)',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {type}
    </span>
  )
}

function ListChip({ name }: { name: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: 'rgba(233,160,32,0.1)', color: '#B57812',
      whiteSpace: 'nowrap', flexShrink: 0,
      fontFamily: 'var(--font-jetbrains-mono), monospace',
    }}>
      {name}
    </span>
  )
}

function Dot({ color }: { color: string }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

// ─── Manifest row (one outbound-send obligation) ─────────────────────────────

function ManifestRow({ swap, multiList, onToggle, showDate }: {
  swap: SerializedSwap
  multiList: boolean
  onToggle: (swap: SerializedSwap) => void
  showDate?: boolean
}) {
  const [showNotes, setShowNotes] = useState(false)
  const done = swap.confirmation === 'complete'
  const placeholder = isPlaceholderTitle(swap.bookTitle)
  const hasContext = Boolean(swap.notes || swap.launchWindow || swap.partnerListSize)

  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Mark-sent checkbox */}
        <button
          onClick={() => onToggle(swap)}
          aria-label={done ? 'Marked sent' : 'Mark sent'}
          style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
            border: done ? `1.5px solid ${AMBER}` : '1.5px solid rgba(30,45,61,0.25)',
            background: done ? AMBER : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          {done && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <span style={{
          fontSize: 14, fontWeight: 700, color: NAVY, flexShrink: 0,
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.5 : 1,
        }}>
          {swap.partnerName}
        </span>

        <span style={{
          fontSize: 13, fontStyle: 'italic', fontFamily: SERIF,
          color: 'rgba(30,45,61,0.5)', minWidth: 48, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          opacity: done ? 0.5 : 1,
        }}>
          {placeholder
            ? `Title pending — ${swap.bookTitle || 'no title yet'}`
            : swap.bookTitle}
        </span>

        {showDate && (
          <span style={{ fontSize: 11, color: 'rgba(30,45,61,0.45)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fmtShort(dstr(swap.promoDate))}
          </span>
        )}
        <TypeChip type={swap.promoFormat} />
        {multiList && <ListChip name={swap.myList} />}
        {hasContext && (
          <button
            onClick={() => setShowNotes(v => !v)}
            style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(30,45,61,0.45)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            Notes
            <ChevronDown size={12} strokeWidth={2}
              style={{ transform: showNotes ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        )}
      </div>

      {showNotes && (
        <div style={{
          marginTop: 8, marginLeft: 28, padding: '10px 12px',
          background: '#FFF8F0', borderRadius: 8, fontSize: 12,
          color: 'rgba(30,45,61,0.65)', lineHeight: 1.5,
        }}>
          {swap.launchWindow && (
            <p style={{ margin: 0 }}>
              Their list: {swap.launchWindow}
              {swap.partnerListSize ? ` · ${fmtListSize(swap.partnerListSize)}` : ''}
            </p>
          )}
          {swap.notes && <p style={{ margin: swap.launchWindow ? '6px 0 0' : 0 }}>{swap.notes}</p>}
        </div>
      )}
    </div>
  )
}

// Rows for one send date. When the user has more than one list AND this date
// spans lists, sub-group by list; otherwise render flat (Grandma Jo rule —
// complexity appears only for users who have it).
function ManifestList({ rows, multiList, onToggle }: {
  rows: SerializedSwap[]
  multiList: boolean
  onToggle: (swap: SerializedSwap) => void
}) {
  const lists = Array.from(new Set(rows.map(r => r.myList)))
  const grouped = multiList && lists.length > 1

  if (!grouped) {
    return (
      <div>
        {rows.map((s, i) => (
          <div key={s.id} style={{ borderTop: i > 0 ? '0.5px solid rgba(30,45,61,0.06)' : 'none' }}>
            <ManifestRow swap={s} multiList={multiList} onToggle={onToggle} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {lists.map(list => (
        <div key={list} style={{ marginBottom: 4 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
            letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 2px',
          }}>
            {list}
          </p>
          {rows.filter(r => r.myList === list).map((s, i) => (
            <div key={s.id} style={{ borderTop: i > 0 ? '0.5px solid rgba(30,45,61,0.06)' : 'none' }}>
              <ManifestRow swap={s} multiList={multiList} onToggle={onToggle} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Hero: Up Next manifest card ──────────────────────────────────────────────

function fmtManifestMeta(rows: SerializedSwap[]): string {
  const open = rows.filter(r => r.confirmation !== 'complete')
  const counts: Record<string, number> = {}
  for (const r of open) {
    const k = (r.promoFormat ?? 'send').toLowerCase()
    counts[k] = (counts[k] ?? 0) + 1
  }
  const parts = ['feature', 'mention', 'solo', 'send']
    .filter(k => counts[k])
    .map(k => `${counts[k]} ${k}${counts[k] > 1 ? 's' : ''}`)
  const n = open.length
  return `${n} book${n === 1 ? '' : 's'} to send${parts.length ? ` · ${parts.join(', ')}` : ''}`
}

function UpNextHero({ dateStr, rows, multiList, onToggle }: {
  dateStr: string
  rows: SerializedSwap[]
  multiList: boolean
  onToggle: (swap: SerializedSwap) => void
}) {
  return (
    <section style={{ ...card, padding: '20px 22px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        {/* Navy datestamp block */}
        <div style={{
          width: 60, borderRadius: 10, background: NAVY, color: 'white',
          textAlign: 'center', padding: '9px 0 11px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.7 }}>
            {monthAbbr(dateStr)}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
            {dayNum(dateStr)}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{
            fontFamily: SERIF, fontSize: 21, fontWeight: 600, color: NAVY, margin: '0 0 3px',
          }}>
            Up Next — {weekday(dateStr)}&rsquo;s sends
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.5)', margin: 0 }}>
            {fmtManifestMeta(rows)}
          </p>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid rgba(30,45,61,0.08)', paddingTop: 4 }}>
        <ManifestList rows={rows} multiList={multiList} onToggle={onToggle} />
      </div>
    </section>
  )
}

// ─── Coming Up: collapsible day groups ────────────────────────────────────────

function DayGroup({ dateStr, rows, multiList, onToggle }: {
  dateStr: string
  rows: SerializedSwap[]
  multiList: boolean
  onToggle: (swap: SerializedSwap) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const preview = rows.map(r => r.partnerName).join(', ')

  return (
    <div style={{ ...card, marginBottom: 10 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 16px', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        {/* Mini datestamp */}
        <div style={{
          width: 40, borderRadius: 8, background: '#FFF8F0',
          border: '0.5px solid rgba(30,45,61,0.1)',
          textAlign: 'center', padding: '4px 0 6px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(30,45,61,0.5)' }}>
            {monthAbbr(dateStr)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.1 }}>
            {dayNum(dateStr)}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 2px' }}>
            {weekday(dateStr)}, {fmtShort(dateStr)}
          </p>
          <p style={{
            fontSize: 12, color: 'rgba(30,45,61,0.45)', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {preview}
          </p>
        </div>

        <span style={{ fontSize: 12, color: 'rgba(30,45,61,0.45)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {rows.length} send{rows.length === 1 ? '' : 's'}
        </span>
        {expanded
          ? <ChevronDown size={15} strokeWidth={2} color="#9CA3AF" style={{ flexShrink: 0 }} />
          : <ChevronRight size={15} strokeWidth={2} color="#9CA3AF" style={{ flexShrink: 0 }} />
        }
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 8px 16px', borderTop: '0.5px solid rgba(30,45,61,0.08)' }}>
          <ManifestList rows={rows} multiList={multiList} onToggle={onToggle} />
        </div>
      )}
    </div>
  )
}

// ─── Right rail panels ────────────────────────────────────────────────────────

function PromotingPanel({ rows }: { rows: SerializedSwap[] }) {
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <SectionLabel>Promoting Your Books</SectionLabel>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0' }}>
          No incoming promos on the calendar yet.
        </p>
      ) : (
        rows.map((s, i) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
            borderTop: i > 0 ? '0.5px solid rgba(30,45,61,0.06)' : 'none',
          }}>
            <div style={{ paddingTop: 5 }}><Dot color={SAGE} /></div>
            <p style={{ fontSize: 12.5, color: 'rgba(30,45,61,0.7)', margin: 0, lineHeight: 1.45, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: NAVY }}>{s.partnerName}</span>
              {' sends '}
              <span style={{ fontStyle: 'italic', fontFamily: SERIF }}>{s.bookTitle}</span>
              {' · '}{fmtShort(dstr(s.promoDate))}
            </p>
          </div>
        ))
      )}
    </div>
  )
}

function RequestsPanel({ rows, onDecide }: {
  rows: SerializedSwap[]
  onDecide: (swap: SerializedSwap, accept: boolean) => void
}) {
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <SectionLabel>Requests</SectionLabel>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0' }}>
          No open requests.
        </p>
      ) : (
        rows.map((s, i) => (
          <div key={s.id} style={{
            padding: '8px 0',
            borderTop: i > 0 ? '0.5px solid rgba(30,45,61,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div style={{ paddingTop: 5 }}><Dot color={AMBER} /></div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, margin: 0 }}>
                  {s.partnerName}
                  <span style={{ fontWeight: 400, color: 'rgba(30,45,61,0.45)' }}>
                    {' · '}{fmtShort(dstr(s.promoDate))}
                  </span>
                </p>
                {s.bookTitle && (
                  <p style={{
                    fontSize: 11.5, color: 'rgba(30,45,61,0.5)', margin: '2px 0 0',
                    fontStyle: 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.bookTitle}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 15 }}>
              <button
                onClick={() => onDecide(s, true)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                  background: 'rgba(110,191,139,0.15)', color: '#3D8A5C',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => onDecide(s, false)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99,
                  background: 'none', color: '#9CA3AF',
                  border: '1px solid #E5E7EB', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function CatchUpPanel({ rows, multiList, onToggle }: {
  rows: SerializedSwap[]
  multiList: boolean
  onToggle: (swap: SerializedSwap) => void
}) {
  return (
    <div style={{ ...card, borderLeft: `3px solid ${CORAL}`, padding: '16px 18px' }}>
      <SectionLabel>To Catch Up On</SectionLabel>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0', lineHeight: 1.5 }}>
          Nothing to catch up on — every send is out the door. Nice work.
        </p>
      ) : (
        rows.map((s, i) => (
          <div key={s.id} style={{ borderTop: i > 0 ? '0.5px solid rgba(30,45,61,0.06)' : 'none' }}>
            <ManifestRow swap={s} multiList={multiList} onToggle={onToggle} showDate />
          </div>
        ))
      )}
    </div>
  )
}

// ─── Stat strip ───────────────────────────────────────────────────────────────

function StatStrip({ stats }: {
  stats: Array<{ label: string; value: string; sub?: string; accent?: string }>
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
      {stats.map(stat => (
        <div key={stat.label} style={{
          ...card,
          borderLeft: stat.accent ? `3px solid ${stat.accent}` : card.border as string,
          padding: '14px 16px',
        }}>
          <p style={{
            fontSize: 10.5, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
            letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 6px',
          }}>
            {stat.label}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: NAVY, lineHeight: 1 }}>
              {stat.value}
            </span>
            {stat.sub && (
              <span style={{ fontSize: 11, color: 'rgba(30,45,61,0.45)', whiteSpace: 'nowrap' }}>
                {stat.sub}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function ConnectEmptyState() {
  return (
    <div style={{ ...card, padding: '56px 24px', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        border: '2px dashed rgba(30,45,61,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <CalendarDays size={32} strokeWidth={1.5} color="rgba(30,45,61,0.3)" />
      </div>
      <p style={{ fontSize: 17, fontWeight: 600, color: NAVY, margin: '0 0 6px', fontFamily: SERIF }}>
        Connect BookClicker → your calendar fills itself
      </p>
      <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 auto 18px', maxWidth: 380, lineHeight: 1.5 }}>
        Once BookClicker is connected, every send you owe, every promo of your books,
        and every open request lands here automatically.
      </p>
      <Link href="/dashboard/settings" style={{
        fontSize: 13, fontWeight: 700, color: AMBER, textDecoration: 'underline',
      }}>
        Go to Settings → Connections
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SendQueuePage({ swaps: initialSwaps, lastSyncAt }: {
  swaps: SerializedSwap[]
  lastSyncAt: string | null
}) {
  const router = useRouter()
  const [swaps, setSwaps] = useState<SerializedSwap[]>(initialSwaps)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')

  const today = todayDateStr()

  async function patchConfirmation(swap: SerializedSwap, status: string) {
    const prev = swaps
    // Optimistic — the PATCH maps component status → confirmation server-side.
    const optimistic: Record<string, string> = { complete: 'complete', confirmed: 'approved', cancelled: 'cancelled' }
    setSwaps(p => p.map(s => s.id === swap.id ? { ...s, confirmation: optimistic[status] ?? s.confirmation } : s))
    try {
      const res = await fetch(`/api/swaps/${swap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!data.success) setSwaps(prev)
      else setSwaps(p => p.map(s => s.id === swap.id ? { ...s, confirmation: data.swap.confirmation } : s))
    } catch {
      setSwaps(prev)
    }
  }

  function toggleSent(swap: SerializedSwap) {
    // Unchecking a just-marked send is forgiving: it goes back to approved.
    patchConfirmation(swap, swap.confirmation === 'complete' ? 'confirmed' : 'complete')
  }

  function decideRequest(swap: SerializedSwap, accept: boolean) {
    patchConfirmation(swap, accept ? 'confirmed' : 'cancelled')
  }

  async function syncNow() {
    setSyncing(true)
    setSyncError('')
    try {
      const res = await fetch('/api/browserbase/bookclicker-sync-now', { method: 'POST' })
      const data = await res.json()
      if (data.success) router.refresh()
      else setSyncError(data.error ?? 'Sync failed')
    } catch {
      setSyncError('Sync failed — try again')
    }
    setSyncing(false)
  }

  const derived = useMemo(() => {
    const active = swaps.filter(s => s.confirmation !== 'cancelled')

    // Send queue: everything the sync captured from the send calendars.
    const sends = active.filter(s => s.role === 'outbound-send')
    const openSends = sends.filter(s => s.confirmation !== 'complete')

    // Future day groups (completed rows stay visible as checked-off manifest lines).
    const futureByDate = new Map<string, SerializedSwap[]>()
    for (const s of sends) {
      const d = dstr(s.promoDate)
      if (d < today) continue
      if (!futureByDate.has(d)) futureByDate.set(d, [])
      futureByDate.get(d)!.push(s)
    }
    const futureDates = Array.from(futureByDate.keys()).sort()

    const catchUp = openSends
      .filter(s => dstr(s.promoDate) < today)
      .sort((a, b) => a.promoDate.localeCompare(b.promoDate))

    const promoting = active
      .filter(s => s.role === 'inbound' && s.confirmation === 'approved' && dstr(s.promoDate) >= today)
      .sort((a, b) => a.promoDate.localeCompare(b.promoDate))

    const requests = swaps
      .filter(s => (s.role === 'inbound' || s.role === 'outbound') && s.confirmation === 'applied')
      .sort((a, b) => a.promoDate.localeCompare(b.promoDate))

    const weekEnd = addDays(today, 6)
    const sendsThisWeek = openSends.filter(s => {
      const d = dstr(s.promoDate)
      return d >= today && d <= weekEnd
    }).length

    const multiList = new Set(sends.map(s => s.myList)).size > 1

    return { sends, futureByDate, futureDates, catchUp, promoting, requests, sendsThisWeek, multiList }
  }, [swaps, today])

  const heroDate = derived.futureDates[0] ?? null
  const comingUp = derived.futureDates.slice(1)
  const heroRows = heroDate ? derived.futureByDate.get(heroDate)! : []
  const heroOpenCount = heroRows.filter(r => r.confirmation !== 'complete').length

  const stats = [
    {
      label: 'Next Send',
      value: heroDate ? fmtShort(heroDate) : '—',
      sub: heroDate ? `${heroOpenCount} partner${heroOpenCount === 1 ? '' : 's'}` : 'none booked',
      accent: AMBER,
    },
    { label: 'Sends This Week', value: String(derived.sendsThisWeek) },
    { label: 'Promoting Your Books', value: String(derived.promoting.length) },
    { label: 'Requests Waiting', value: String(derived.requests.length) },
  ]

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{
              fontFamily: SERIF, fontSize: 27, fontWeight: 700, color: NAVY,
              margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              Book Swaps
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: AMBER, background: 'rgba(233,160,32,0.12)', padding: '3px 10px',
                borderRadius: 999, fontFamily: "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif",
                lineHeight: 1.4,
              }}>
                In Dev
              </span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(30,45,61,0.5)', margin: 0 }}>
              Your send queue, incoming promos, and requests — one place.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <button
              onClick={syncNow}
              disabled={syncing}
              style={{
                fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 10,
                background: AMBER, color: NAVY, border: 'none',
                cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.6 : 1,
                whiteSpace: 'nowrap', fontFamily: 'inherit',
              }}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(30,45,61,0.4)' }}>
              {syncing
                ? 'This can take a couple of minutes'
                : lastSyncAt ? `Last synced ${relativeTime(lastSyncAt)}` : 'Not synced yet'}
            </span>
            {syncError && (
              <span style={{ fontSize: 11, color: CORAL }}>{syncError}</span>
            )}
          </div>
        </div>

        {swaps.length === 0 ? (
          <ConnectEmptyState />
        ) : (
          <>
            <StatStrip stats={stats} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),320px]">
              {/* Main column: hero + coming up */}
              <div style={{ minWidth: 0 }}>
                {heroDate ? (
                  <UpNextHero
                    dateStr={heroDate}
                    rows={heroRows}
                    multiList={derived.multiList}
                    onToggle={toggleSent}
                  />
                ) : (
                  <section style={{ ...card, padding: '28px 22px', marginBottom: 20, textAlign: 'center' }}>
                    <p style={{ fontFamily: SERIF, fontSize: 17, color: NAVY, margin: '0 0 4px' }}>
                      No sends on the calendar
                    </p>
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                      Your next BookClicker booking will show up here as a send manifest.
                    </p>
                  </section>
                )}

                {comingUp.length > 0 && (
                  <div>
                    <SectionLabel>Coming Up</SectionLabel>
                    {comingUp.map(d => (
                      <DayGroup
                        key={d}
                        dateStr={d}
                        rows={derived.futureByDate.get(d)!}
                        multiList={derived.multiList}
                        onToggle={toggleSent}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right rail */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PromotingPanel rows={derived.promoting} />
                <RequestsPanel rows={derived.requests} onDecide={decideRequest} />
                <CatchUpPanel rows={derived.catchUp} multiList={derived.multiList} onToggle={toggleSent} />
              </div>
            </div>

            {/* Footer: calendar demoted to a secondary view */}
            <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 20, borderTop: '0.5px solid rgba(30,45,61,0.08)' }}>
              <Link href="/dashboard/swaps/calendar" style={{
                fontSize: 13, fontWeight: 700, color: AMBER, textDecoration: 'none',
              }}>
                Open Calendar View →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
