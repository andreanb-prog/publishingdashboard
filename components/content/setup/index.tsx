'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LaunchCard from './LaunchCard'
import BookList from './BookList'
import PinterestLinks from './PinterestLinks'
import FrequencyPicker from './FrequencyPicker'
import PillarEditor from './PillarEditor'
import ReaderAvatar from './ReaderAvatar'

interface Book {
  id: string
  title: string
  asin: string | null
  seriesName: string | null
  tropes: string[]
  customTropes: string[]
  colorCode: string | null
}

interface Project {
  id: string
  name: string
  hasLaunch: boolean
  launchDate: string | null
  launchBookId: string | null
  frequency: number
  bookPageUrl: string | null
  authorCentral: string | null
  website: string | null
  beaconsUrl: string | null
  pillars: string[] | null
  avatar: string | null
  aesthetic: string | null
}

interface Props {
  projectId: string
  initialProject: Project
  initialBooks: Book[]
}

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

export default function SetupForm({ projectId, initialProject, initialBooks }: Props) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [saving, setSaving] = useState(false)

  const save = useCallback(async (patch: Record<string, unknown>) => {
    setProject(prev => ({ ...prev, ...patch }))
    try {
      await fetch(`/api/content/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch {
      // silent — auto-save is best effort
    }
  }, [projectId])

  const handleContinue = async () => {
    setSaving(true)
    router.push(`/content/${projectId}/manuscript`)
  }

  const handleReset = () => {
    if (confirm('Reset this setup to the last saved state?')) {
      window.location.reload()
    }
  }

  const launchDateStr = project.launchDate
    ? new Date(project.launchDate).toISOString().split('T')[0]
    : ''

  const pillars: string[] = Array.isArray(project.pillars) ? project.pillars : []

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <div style={{ ...monoLabel, marginBottom: 12 }}>
            STEP 01 · PROJECT SETUP
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            Begin with the{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400 }}>shape</em>
            {' '}of the month.
          </h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-3)',
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 480,
          }}>
            A few decisions made once. The rest of the work writes itself around them — pillars, cadence, and the launch arc baked in from day one.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 24, paddingTop: 28 }}>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid var(--rule)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--ink-3)',
              transition: 'border-color 0.15s',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            style={{
              padding: '8px 18px',
              fontSize: 12,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              border: 'none',
              borderRadius: 4,
              background: 'var(--ink)',
              color: 'var(--paper)',
              opacity: saving ? 0.7 : 1,
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--amber)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)' }}
          >
            Continue to Manuscript →
          </button>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 1. Launch question */}
        <LaunchCard
          hasLaunch={project.hasLaunch}
          launchDate={launchDateStr}
          launchBookId={project.launchBookId ?? ''}
          books={initialBooks}
          onChange={patch => {
            const dbPatch: Record<string, unknown> = {}
            if ('hasLaunch' in patch) dbPatch.hasLaunch = patch.hasLaunch
            if ('launchBookId' in patch) dbPatch.launchBookId = patch.launchBookId
            if ('launchDate' in patch) dbPatch.launchDate = patch.launchDate
            save(dbPatch)
          }}
        />

        {/* 2. Your books */}
        <BookList
          books={initialBooks}
          launchBookId={project.launchBookId ?? ''}
          launchDate={launchDateStr}
        />

        {/* 3. Pinterest link strategy */}
        <PinterestLinks
          values={{
            bookPage: project.bookPageUrl ?? '',
            authorCentral: project.authorCentral ?? '',
            website: project.website ?? '',
            beaconsUrl: project.beaconsUrl ?? '',
          }}
          onChange={(key, value) => {
            setProject(prev => ({
              ...prev,
              [key === 'bookPage' ? 'bookPageUrl' : key]: value,
            }))
          }}
          onBlur={(key, value) => {
            save({ [key === 'bookPage' ? 'bookPageUrl' : key]: value })
          }}
        />

        {/* 4. Cadence */}
        <FrequencyPicker
          value={project.frequency}
          onChange={v => save({ frequency: v })}
        />

        {/* 5. Content pillars */}
        <PillarEditor
          pillars={pillars}
          onChange={updated => setProject(prev => ({ ...prev, pillars: updated }))}
          onBlur={updated => save({ pillars: updated })}
        />

        {/* 6. Reader avatar */}
        <ReaderAvatar
          avatar={project.avatar ?? ''}
          aesthetic={project.aesthetic ?? ''}
          onAvatarChange={v => setProject(prev => ({ ...prev, avatar: v }))}
          onAestheticChange={v => setProject(prev => ({ ...prev, aesthetic: v }))}
          onBlur={(field, value) => save({ [field]: value })}
        />

      </div>
    </div>
  )
}
