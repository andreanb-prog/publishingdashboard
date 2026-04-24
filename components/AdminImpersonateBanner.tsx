'use client'
// components/AdminImpersonateBanner.tsx
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminImpersonateBanner({ email }: { email: string }) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exitImpersonation() {
    setExiting(true)
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    router.refresh()
    setExiting(false)
  }

  return (
    <div
      className="w-full flex items-center justify-center gap-3 px-4 py-2 text-[12px] font-semibold z-50"
      style={{ background: '#D97706', color: '#1E2D3D' }}
    >
      <span>
        Admin View: viewing as <strong>{email}</strong>
      </span>
      <button
        onClick={exitImpersonation}
        disabled={exiting}
        className="px-3 py-1 rounded-[5px] text-[11px] font-bold border-none cursor-pointer disabled:opacity-60 transition-opacity"
        style={{ background: '#1E2D3D', color: '#D97706' }}
      >
        {exiting ? 'Exiting…' : 'Exit Admin View'}
      </button>
    </div>
  )
}
