'use client'
// app/dashboard/meta/select-account/page.tsx — Pick which Meta ad account to use
import { useEffect, useState } from 'react'

type AdAccount = { id: string; name: string; status: string; spent: string }

export default function SelectMetaAccountPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch('/api/meta/accounts')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setAccounts(d.accounts ?? [])
      })
      .catch(() => setError('Failed to load ad accounts'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #E8E4DC', padding: '40px', maxWidth: '480px', width: '100%' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1E2D3D' }}>
            Select Ad Account
          </h1>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6B7280', lineHeight: '1.5' }}>
          Choose which ad account AuthorDash should sync.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280', fontSize: '14px' }}>
            Loading your ad accounts…
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(249,123,107,0.08)', border: '1px solid rgba(249,123,107,0.25)', borderRadius: '10px', padding: '16px', fontSize: '14px', color: '#F97B6B' }}>
            {error}
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ background: 'rgba(249,123,107,0.08)', border: '1px solid rgba(249,123,107,0.25)', borderRadius: '10px', padding: '16px', fontSize: '14px', color: '#F97B6B' }}>
            No ad accounts found. Make sure your Meta account has access to at least one ad account.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {accounts.map(acct => (
              <a
                key={acct.id}
                href={`/api/meta/save-account?accountId=${encodeURIComponent(acct.id)}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '10px', textDecoration: 'none',
                  border: '1px solid #E8E4DC', background: '#fff',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E9A020'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(233,160,32,0.04)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E8E4DC'
                  ;(e.currentTarget as HTMLAnchorElement).style.background = '#fff'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E2D3D', marginBottom: '2px' }}>
                    {acct.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {acct.id}
                    {acct.status === 'disabled' && (
                      <span style={{ marginLeft: '8px', color: '#F97B6B' }}>· disabled</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '18px', color: '#E9A020', marginLeft: '12px' }}>→</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
