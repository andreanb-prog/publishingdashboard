'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

type SyncLogEntry = {
  status: string
  errorDetail: string | null
  sessionId: string | null
  attemptedAt: string
}

type UserRow = {
  id: string
  email: string
  kdpSyncStatus: string | null
  kdpLastSyncAt: string | null
  syncLogs: SyncLogEntry[]
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 1000 / 60 / 60)
  if (hours < 1) {
    const mins = Math.floor(diff / 1000 / 60)
    return `${mins}m ago`
  }
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusDot({ status }: { status: string | null }) {
  const color =
    status === 'connected'
      ? '#6EBF8B'
      : status === 'needs_reauth'
        ? '#E9A020'
        : '#F97B6B'
  const label =
    status === 'connected'
      ? 'connected'
      : status === 'needs_reauth'
        ? 'needs reauth'
        : 'never connected'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <span style={{ color: '#1E2D3D', fontSize: 13 }}>{label}</span>
    </span>
  )
}

function LogStatus({ log }: { log: SyncLogEntry | undefined }) {
  if (!log) return <span style={{ color: '#9CA3AF', fontSize: 13 }}>—</span>
  const color =
    log.status === 'success'
      ? '#6EBF8B'
      : log.status === 'failed'
        ? '#F97B6B'
        : '#E9A020'

  const cell = (
    <span style={{ color, fontSize: 13, fontWeight: 500 }}>{log.status}</span>
  )

  if (log.status === 'failed' && log.errorDetail) {
    return (
      <span
        title={log.errorDetail}
        style={{ cursor: 'help', borderBottom: '1px dashed #F97B6B' }}
      >
        {cell}
      </span>
    )
  }
  return cell
}

export default function SyncHealthPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !isAdmin)) {
      router.replace('/dashboard')
    }
  }, [status, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/sync-health')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .finally(() => setLoading(false))
  }, [isAdmin])

  if (status === 'loading' || !isAdmin) return null

  const connected = users.filter(u => u.kdpSyncStatus === 'connected').length
  const needsReauth = users.filter(u => u.kdpSyncStatus === 'needs_reauth').length
  const failedLast = users.filter(u => u.syncLogs[0]?.status === 'failed').length

  const stats = [
    { label: 'Total users', value: users.length, color: '#1E2D3D' },
    { label: 'Connected', value: connected, color: '#6EBF8B' },
    { label: 'Needs reauth', value: needsReauth, color: '#E9A020' },
    { label: 'Failed last sync', value: failedLast, color: '#F97B6B' },
  ]

  async function runSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/cron/sync', {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.NEXT_PUBLIC_CRON_SECRET ?? '' },
      })
      const text = await res.text()
      setSyncMsg(res.ok ? `Done: ${text}` : `Error ${res.status}: ${text}`)
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFF8F0',
        padding: '32px 40px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: '#1E2D3D',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Sync Health</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
            KDP sync status across all users
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={runSync}
            disabled={syncing}
            style={{
              backgroundColor: syncing ? '#D1D5DB' : '#E9A020',
              color: syncing ? '#6B7280' : '#1E2D3D',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {syncing && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid #6B7280',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            )}
            {syncing ? 'Running…' : 'Run full sync now'}
          </button>
          {syncMsg && (
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0, maxWidth: 280, textAlign: 'right' }}>
              {syncMsg}
            </p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div
            key={s.label}
            style={{
              background: '#fff',
              border: '0.5px solid #E5E7EB',
              borderRadius: 10,
              padding: '20px 24px',
            }}
          >
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          border: '0.5px solid #E5E7EB',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
            Loading…
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E5E7EB', backgroundColor: '#FAFAFA' }}>
                {['Email', 'KDP Status', 'Last sync', 'Log status', 'Replay'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const log = u.syncLogs[0]
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: i < users.length - 1 ? '0.5px solid #F3F4F6' : undefined,
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#1E2D3D' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusDot status={u.kdpSyncStatus} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>
                      {timeAgo(u.kdpLastSyncAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <LogStatus log={log} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {log?.sessionId ? (
                        <a
                          href={`https://browserbase.com/sessions/${log.sessionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 13,
                            color: '#E9A020',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          Watch replay
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: '#D1D5DB' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
