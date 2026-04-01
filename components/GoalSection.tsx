'use client'
// components/GoalSection.tsx
// Collapsible per-page goal tracker with progress bars

import { useEffect, useState, useCallback } from 'react'

type Goals = Record<string, number>

interface GoalField {
  key: string
  label: string
  unit: 'dollar' | 'percent' | 'number'
  placeholder: string
}

const PAGE_GOALS: Record<string, GoalField[]> = {
  meta: [
    { key: 'meta_ctr',         label: 'Target CTR',         unit: 'percent', placeholder: 'e.g. 15 (15%+ is strong for book ads)' },
    { key: 'meta_cpc',         label: 'Target CPC',         unit: 'dollar',  placeholder: 'e.g. 0.15 (under $0.15 is great)' },
    { key: 'meta_impressions', label: 'Target Impressions', unit: 'number',  placeholder: 'e.g. 10000 per month' },
    { key: 'meta_spend',       label: 'Target Monthly Spend', unit: 'dollar', placeholder: 'e.g. 100 per month' },
  ],
  kdp: [
    { key: 'kdp_units',     label: 'Target Units/Month',    unit: 'number',  placeholder: 'e.g. 200 units/month' },
    { key: 'kdp_kenp',      label: 'Target KENP/Month',     unit: 'number',  placeholder: 'e.g. 50000 KENP reads' },
    { key: 'kdp_royalties', label: 'Target Royalties/Month', unit: 'dollar', placeholder: 'e.g. 500 per month' },
  ],
  mailerlite: [
    { key: 'email_open_rate',   label: 'Target Open Rate',        unit: 'percent', placeholder: 'e.g. 24 (24%+ is above average)' },
    { key: 'email_list_size',   label: 'Target List Size',        unit: 'number',  placeholder: 'e.g. 1000 subscribers' },
    { key: 'email_new_subs',    label: 'Target New Subs/Month',   unit: 'number',  placeholder: 'e.g. 50 per month' },
  ],
}

function fmtVal(val: number, unit: GoalField['unit']): string {
  if (unit === 'dollar') return `$${val}`
  if (unit === 'percent') return `${val}%`
  return val.toLocaleString()
}

function GoalBar({ current, goal, unit }: { current?: number; goal: number; unit: GoalField['unit'] }) {
  const pct = goal > 0 && current != null ? Math.min((current / goal) * 100, 100) : 0
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#fb7185'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#292524' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10.5px] font-mono" style={{ color, minWidth: 36, textAlign: 'right' }}>
        {Math.round(pct)}%
      </span>
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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(storageKey) !== 'open'
  })
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
      const ok = current != null && current >= goal * 0.8
      return `${f.label.replace('Target ', '')}: ${current != null ? fmtVal(current, f.unit) : '—'} / ${fmtVal(goal, f.unit)} ${ok ? '✅' : ''}`
    })

  const hasGoals = fields.some(f => goals[f.key] != null)

  return (
    <div className="rounded-xl mb-5 overflow-hidden"
      style={{ background: '#1c1917', border: '1px solid #292524' }}>
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🎯</span>
          <span className="text-[12.5px] font-bold" style={{ color: '#d6d3d1' }}>My Goals</span>
          {collapsed && hasGoals && summaryParts.length > 0 && (
            <span className="text-[11px] ml-2" style={{ color: '#57534e' }}>
              {summaryParts.join(' · ')}
            </span>
          )}
          {collapsed && !hasGoals && (
            <span className="text-[11px] ml-2 italic" style={{ color: '#44403c' }}>
              Set your goals →
            </span>
          )}
        </div>
        <span className="text-[12px] transition-transform duration-200"
          style={{ color: '#57534e', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', display: 'inline-block' }}>
          ▾
        </span>
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid #292524' }}>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {fields.map(f => {
              const goal    = goals[f.key]
              const current = currentValues[f.key]
              return (
                <div key={f.key}>
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] mb-1.5"
                    style={{ color: '#78716c' }}>
                    {f.label}
                  </label>
                  <div className="flex items-center gap-2 mb-1.5">
                    {f.unit === 'dollar' && (
                      <span className="text-[13px]" style={{ color: '#57534e' }}>$</span>
                    )}
                    <input
                      type="number"
                      step={f.unit === 'dollar' ? '0.01' : '1'}
                      placeholder={f.placeholder}
                      value={draft[f.key] ?? ''}
                      onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                      className="flex-1 rounded-lg px-3 py-1.5 text-[13px] font-mono outline-none"
                      style={{ background: '#292524', border: '1px solid #44403c', color: '#fafaf9' }}
                    />
                    {f.unit === 'percent' && (
                      <span className="text-[13px]" style={{ color: '#57534e' }}>%</span>
                    )}
                  </div>
                  {goal != null && current != null && (
                    <GoalBar current={current} goal={goal} unit={f.unit} />
                  )}
                  {goal != null && current != null && (
                    <div className="text-[10.5px] mt-1" style={{ color: '#57534e' }}>
                      {fmtVal(current, f.unit)} of {fmtVal(goal, f.unit)} goal
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-50"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              {saving ? 'Saving…' : 'Save Goals'}
            </button>
            {saved && (
              <span className="text-[12px]" style={{ color: '#34d399' }}>✓ Saved</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
