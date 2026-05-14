'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import LaunchCard from '@/components/content/setup/LaunchCard'
import BookList from '@/components/content/setup/BookList'
import PinterestLinks from '@/components/content/setup/PinterestLinks'
import FrequencyPicker from '@/components/content/setup/FrequencyPicker'
import PillarEditor from '@/components/content/setup/PillarEditor'
import ReaderAvatar from '@/components/content/setup/ReaderAvatar'

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
  beaconsUrl: string | null
  authorCentral: string | null
  website: string | null
  avatar: string | null
  aesthetic: string | null
  pillars: string[] | null
}

const DEFAULT_PILLARS = ['Reader World', 'Author Voice', 'Book Moments', 'Behind the Story']

export default function SetupPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [hasLaunch, setHasLaunch] = useState(false)
  const [launchDate, setLaunchDate] = useState('')
  const [launchBookId, setLaunchBookId] = useState('')
  const [frequency, setFrequency] = useState(5)
  const [pinterestLinks, setPinterestLinks] = useState({
    bookPage: '',
    authorCentral: '',
    website: '',
    beaconsUrl: '',
  })
  const [pillars, setPillars] = useState<string[]>(DEFAULT_PILLARS)
  const [avatar, setAvatar] = useState('')
  const [aesthetic, setAesthetic] = useState('')

  // Load project + books
  useEffect(() => {
    Promise.all([
      fetch(`/api/content/projects/${projectId}`).then(r => r.json()),
      fetch('/api/books').then(r => r.json()),
    ]).then(([{ project: p }, { books: b }]) => {
      if (p) {
        setProject(p)
        setHasLaunch(p.hasLaunch)
        setLaunchDate(p.launchDate ? p.launchDate.slice(0, 10) : '')
        setLaunchBookId(p.launchBookId ?? '')
        setFrequency(p.frequency ?? 5)
        setPinterestLinks({
          bookPage: '',
          authorCentral: p.authorCentral ?? '',
          website: p.website ?? '',
          beaconsUrl: p.beaconsUrl ?? '',
        })
        setPillars(Array.isArray(p.pillars) && p.pillars.length === 4 ? p.pillars : DEFAULT_PILLARS)
        setAvatar(p.avatar ?? '')
        setAesthetic(p.aesthetic ?? '')
      }
      setBooks(b ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [projectId])

  const patch = useCallback(async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch(`/api/content/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } finally {
      setSaving(false)
    }
  }, [projectId])

  const handleLaunchChange = (change: { hasLaunch?: boolean; launchDate?: string; launchBookId?: string }) => {
    const next = {
      hasLaunch: change.hasLaunch ?? hasLaunch,
      launchDate: change.launchDate ?? launchDate,
      launchBookId: change.launchBookId ?? launchBookId,
    }
    if ('hasLaunch' in change) setHasLaunch(next.hasLaunch)
    if ('launchDate' in change) setLaunchDate(next.launchDate)
    if ('launchBookId' in change) setLaunchBookId(next.launchBookId)
    patch({
      hasLaunch: next.hasLaunch,
      launchDate: next.launchDate || null,
      launchBookId: next.launchBookId || null,
    })
  }

  const handleFrequencyChange = (v: number) => {
    setFrequency(v)
    patch({ frequency: v })
  }

  const handlePinterestChange = (key: keyof typeof pinterestLinks, value: string) => {
    setPinterestLinks(prev => ({ ...prev, [key]: value }))
  }

  const handlePinterestBlur = (key: keyof typeof pinterestLinks, value: string) => {
    if (key === 'bookPage') return // not a DB field
    patch({ [key]: value || null })
  }

  const handlePillarsChange = (next: string[]) => setPillars(next)
  const handlePillarsBlur = (next: string[]) => patch({ pillars: next })

  const handleAvatarBlur = (v: string) => patch({ avatar: v || null })
  const handleAestheticBlur = (v: string) => patch({ aesthetic: v || null })

  const handleContinue = async () => {
    await patch({ frequency, avatar: avatar || null, aesthetic: aesthetic || null, pillars })
    router.push(`/content/${projectId}/manuscript`)
  }

  const handleReset = () => {
    if (!project) return
    setHasLaunch(project.hasLaunch)
    setLaunchDate(project.launchDate ? project.launchDate.slice(0, 10) : '')
    setLaunchBookId(project.launchBookId ?? '')
    setFrequency(project.frequency ?? 5)
    setPinterestLinks({
      bookPage: '',
      authorCentral: project.authorCentral ?? '',
      website: project.website ?? '',
      beaconsUrl: project.beaconsUrl ?? '',
    })
    setPillars(Array.isArray(project.pillars) && project.pillars.length === 4 ? project.pillars : DEFAULT_PILLARS)
    setAvatar(project.avatar ?? '')
    setAesthetic(project.aesthetic ?? '')
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 48px 80px', maxWidth: 720 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 120,
              borderRadius: 4,
              background: 'var(--rule)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Begin with the{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400 }}>shape</em>
            {' '}of the month.
          </h1>
          <p style={{
            marginTop: 10,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-3)',
            lineHeight: 1.65,
            maxWidth: 520,
          }}>
            A few decisions made once. The rest of the work writes itself around them — pillars, cadence, and the launch arc baked in from day one.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 4 }}>
          <button
            onClick={handleReset}
            style={{
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'var(--ink-3)',
              background: 'transparent',
              border: '1px solid var(--rule)',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            style={{
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'var(--paper)',
              background: 'var(--ink)',
              border: '1px solid var(--ink)',
              borderRadius: 4,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.borderColor = 'var(--amber)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--ink)' }}
          >
            {saving ? 'Saving…' : 'Continue to Manuscript →'}
          </button>
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 16,
          textAlign: 'right',
        }}>
          Saving…
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <LaunchCard
          hasLaunch={hasLaunch}
          launchDate={launchDate}
          launchBookId={launchBookId}
          books={books}
          onChange={handleLaunchChange}
        />

        <BookList
          books={books}
          launchBookId={launchBookId}
          launchDate={launchDate}
        />

        <PinterestLinks
          values={pinterestLinks}
          onChange={handlePinterestChange}
          onBlur={handlePinterestBlur}
        />

        <FrequencyPicker
          value={frequency}
          onChange={handleFrequencyChange}
        />

        <PillarEditor
          pillars={pillars}
          onChange={handlePillarsChange}
          onBlur={handlePillarsBlur}
        />

        <ReaderAvatar
          avatar={avatar}
          aesthetic={aesthetic}
          onAvatarChange={setAvatar}
          onAestheticChange={setAesthetic}
          onBlur={(field, value) => {
            if (field === 'avatar') handleAvatarBlur(value)
            else handleAestheticBlur(value)
          }}
        />

      </div>

      {/* Bottom Continue */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleContinue}
          disabled={saving}
          style={{
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'var(--paper)',
            background: 'var(--ink)',
            border: '1px solid var(--ink)',
            borderRadius: 4,
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.borderColor = 'var(--amber)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--ink)' }}
        >
          Continue to Manuscript →
        </button>
      </div>
    </div>
  )
}
