'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProjectPage() {
  const router = useRouter()

  useEffect(() => {
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    fetch('/api/content/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Content — ${monthYear}` }),
    })
      .then(r => r.json())
      .then(({ project }) => {
        if (project?.id) router.push(`/content/${project.id}/setup`)
        else router.push('/content')
      })
      .catch(() => router.push('/content'))
  }, [router])

  return (
    <div style={{
      padding: '48px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 14,
      color: 'var(--ink-3)',
    }}>
      <span style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '2px solid var(--amber)',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      Creating your project…
    </div>
  )
}
