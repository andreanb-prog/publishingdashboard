'use client'

import { useState, useEffect } from 'react'

interface StoryPostProject {
  id: string
  name: string
  hasLaunch: boolean
  launchDate: string | null
  frequency: number
  createdAt: string
  _count?: { posts: number }
}

export default function StoryPostProjectsPage() {
  const [projects, setProjects] = useState<StoryPostProject[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    fetch('/api/content/projects')
      .then(r => r.json())
      .then(({ projects: p }) => { setProjects(p ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const createProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/content/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const { project } = await res.json()
      if (project) {
        setProjects(prev => [project, ...prev])
        setNewName('')
        setShowNew(false)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 720 }}>

      {/* Hero headline */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--ink)',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Thirty{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 400 }}>intentional</em>
          {' '}days.
        </h1>
        <p style={{
          marginTop: 12,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15,
          color: 'var(--ink-3)',
          lineHeight: 1.6,
          maxWidth: 480,
        }}>
          A content calendar built around your book's arc — not a random queue of posts.
        </p>
      </div>

      {/* Project list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              height: 72,
              borderRadius: 4,
              background: 'var(--rule)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : projects.length === 0 && !showNew ? (
        <div style={{
          border: '1px dashed var(--rule)',
          borderRadius: 8,
          padding: '40px 32px',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink-4)',
            marginBottom: 16,
          }}>
            No projects yet — start your first one.
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{
              background: 'var(--amber)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Start a new project
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {projects.map(p => (
            <a
              key={p.id}
              href={`/content/${p.id}/setup`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                textDecoration: 'none',
                color: 'var(--ink)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--rule)')}
            >
              <div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--ink-4)',
                  marginTop: 4,
                }}>
                  {p._count?.posts ?? 0} posts
                  {p.hasLaunch && p.launchDate
                    ? ` · launch ${new Date(p.launchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : ''}
                </div>
              </div>
              <div style={{ fontSize: 18, color: 'var(--ink-4)', lineHeight: 1 }}>→</div>
            </a>
          ))}
        </div>
      )}

      {/* New project form */}
      {showNew && (
        <div style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          padding: '24px',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 12,
          }}>
            New project
          </div>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createProject() }}
            placeholder="e.g. My Off-Limits Roommate — Launch Arc"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'var(--ink)',
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 4,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={createProject}
              disabled={!newName.trim() || creating}
              style={{
                background: 'var(--amber)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: (!newName.trim() || creating) ? 0.5 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {creating ? 'Creating…' : 'Create project'}
            </button>
            <button
              onClick={() => { setShowNew(false); setNewName('') }}
              style={{
                background: 'transparent',
                color: 'var(--ink-3)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                padding: '10px 20px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Start new button (when projects exist) */}
      {projects.length > 0 && !showNew && (
        <button
          onClick={() => setShowNew(true)}
          style={{
            background: 'transparent',
            color: 'var(--amber)',
            border: '1px solid var(--amber)',
            borderRadius: 4,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          + New project
        </button>
      )}
    </div>
  )
}
