'use client'
// app/dashboard/data-vault/page.tsx
import { useEffect, useState } from 'react'
import { DarkPage } from '@/components/DarkPage'
import type { Analysis } from '@/types'

interface AnalysisRecord {
  id: string
  month: string
  createdAt: string
  data: Analysis
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

function formatMonth(month: string) {
  const [y, m] = month.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })
}

function getFilesUsed(data: Analysis): string {
  const parts: string[] = []
  if (data.kdp) parts.push('KDP Report')
  if (data.meta) parts.push('Meta Ads CSV')
  if (data.mailerLite) parts.push('MailerLite (auto)')
  if (data.pinterest) parts.push('Pinterest')
  return parts.length > 0 ? parts.join(', ') : '—'
}

function getRecordsSummary(data: Analysis): string {
  const parts: string[] = []
  if (data.kdp) {
    const units = data.kdp.books?.reduce((s, b) => s + b.units, 0) ?? 0
    parts.push(`${units} units`)
  }
  if (data.meta) parts.push(`${data.meta.ads?.length ?? 0} ads`)
  if (data.mailerLite) parts.push(`${data.mailerLite.listSize?.toLocaleString() ?? '?'} subscribers`)
  return parts.join(', ') || '—'
}

export default function DataVaultPage() {
  const [records, setRecords] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [deleteAllInput, setDeleteAllInput] = useState('')
  const [deletingAll, setDeletingAll] = useState(false)
  const [whatWeStore, setWhatWeStore] = useState(false)
  const [rerunning, setRerunning] = useState(false)

  useEffect(() => {
    fetch('/api/data-vault')
      .then(r => r.json())
      .then(d => setRecords(d.analyses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch('/api/data-vault', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setRecords(prev => prev.filter(r => r.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteAll() {
    if (deleteAllInput !== 'DELETE') return
    setDeletingAll(true)
    try {
      await fetch('/api/data-vault', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true }),
      })
      setRecords([])
      setConfirmDeleteAll(false)
      setDeleteAllInput('')
    } finally {
      setDeletingAll(false)
    }
  }

  async function handleRestore(record: AnalysisRecord) {
    // Restoring means moving this record to be the active one — we just navigate to overview
    // which always shows the most recent. To "restore" we could re-save with a fresh timestamp.
    // Simplest: POST to /api/analyze would overwrite — instead just show a note.
    alert(`To make ${formatMonth(record.month)} active, upload those files again via Upload & Analyze.`)
  }

  const active = records[0] ?? null

  return (
    <DarkPage title="🔐 Your Data" subtitle="Everything you've uploaded — you're in full control. Delete anything at any time.">

      {/* Currently Active */}
      {active && (
        <div className="rounded-xl p-5 mb-6" style={{ background: 'white', border: '2px solid #E9A020' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2" style={{ color: '#E9A020' }}>
                Currently Powering Your Dashboard
              </div>
              <div className="font-serif text-[20px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                {formatMonth(active.month)}
              </div>
              <div className="text-[12.5px] mb-3" style={{ color: '#6B7280' }}>
                Analyzed {formatDate(active.createdAt)} at {formatTime(active.createdAt)}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg px-3 py-2" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.8px] mb-0.5" style={{ color: '#9CA3AF' }}>Files used</div>
                  <div className="text-[12.5px] font-semibold" style={{ color: '#1E2D3D' }}>{getFilesUsed(active.data)}</div>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.8px] mb-0.5" style={{ color: '#9CA3AF' }}>Records parsed</div>
                  <div className="text-[12.5px] font-semibold" style={{ color: '#1E2D3D' }}>{getRecordsSummary(active.data)}</div>
                </div>
              </div>
            </div>
            <a
              href="/dashboard/upload"
              className="flex-shrink-0 px-4 py-2.5 rounded-lg text-[13px] font-bold no-underline transition-all"
              style={{ background: '#E9A020', color: '#0d1f35' }}
            >
              Re-run analysis →
            </a>
          </div>
        </div>
      )}

      {/* Upload History Table */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <div className="px-5 py-3.5 font-semibold text-[13px]" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
          Upload History
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: '#9CA3AF' }}>Loading…</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: '#9CA3AF' }}>
            No analyses saved yet. Upload your first data set to get started.
          </div>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr style={{ background: '#F5F5F4' }}>
                {['Date Uploaded', 'Month', 'Files Included', 'Records', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                    style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => {
                const isActive = i === 0
                const isConfirmingDelete = deletingId === `confirm-${rec.id}`
                return (
                  <tr key={rec.id} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>
                      {formatDate(rec.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1E2D3D' }}>
                      {formatMonth(rec.month)}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#374151' }}>
                      {getFilesUsed(rec.data)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px]" style={{ color: '#6B7280' }}>
                      {getRecordsSummary(rec.data)}
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}>
                          ● Active
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: '#F5F5F4', color: '#9CA3AF' }}>
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px]" style={{ color: '#6B7280' }}>Delete?</span>
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="text-[11px] font-bold px-2 py-0.5 rounded"
                            style={{ background: 'rgba(251,113,133,0.12)', color: '#fb7185' }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-[11px] px-2 py-0.5 rounded"
                            style={{ background: '#F5F5F4', color: '#6B7280' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!isActive && (
                            <button
                              onClick={() => handleRestore(rec)}
                              className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                              style={{ background: '#F5F5F4', color: '#374151', border: '1px solid #E7E5E4' }}
                            >
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingId(`confirm-${rec.id}`)}
                            disabled={deletingId === rec.id}
                            className="text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: 'rgba(251,113,133,0.08)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.2)' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* What does AuthorDash store? */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <button
          onClick={() => setWhatWeStore(v => !v)}
          className="w-full px-5 py-4 flex items-center justify-between text-left"
        >
          <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
            What does AuthorDash store?
          </span>
          <span className="text-[16px]" style={{ color: '#9CA3AF' }}>{whatWeStore ? '▲' : '▼'}</span>
        </button>
        {whatWeStore && (
          <div className="px-5 pb-5" style={{ borderTop: '1px solid #EEEBE6' }}>
            <div className="space-y-2.5 mt-4">
              {[
                { icon: '📚', text: 'Your KDP report: we store total units, daily breakdown, and royalties per book' },
                { icon: '📣', text: 'Your Meta Ads: we store ad names, spend, clicks, CTR, and CPC' },
                { icon: '📧', text: 'Your MailerLite: we store open rates, click rates, and campaign names' },
                { icon: '📋', text: 'We store the parsed summary of your data — not the original files' },
                { icon: '🚫', text: 'We never store your raw Excel or CSV files' },
                { icon: '🗑️', text: 'You can delete all your data at any time from this page' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                  <p className="text-[12.5px] leading-relaxed m-0" style={{ color: '#374151' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete All */}
      <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid rgba(251,113,133,0.25)' }}>
        <div className="text-[13px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>Delete all my data</div>
        <p className="text-[12px] mb-4 m-0" style={{ color: '#6B7280' }}>
          This permanently removes all your analyses and upload history. Your account will remain active but your dashboard will be empty.
        </p>
        {!confirmDeleteAll ? (
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all"
            style={{ background: 'rgba(251,113,133,0.1)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.25)' }}
          >
            Delete all my data
          </button>
        ) : (
          <div>
            <p className="text-[12.5px] font-semibold mb-3" style={{ color: '#fb7185' }}>
              Type DELETE to confirm:
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={deleteAllInput}
                onChange={e => setDeleteAllInput(e.target.value)}
                placeholder="DELETE"
                className="rounded-lg px-3 py-2 text-[13px] font-mono outline-none w-36"
                style={{ background: 'white', border: '1.5px solid #fb7185', color: '#1E2D3D' }}
              />
              <button
                onClick={handleDeleteAll}
                disabled={deleteAllInput !== 'DELETE' || deletingAll}
                className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all disabled:opacity-40"
                style={{ background: '#fb7185', color: 'white', border: 'none' }}
              >
                {deletingAll ? 'Deleting…' : 'Confirm delete all'}
              </button>
              <button
                onClick={() => { setConfirmDeleteAll(false); setDeleteAllInput('') }}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold"
                style={{ background: '#F5F5F4', color: '#6B7280' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </DarkPage>
  )
}
