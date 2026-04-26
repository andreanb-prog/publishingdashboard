'use client'
// app/dashboard/data-vault/page.tsx
import { useEffect, useState } from 'react'
import { BoutiqueChannelPageLayout, BoutiquePageHeader, BoutiqueStatusChip } from '@/components/boutique'
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
    <BoutiqueChannelPageLayout>
      <BoutiquePageHeader
        title="Your Data"
        subtitle="Everything you've uploaded — you're in full control. Delete anything at any time."
        badge="Data Vault"
        badgeColor="#6D3FD4"
      />

      {/* Currently Active */}
      {active && (
        <div style={{ background: 'white', border: '2px solid #D97706', padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D97706', marginBottom: 8 }}>
                Currently Powering Your Dashboard
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: '#1E2D3D', marginBottom: 4 }}>
                {formatMonth(active.month)}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                Analyzed {formatDate((active.data as any).generatedAt ?? active.createdAt)} at {formatTime((active.data as any).generatedAt ?? active.createdAt)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ background: '#FFF8F0', border: '1px solid #EEEBE6', padding: '8px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginBottom: 2 }}>Files used</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: '#1E2D3D' }}>{getFilesUsed(active.data)}</div>
                </div>
                <div style={{ background: '#FFF8F0', border: '1px solid #EEEBE6', padding: '8px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginBottom: 2 }}>Records parsed</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: '#1E2D3D' }}>{getRecordsSummary(active.data)}</div>
                </div>
              </div>
            </div>
            <a
              href="/dashboard?upload=1"
              style={{ flexShrink: 0, padding: '10px 16px', background: '#D97706', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
              Re-run analysis →
            </a>
          </div>
        </div>
      )}

      {/* Upload History Table */}
      <div style={{ background: 'white', border: '1px solid #EEEBE6', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
          Upload History
        </div>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: '#6B7280' }}>Loading…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: '#6B7280' }}>
            No analyses saved yet. Upload your first data set to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#F7F1E6' }}>
                {['Date Uploaded', 'Month', 'Files Included', 'Records', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => {
                const isActive = i === 0
                const isConfirmingDelete = deletingId === `confirm-${rec.id}`
                return (
                  <tr key={rec.id} style={{ borderTop: '1px solid #EEEBE6' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: '#6B7280' }}>
                      {formatDate((rec.data as any).generatedAt ?? rec.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: '#1E2D3D' }}>
                      {formatMonth(rec.month)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: 12, color: '#374151' }}>
                      {getFilesUsed(rec.data)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: '#6B7280' }}>
                      {getRecordsSummary(rec.data)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isActive ? (
                        <BoutiqueStatusChip tone="amber" label="Active" />
                      ) : (
                        <BoutiqueStatusChip tone="coral" label="Archived" />
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isConfirmingDelete ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'var(--font-sans)' }}>Delete?</span>
                          <button
                            onClick={() => handleDelete(rec.id)}
                            style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: 'rgba(249,123,107,0.12)', color: '#F97B6B', border: 'none', cursor: 'pointer' }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{ fontSize: 11, padding: '2px 8px', background: '#F5F5F4', color: '#6B7280', border: 'none', cursor: 'pointer' }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {!isActive && (
                            <button
                              onClick={() => handleRestore(rec)}
                              style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', background: '#F5F5F4', color: '#374151', border: '1px solid #E8E1D3', cursor: 'pointer' }}
                            >
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => setDeletingId(`confirm-${rec.id}`)}
                            disabled={deletingId === rec.id}
                            style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', background: 'rgba(249,123,107,0.08)', color: '#F97B6B', border: '1px solid rgba(249,123,107,0.2)', cursor: 'pointer', opacity: deletingId === rec.id ? 0.4 : 1 }}
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
      <div style={{ background: 'white', border: '1px solid #EEEBE6', marginBottom: 24 }}>
        <button
          onClick={() => setWhatWeStore(v => !v)}
          style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#1E2D3D' }}>
            What does AuthorDash store?
          </span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{whatWeStore ? '▲' : '▼'}</span>
        </button>
        {whatWeStore && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid #EEEBE6' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {[
                { icon: '📚', text: 'Your KDP report: we store total units, daily breakdown, and royalties per book' },
                { icon: '📣', text: 'Your Meta Ads: we store ad names, spend, clicks, CTR, and CPC' },
                { icon: '📧', text: 'Your MailerLite: we store open rates, click rates, and campaign names' },
                { icon: '📋', text: 'We store the parsed summary of your data — not the original files' },
                { icon: '🚫', text: 'We never store your raw Excel or CSV files' },
                { icon: '🗑️', text: 'You can delete all your data at any time from this page' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.6, margin: 0, color: '#374151' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Your Data */}
      <div style={{ background: 'white', border: '1px solid #EEEBE6', padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', marginBottom: 8 }}>
          Export Your Data
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12.5, color: '#374151', margin: '0 0 16px' }}>
          Download a complete copy of everything AuthorDash holds about you.
        </p>
        <a
          href="/api/user/data-export"
          download
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D97706', textDecoration: 'none' }}
        >
          Download my data →
        </a>
      </div>

      {/* Delete All */}
      <div style={{ background: 'white', border: '1px solid rgba(249,123,107,0.25)', padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#1E2D3D', marginBottom: 4 }}>Delete all my data</div>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: '#6B7280', margin: '0 0 16px' }}>
          This permanently removes all your analyses and upload history. Your account will remain active but your dashboard will be empty.
        </p>
        {!confirmDeleteAll ? (
          <button
            onClick={() => setConfirmDeleteAll(true)}
            style={{ padding: '8px 16px', background: 'rgba(249,123,107,0.1)', color: '#F97B6B', border: '1px solid rgba(249,123,107,0.25)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Delete all my data
          </button>
        ) : (
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: '#F97B6B', marginBottom: 12 }}>
              Type DELETE to confirm:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                value={deleteAllInput}
                onChange={e => setDeleteAllInput(e.target.value)}
                placeholder="DELETE"
                style={{ background: 'white', border: '1.5px solid #F97B6B', color: '#1E2D3D', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none', width: 144 }}
              />
              <button
                onClick={handleDeleteAll}
                disabled={deleteAllInput !== 'DELETE' || deletingAll}
                style={{ padding: '8px 16px', background: '#F97B6B', color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (deleteAllInput !== 'DELETE' || deletingAll) ? 0.4 : 1 }}
              >
                {deletingAll ? 'Deleting…' : 'Confirm delete all'}
              </button>
              <button
                onClick={() => { setConfirmDeleteAll(false); setDeleteAllInput('') }}
                style={{ padding: '8px 16px', background: '#F5F5F4', color: '#6B7280', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </BoutiqueChannelPageLayout>
  )
}
