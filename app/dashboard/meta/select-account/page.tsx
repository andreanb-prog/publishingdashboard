'use client'
// app/dashboard/meta/select-account/page.tsx — Pick which Meta ad account to use
import { useEffect, useState } from 'react'

type AdAccount = { id: string; name: string; status: string; spent: string }

export default function SelectMetaAccountPage() {
  const [accounts,  setAccounts]  = useState<AdAccount[]>([])
  const [selected,  setSelected]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetch('/api/meta/accounts')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setAccounts(d.accounts ?? [])
        if (d.accounts?.length === 1) setSelected(d.accounts[0].id)
      })
      .catch(() => setError('Failed to load ad accounts'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/meta/save-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      window.location.href = '/dashboard/settings?meta=connected'
    } catch (e: any) {
      setError(e.message || 'Could not save selection — please try again')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #E8E4DC', padding: '40px', maxWidth: '480px', width: '100%' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1E2D3D' }}>
              Connect Meta Ads
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: '1.5' }}>
            Your account has access to multiple ad accounts. Select the one you want AuthorDash to sync.
          </p>
        </div>

        {/* Content */}
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
            No ad accounts found for this Meta account. Make sure your account has access to at least one ad account.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {accounts.map(acct => (
                <label key={acct.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                  border: selected === acct.id ? '1.5px solid #E9A020' : '1px solid #E8E4DC',
                  background: selected === acct.id ? 'rgba(233,160,32,0.05)' : '#fff',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="account"
                    value={acct.id}
                    checked={selected === acct.id}
                    onChange={() => setSelected(acct.id)}
                    style={{ accentColor: '#E9A020', width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                </label>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={!selected || saving}
              style={{
                width: '100%', padding: '13px', borderRadius: '10px',
                background: selected && !saving ? '#E9A020' : '#D1C7B8',
                color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '15px', fontWeight: 700, border: 'none',
                cursor: selected && !saving ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              {saving ? 'Connecting…' : 'Connect this account →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
