'use client'

// Shared building blocks for the send-queue surfaces: the manifest row (one
// outbound-send obligation with its mark-sent checkbox) and its helpers. Used by
// the main Swaps page and the secondary calendar view so both render sends
// identically. Direction semantics: amber = your sends, sage = partners
// promoting your books, coral = catch-up only.

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SerializedSwap } from '@/lib/swaps'

export const NAVY  = '#1E2D3D'
export const AMBER = '#E9A020'
export const SAGE  = '#6EBF8B'
export const CORAL = '#F97B6B'
export const SERIF = "var(--font-playfair), 'Playfair Display', Georgia, serif"

export const card: React.CSSProperties = {
  background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
}

// ─── Date / format helpers (all on 'YYYY-MM-DD' strings, local time) ─────────

export function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function dstr(iso: string) {
  return iso.split('T')[0]
}
export function fmtShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
export function fmtListSize(n: number | null): string {
  if (!n) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K subs` : `${n} subs`
}

// BookClicker send bookings often carry a placeholder instead of the real title
// ("July Launch", "TBD", a bare month). Heuristic: no title, an obviously generic
// word, or a short month-led phrase. Real titles can contain "May"/"June" as a
// name, so the month test only fires on short (≤3 word) titles.
export function isPlaceholderTitle(t: string | null | undefined): boolean {
  if (!t || !t.trim()) return true
  const s = t.trim()
  if (/\b(tbd|untitled|title pending|coming soon)\b/i.test(s)) return true
  const short = s.split(/\s+/).length <= 3
  if (short && /\b(launch|promo|newsletter|swap)\b/i.test(s)) return true
  if (short && /^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(s)) return true
  return false
}

// PATCH one swap's status (component vocab) and return the resulting
// confirmation, or null on failure so callers can revert their optimistic state.
export async function patchSwapStatus(id: string, status: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/swaps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    return data.success ? data.swap.confirmation : null
  } catch {
    return null
  }
}

// ─── Small shared pieces ──────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
      letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px',
    }}>
      {children}
    </p>
  )
}

export function TypeChip({ type }: { type: string | null }) {
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

export function ListChip({ name }: { name: string }) {
  // BookClicker list labels carry the full swap criteria in parentheses
  // ("Elle Wilder (Contemporary Romance, Slow Burn, Small Town…)"). Rendered
  // un-truncated it steamrolled the row and crushed the book title to 2-3
  // letters. Show just the list name, cap the width, keep the full label on
  // hover.
  const display = name.includes('(') ? name.slice(0, name.indexOf('(')).trim() : name
  return (
    <span title={name} style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: 'rgba(233,160,32,0.1)', color: '#B57812',
      whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 140,
      overflow: 'hidden', textOverflow: 'ellipsis',
      fontFamily: 'var(--font-jetbrains-mono), monospace',
    }}>
      {display}
    </span>
  )
}

export function Dot({ color }: { color: string }) {
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

// ─── Manifest row (one outbound-send obligation) ─────────────────────────────

export function ManifestRow({ swap, multiList, onToggle, showDate }: {
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

        {placeholder ? (
          <span title={swap.bookTitle ?? undefined} style={{
            fontSize: 13, fontStyle: 'italic', fontFamily: SERIF,
            color: 'rgba(30,45,61,0.5)', minWidth: 120, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            opacity: done ? 0.5 : 1,
          }}>
            {`Title pending — ${swap.bookTitle || 'no title yet'}`}
          </span>
        ) : (
          // Live link: BookClicker doesn't expose the partner's book URL, so
          // search Amazon Kindle for the title — one click to the real book.
          <a
            href={`https://www.amazon.com/s?k=${encodeURIComponent(`${swap.bookTitle} kindle`)}`}
            target="_blank" rel="noopener noreferrer"
            title={`${swap.bookTitle} — find on Amazon`}
            style={{
              fontSize: 13, fontStyle: 'italic', fontFamily: SERIF,
              color: 'rgba(30,45,61,0.6)', minWidth: 120, flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              opacity: done ? 0.5 : 1,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(30,45,61,0.2)',
              textUnderlineOffset: 3,
            }}
          >
            {swap.bookTitle}
          </a>
        )}

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
export function ManifestList({ rows, multiList, onToggle }: {
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
