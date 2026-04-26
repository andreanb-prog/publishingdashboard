'use client'
// components/GoalSection.tsx
// Collapsible per-page goal tracker with progress bars

import { useEffect, useState } from 'react'
import { IconStar } from '@/components/icons'

type Goals = Record<string, number>

interface GoalField {
  key: string
  label: string
  unit: 'dollar' | 'percent' | 'number'
  placeholder: string
  hint?: string
}

const PAGE_GOALS: Record<string, GoalField[]> = {
  meta: [
    { key: 'meta_ctr',   label: 'Target CTR',           unit: 'percent', placeholder: '15',  hint: '15%+ is strong for book ads' },
    { key: 'meta_cpc',   label: 'Target CPC',           unit: 'dollar',  placeholder: '0.15', hint: 'Under $0.15 is great' },
    { key: 'meta_spend', label: 'Target Monthly Spend',  unit: 'dollar',  placeholder: '100',  hint: 'Monthly budget' },
  ],
  kdp: [
    { key: 'kdp_units',     label: 'Target Units/Month',     unit: 'number', placeholder: '200',   hint: 'Monthly unit sales' },
    { key: 'kdp_kenp',      label: 'Target KENP/Month',      unit: 'number', placeholder: '50000', hint: 'Kindle Unlimited reads' },
    { key: 'kdp_royalties', label: 'Target Royalties/Month', unit: 'dollar', placeholder: '500',   hint: 'Monthly royalties' },
  ],
  mailerlite: [
    { key: 'email_open_rate', label: 'Target Open Rate',       unit: 'percent', placeholder: '20', hint: 'Author avg: 20–25%' },
    { key: 'email_list_size', label: 'Target List Size',       unit: 'number',  placeholder: '2000' },
    { key: 'email_new_subs',  label: 'Target New Subs/Month', unit: 'number',  placeholder: '100' },
  ],
}

function fmtVal(val: number, unit: GoalField['unit']): string {
  if (unit === 'dollar') return `$${val}`
  if (unit === 'percent') return `${val}%`
  return val.toLocaleString()
}

function GoalBar({ current, goal, unit }: { current?: number; goal: number; unit: GoalField['unit'] }) {
  const pct = goal > 0 && current != null ? Math.min((current / goal) * 100, 120) : 0
  const displayPct = Math.min(pct, 100)
  const isOver = pct >= 100
  const color = isOver ? '#34d399' : pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#fb7185'
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 overflow-hidden" style={{ background: '#EEEBE6' }}>
          <div className="h-full transition-all duration-500"
            style={{ width: `${displayPct}%`, background: color }} />
        </div>
        <span className="text-[10.5px] font-mono font-semibold" style={{ color, minWidth: 40, textAlign: 'right' }}>
          {isOver ? '✓' : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="text-[10.5px] mt-1" style={{ color: '#6B7280' }}>
        {current != null ? fmtVal(current, unit) : '—'} of {fmtVal(goal, unit)} goal
        {isOver && <span className="ml-1 font-semibold" style={{ color: '#34d399' }}>Goal reached!</span>}
      </div>
    </div>
  )
}

export function GoalSection({
  page,
  currentValues,
}: {
  page: 'meta' | 'kdp' | 'mailerlite'
  currentValues: Partial<Record<string, number>>
}) {
  const storageKey = `goals-collapsed-${page}`
  const fields = PAGE_GOALS[page] ?? []

  const [goals, setGoals]         = useState<Goals>({})
  const [draft, setDraft]         = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState(true)
  useEffect(() => {
    setCollapsed(localStorage.getItem(storageKey) !== 'open')
  }, [storageKey])
  const [saving, setSaving]       = useState(false)
  const [saved,  setSaved]        = useState(false)

  useEffect(() => {
    fetch('/api/prefs')
      .then(r => r.json())
      .then(d => {
        const g: Goals = d.goals ?? {}
        setGoals(g)
        const initialDraft: Record<string, string> = {}
        fields.forEach(f => { initialDraft[f.key] = g[f.key] != null ? String(g[f.key]) : '' })
        setDraft(initialDraft)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(storageKey, next ? 'closed' : 'open')
      return next
    })
  }

  async function save() {
    setSaving(true)
    const updated: Goals = { ...goals }
    fields.forEach(f => {
      const v = parseFloat(draft[f.key] ?? '')
      if (!isNaN(v)) updated[f.key] = v
      else delete updated[f.key]
    })
    await fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-goals', goals: updated }),
    }).catch(() => {})
    setGoals(updated)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Collapsed summary line
  const summaryParts = fields
    .filter(f => goals[f.key] != null)
    .map(f => {
      const current = currentValues[f.key]
      const goal    = goals[f.key]!
      const pct     = current != null && goal > 0 ? (current / goal) * 100 : 0
      const ok      = pct >= 80
      return `${f.label.replace('Target ', '')}: ${current != null ? fmtVal(current, f.unit) : '—'} of ${fmtVal(goal, f.unit)} ${ok ? '✓' : ''}`
    })

  const hasGoals = fields.some(f => goals[f.key] != null)

  return (
    <div className="mb-5 overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--line, #d8cfbd)' }}>
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-transparent border-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <IconStar size={16} />
          <span className="text-[12.5px] font-bold" style={{ color: '#1E2D3D' }}>My Goals</span>
          {collapsed && hasGoals && summaryParts.length > 0 && (
            <span className="text-[11px] ml-2" style={{ color: '#6B7280' }}>
              {summaryParts.join(' · ')}
            </span>
          )}
          {collapsed && !hasGoals && (
            <span className="text-[11px] ml-2 italic" style={{ color: '#6B7280' }}>
              Set your goals →
            </span>
          )}
        </div>
        <span className="text-[12px] transition-transform duration-200"
          style={{ color: '#6B7280', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', display: 'inline-block' }}>
          ▾
        </span>
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid #EEEBE6' }}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-4">
            {fields.map(f => {
              const goal    = goals[f.key]
              const current = currentValues[f.key]
              return (
                <div key={f.key}>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] mb-1.5"
                    style={{ color: '#6B7280' }}>
                    {f.label}
                  </label>
                  <div className="flex items-center gap-2 mb-1.5">
                    {f.unit === 'dollar' && (
                      <span className="text-[13px]" style={{ color: '#6B7280' }}>$</span>
                    )}
                    <input
                      type="number"
                      step={f.unit === 'dollar' ? '0.01' : '1'}
                      placeholder={f.placeholder}
                      value={draft[f.key] ?? ''}
                      onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 text-[13px] font-mono outline-none"
                      style={{ background: 'white', border: '1px solid var(--line, #d8cfbd)', color: '#1E2D3D' }}
                    />
                    {f.unit === 'percent' && (
                      <span className="text-[13px]" style={{ color: '#6B7280' }}>%</span>
                    )}
                  </div>
                  {f.hint && (
                    <div className="text-[10px] mb-1" style={{ color: '#6B7280' }}>{f.hint}</div>
                  )}
                  {goal != null && (
                    <GoalBar current={current} goal={goal} unit={f.unit} />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 text-[12.5px] font-semibold transition-all disabled:opacity-50 border-none cursor-pointer"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              {saving ? 'Saving…' : 'Save Goals'}
            </button>
            {saved && (
              <span className="text-[12px] font-semibold" style={{ color: '#34d399' }}>✓ Saved</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
