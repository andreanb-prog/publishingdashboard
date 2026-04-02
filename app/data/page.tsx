'use client'
// app/data/page.tsx — User data & privacy controls
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

const DATA_TABLE = [
  { type: 'Name & Email', source: 'Google Sign-In', purpose: 'Account identification' },
  { type: 'Pen Name & Genre', source: 'You (during setup)', purpose: 'Personalized coaching' },
  { type: 'KDP Sales Data', source: 'File uploads', purpose: 'Sales & royalty analysis' },
  { type: 'Email Stats', source: 'MailerLite API', purpose: 'Email marketing insights' },
  { type: 'Ad Performance', source: 'Meta Ads API', purpose: 'Ad ROI analysis' },
  { type: 'Subscription Status', source: 'Stripe', purpose: 'Billing management' },
]

export default function DataPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete', { method: 'POST' })
      if (res.ok) {
        await signOut({ callbackUrl: '/?deleted=true' })
      }
    } catch {
      setDeleting(false)
    }
  }

  async function handleDisconnect(service: string) {
    setDisconnecting(service)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          service === 'mailerlite'
            ? { disconnectMailerLite: true }
            : { disconnectMeta: true }
        ),
      })
      window.location.reload()
    } catch {
      setDisconnecting(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="max-w-2xl mx-auto">

        <Link href="/dashboard" className="text-[14px] font-medium no-underline hover:underline mb-8 inline-flex items-center gap-1"
          style={{ color: '#4A7290', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
          Author<span style={{ color: '#E9A020' }}>Dash</span>
        </Link>

        <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-2" style={{ color: '#1E2D3D' }}>
          Your Data &amp; Privacy
        </h1>
        <p className="text-[14px] mb-10" style={{ color: '#6B7280' }}>
          Control your AuthorDash data.
        </p>

        {/* Section 1: What We Store */}
        <div className="rounded-xl overflow-hidden mb-8" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <div className="px-5 py-3 text-[14px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
            What Data We Store
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: '#F5F5F4' }}>
                {['Data Type', 'Source', 'Purpose'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                    style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DATA_TABLE.map((row, i) => (
                <tr key={i} className="border-t" style={{ borderColor: '#EEEBE6' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: '#1E2D3D' }}>{row.type}</td>
                  <td className="px-4 py-3" style={{ color: '#6B7280' }}>{row.source}</td>
                  <td className="px-4 py-3" style={{ color: '#6B7280' }}>{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Delete Data */}
        <div className="rounded-xl p-6 mb-8" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <h2 className="text-[18px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>Request Data Deletion</h2>
          <p className="text-[14px] mb-5" style={{ color: '#6B7280' }}>
            You can request complete deletion of your AuthorDash account and all associated data at any time.
            This cannot be undone.
          </p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-6 py-3 rounded-lg text-[14px] font-bold transition-all"
              style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
            >
              Request Account &amp; Data Deletion
            </button>
          ) : (
            <div className="rounded-xl p-5" style={{ background: '#FFF5F4', border: '1px solid rgba(249,123,107,0.3)' }}>
              <div className="text-[14px] font-semibold mb-2" style={{ color: '#F97B6B' }}>
                Are you sure? This cannot be undone.
              </div>
              <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
                This will permanently delete your account, all uploaded data, analysis history,
                settings, and disconnect all integrations.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all disabled:opacity-50"
                  style={{ background: '#F97B6B', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  {deleting ? 'Deleting...' : 'Yes, delete everything'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-5 py-2.5 rounded-lg text-[13px] font-medium"
                  style={{ background: 'white', border: '1px solid #EEEBE6', color: '#1E2D3D', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Disconnect Integrations */}
        <div className="rounded-xl p-6 mb-8" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <h2 className="text-[18px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>Disconnect Integrations</h2>
          <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
            Disconnect a service without deleting your account. This clears stored tokens and cached data.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleDisconnect('mailerlite')}
              disabled={disconnecting !== null}
              className="text-[13px] font-semibold bg-transparent border-none cursor-pointer transition-all hover:underline disabled:opacity-50"
              style={{ color: '#F97B6B' }}
            >
              {disconnecting === 'mailerlite' ? 'Disconnecting...' : 'Disconnect MailerLite'}
            </button>
            <button
              onClick={() => handleDisconnect('meta')}
              disabled={disconnecting !== null}
              className="text-[13px] font-semibold bg-transparent border-none cursor-pointer transition-all hover:underline disabled:opacity-50"
              style={{ color: '#F97B6B' }}
            >
              {disconnecting === 'meta' ? 'Disconnecting...' : 'Disconnect Meta Ads'}
            </button>
          </div>
        </div>

        {/* Section 4: Contact */}
        <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <h2 className="text-[18px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>Contact</h2>
          <p className="text-[14px]" style={{ color: '#6B7280' }}>
            Questions about your data? Email{' '}
            <a href="mailto:support@authordash.io" style={{ color: '#E9A020' }}>support@authordash.io</a>
          </p>
        </div>

        <div className="mt-14 pt-8 flex gap-6 text-[12px]" style={{ borderTop: '1px solid #EEEBE6' }}>
          <Link href="/privacy" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Privacy Policy</Link>
          <Link href="/terms" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Terms of Service</Link>
          <Link href="/dashboard" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
