'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  userName: string | null
  tokenError: string | null
}

export function ConnectExtensionClient({ token, userName, tokenError }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleConnect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/extension/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionToken: token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Connection failed')

      // Tell the content script the connection succeeded so it can relay to the extension
      window.postMessage(
        { type: 'AUTHORDASH_CONNECTED', extensionKey: data.extensionKey, userId: data.userId, userName: data.userName },
        '*'
      )
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#F97B6B]/20 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F97B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#1E2D3D] mb-2">Link invalid</h1>
          <p className="text-[#1E2D3D]/60 text-sm">{tokenError}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#6EBF8B] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1E2D3D] mb-2">You&apos;re connected!</h1>
          <p className="text-[#1E2D3D]/60 text-sm mb-6">
            AuthorDash Sync is now active. You can close this tab and return to the extension.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#E9A020] hover:bg-[#d4911c] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full">
        {/* Dog illustration placeholder */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#E9A020]/20 border-2 border-[#E9A020]/40 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#E9A020]/60" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-[#1E2D3D] text-center mb-2">
          AuthorDash Sync is ready to connect
        </h1>
        {userName && (
          <p className="text-center text-[#1E2D3D]/50 text-sm mb-4">Welcome, {userName}</p>
        )}
        {!userName && <div className="mb-4" />}

        {/* Prominent security note */}
        <div className="flex items-start gap-3 bg-[#6EBF8B]/10 border border-[#6EBF8B]/30 rounded-lg px-4 py-3 mb-6">
          <span className="text-[#6EBF8B] text-base leading-none mt-0.5 flex-shrink-0">🔒</span>
          <p className="text-[#1E2D3D] text-sm font-medium leading-snug">
            Read-only access. AuthorDash Sync can never post, purchase, or change anything on your behalf.
          </p>
        </div>

        <p className="text-[#1E2D3D]/70 text-sm mb-4">
          This will give the AuthorDash Chrome extension read access to your data from:
        </p>

        <ul className="space-y-2 mb-8">
          {['Amazon KDP', 'Meta Ads Manager', 'BookClicker'].map((platform) => (
            <li key={platform} className="flex items-center gap-3 text-[#1E2D3D] text-sm">
              <span className="w-2 h-2 rounded-full bg-[#E9A020] flex-shrink-0" />
              {platform}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-[#F97B6B] text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-[#E9A020] hover:bg-[#d4911c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Connecting…' : 'Yes, connect me →'}
        </button>
      </div>
    </div>
  )
}
