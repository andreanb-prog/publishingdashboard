'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Book {
  id: string
  title: string
  coverUrl: string | null
  genre: string | null
  subgenre: string | null
  tropes: string[]
  blurb: string | null
  seriesName: string | null
  characterNotes: string | null
}

interface VisualBrief {
  lightQuality: string
  colorPalette: string
  setting: string
  mood: string
  coupleEnergy: string
  midjourneyStyleString: string
  summary: string
}

interface BrandProfile {
  readerAvatar: string
  coreFeelings: string[]
  voiceProfile: string
}

interface ExtractedProfile {
  readerAvatar: string
  coreFeelings: string[]
  voiceProfile: string
  readerName: string
  confidence: 'high' | 'medium' | 'low'
}

interface ContentPost {
  id: string
  day: number
  week: number
  phase: string
  pillar: string
  hook: string
  caption: string
  imagePrompt: string
  midjourneyPrompt: string
  freepikPrompt: string
  platform: string
  scheduledDate: string
  status: string
}

interface StoredSession {
  bookId: string | null
  currentPhase: number
  pinterestUrl: string | null
  visualBrief: VisualBrief | null
  midjourneyStyleString: string | null
  profileId: string | null
  campaignId: string | null
  contentProfile: {
    readerAvatar: string
    coreFeelings: string[]
    voiceProfile: string
  } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  "What's your reader's name, and what does her life look like?",
  "What does she reach for when she needs to escape?",
  "What line from your book would she screenshot and send to a friend?",
  "Are you warm and open, dry and witty — or somewhere in between?",
  "What do you believe about love?",
]

const PHASE_COLORS: Record<string, string> = {
  awareness: '#60A5FA',
  connection: '#6EBF8B',
  engagement: '#E9A020',
  conversion: '#F97B6B',
}

const PHASE_BG: Record<string, string> = {
  awareness: 'rgba(96,165,250,0.12)',
  connection: 'rgba(110,191,139,0.12)',
  engagement: 'rgba(233,160,32,0.12)',
  conversion: 'rgba(249,123,107,0.12)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-1 rounded text-[11px] font-semibold transition-all"
      style={{
        background: copied ? '#6EBF8B' : '#E9A020',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function MicButton({ onResult }: { onResult: (text: string) => void }) {
  const [recording, setRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const toggle = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported in this browser.'); return }
    if (recording) {
      recRef.current?.stop()
      setRecording(false)
      return
    }
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => { onResult(e.results[0][0].transcript) }
    recognition.onend = () => setRecording(false)
    recRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  return (
    <button
      onClick={toggle}
      title={recording ? 'Stop recording' : 'Voice input'}
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
      style={{
        background: recording ? '#F97B6B' : '#FFF8F0',
        border: `1px solid ${recording ? '#F97B6B' : '#E8E0D8'}`,
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      🎤
    </button>
  )
}

function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded" style={{ background: '#E8E0D8', width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}

function PhaseStepHeader({
  number,
  title,
  subtitle,
  isActive,
  isCompleted,
  onEdit,
}: {
  number: number
  title: string
  subtitle: string
  isActive: boolean
  isCompleted: boolean
  onEdit?: () => void
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
        style={{
          background: isCompleted ? '#6EBF8B' : isActive ? '#E9A020' : '#E8E0D8',
          color: isCompleted || isActive ? '#fff' : '#6B7280',
        }}
      >
        {isCompleted ? '✓' : number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px]" style={{ color: '#1E2D3D' }}>{title}</div>
        <div className="text-[12px]" style={{ color: '#6B7280' }}>{subtitle}</div>
      </div>
      {isCompleted && onEdit && (
        <button
          onClick={onEdit}
          className="px-3 py-1 rounded text-[12px] font-medium transition-all"
          style={{ background: 'transparent', border: '1px solid #E8E0D8', color: '#6B7280', cursor: 'pointer' }}
        >
          Edit
        </button>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPlannerPage() {
  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4>(1)
  const [completedPhases, setCompletedPhases] = useState<number[]>([])

  // Phase 1
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [pinterestUrl, setPinterestUrl] = useState('')
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [visualBrief, setVisualBrief] = useState<VisualBrief | null>(null)
  const [editingBrief, setEditingBrief] = useState<VisualBrief | null>(null)
  const [briefExpanded, setBriefExpanded] = useState(true)

  // Phase 2
  const [answers, setAnswers] = useState<string[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [currentQ, setCurrentQ] = useState(0)
  const [profile, setProfile] = useState<BrandProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Brand guide autofill
  const [brandGuideModal, setBrandGuideModal] = useState(false)
  const [brandGuideTab, setBrandGuideTab] = useState<'paste' | 'upload'>('paste')
  const [brandGuideText, setBrandGuideText] = useState('')
  const [brandGuideFile, setBrandGuideFile] = useState<File | null>(null)
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null)
  const [editingExtracted, setEditingExtracted] = useState<ExtractedProfile | null>(null)
  const brandGuideFileRef = useRef<HTMLInputElement>(null)

  // Phase 3
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Session restore
  const [sessionCheckDone, setSessionCheckDone] = useState(false)
  const [savedSession, setSavedSession] = useState<StoredSession | null>(null)
  const [showRestoreBanner, setShowRestoreBanner] = useState(false)

  // Phase 4
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set())
  const [tailwindModal, setTailwindModal] = useState(false)
  const [tailwindKey, setTailwindKey] = useState('')
  const [tailwindConnected, setTailwindConnected] = useState(false)
  const [tailwindConnecting, setTailwindConnecting] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleResults, setScheduleResults] = useState<Record<string, boolean>>({})
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null)

  // Edit-phase flow
  const [returnToPhase, setReturnToPhase] = useState<1 | 2 | 3 | 4 | null>(null)
  const [editWarningDismissed, setEditWarningDismissed] = useState(false)

  // Load books
  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(({ books: b }) => {
        setBooks(b ?? [])
        setBooksLoading(false)
      })
      .catch(() => setBooksLoading(false))
  }, [])

  // Load saved session on mount
  useEffect(() => {
    fetch('/api/content/session')
      .then(r => r.json())
      .then(({ session }) => {
        setSavedSession(session ?? null)
        setSessionCheckDone(true)
      })
      .catch(() => setSessionCheckDone(true))
  }, [])

  // Apply session restore once books and session are both ready
  useEffect(() => {
    if (!sessionCheckDone || booksLoading || !savedSession) return

    const book = savedSession.bookId ? books.find(b => b.id === savedSession.bookId) ?? null : null
    if (book) setSelectedBook(book)
    if (savedSession.pinterestUrl) setPinterestUrl(savedSession.pinterestUrl)
    if (savedSession.visualBrief) {
      setVisualBrief(savedSession.visualBrief)
      setEditingBrief(savedSession.visualBrief)
    }

    const phase = Math.min(4, Math.max(1, savedSession.currentPhase)) as 1 | 2 | 3 | 4
    const completed: number[] = []
    if (phase >= 2) completed.push(1)
    if (phase >= 3) { completed.push(2); if (savedSession.contentProfile) setProfile(savedSession.contentProfile) }
    if (phase >= 4) completed.push(3)
    if (completed.length > 0) setCompletedPhases(completed)
    setActivePhase(phase)

    setShowRestoreBanner(true)
    setSavedSession(null)
  }, [sessionCheckDone, booksLoading, savedSession, books])

  // Auto-dismiss restore banner after 3 seconds
  useEffect(() => {
    if (!showRestoreBanner) return
    const t = setTimeout(() => setShowRestoreBanner(false), 3000)
    return () => clearTimeout(t)
  }, [showRestoreBanner])

  // Check Tailwind connection
  useEffect(() => {
    fetch('/api/content/tailwind-connect')
      .then(r => r.json())
      .then(({ connected }) => setTailwindConnected(!!connected))
      .catch(() => {})
  }, [])

  // Load existing campaign if any
  useEffect(() => {
    if (!selectedBook) return
    fetch(`/api/content/campaign?bookId=${selectedBook.id}`)
      .then(r => r.json())
      .then(({ posts: p }) => {
        if (p?.length > 0) {
          setPosts(p)
          setCampaignId(p[0].campaignId)
          const approved = new Set<string>(p.filter((x: ContentPost) => x.status === 'approved' || x.status === 'scheduled').map((x: ContentPost) => x.id))
          setApprovedIds(approved)
          setCompletedPhases(prev => Array.from(new Set([...prev, 3])))
          setActivePhase(4)
        }
      })
      .catch(() => {})
  }, [selectedBook])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [answers, currentQ])

  const saveSession = (nextPhase: number, overrideCampaignId?: string) => {
    fetch('/api/content/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: selectedBook?.id ?? null,
        currentPhase: nextPhase,
        pinterestUrl: pinterestUrl || null,
        visualBrief: editingBrief,
        midjourneyStyleString: editingBrief?.midjourneyStyleString ?? null,
        campaignId: overrideCampaignId ?? campaignId,
      }),
    }).catch(() => {})
  }

  const completePhase = (n: number) => {
    setCompletedPhases(prev => Array.from(new Set([...prev, n])))
    setActivePhase((n + 1) as 1 | 2 | 3 | 4)
  }

  // ── Phase 1: Analyze Pinterest ────────────────────────────────────────────

  const handleAnalyzePinterest = async () => {
    if (!pinterestUrl.trim() || !selectedBook) return
    setAnalyzeLoading(true)
    try {
      const res = await fetch('/api/content/analyze-pinterest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pinterestUrl }),
      })
      const { brief, error } = await res.json()
      if (error) { alert(error); return }
      setVisualBrief(brief)
      setEditingBrief(brief)
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const handlePhase1Complete = () => {
    if (!selectedBook) return
    setCompletedPhases(prev => Array.from(new Set([...prev, 1])))
    const next: 1 | 2 | 3 | 4 = returnToPhase ?? 2
    setActivePhase(next)
    setReturnToPhase(null)
    setEditWarningDismissed(false)
    saveSession(next)
  }

  // ── Phase 2: Brand Voice ──────────────────────────────────────────────────

  const submitAnswer = useCallback(() => {
    if (!currentAnswer.trim()) return
    const newAnswers = [...answers, currentAnswer.trim()]
    setAnswers(newAnswers)
    setCurrentAnswer('')

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1)
    } else {
      // All answered — generate profile
      setProfileLoading(true)
      fetch('/api/content/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook?.id,
          answers: newAnswers,
          visualBrief: editingBrief,
          midjourneyStyle: editingBrief?.midjourneyStyleString ?? '',
        }),
      })
        .then(r => r.json())
        .then(({ profile: p, error }) => {
          if (error) { alert(error); return }
          setProfile(p)
          setProfileLoading(false)
        })
        .catch(() => setProfileLoading(false))
    }
  }, [answers, currentAnswer, currentQ, selectedBook, editingBrief])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer() }
  }

  const handlePhase2Complete = () => {
    if (!profile) return
    setCompletedPhases(prev => Array.from(new Set([...prev, 2])))
    const next: 1 | 2 | 3 | 4 = returnToPhase ?? 3
    setActivePhase(next)
    setReturnToPhase(null)
    setEditWarningDismissed(false)
    saveSession(next)
  }

  const handleExtractBrandVoice = async () => {
    setExtractLoading(true)
    setExtractError(null)
    try {
      let res: Response
      if (brandGuideTab === 'upload' && brandGuideFile) {
        const formData = new FormData()
        formData.append('file', brandGuideFile)
        res = await fetch('/api/content/extract-brand-voice', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/content/extract-brand-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: brandGuideText }),
        })
      }
      const { profile: p, error } = await res.json()
      if (error) { setExtractError(error); return }
      setExtractedProfile(p)
      setEditingExtracted(p)
      setBrandGuideModal(false)
    } catch {
      setExtractError("Couldn't extract enough — try the interview instead.")
    } finally {
      setExtractLoading(false)
    }
  }

  const handleUseExtractedProfile = async () => {
    if (!editingExtracted || !selectedBook) return
    setProfileLoading(true)
    try {
      const res = await fetch('/api/content/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook.id,
          readerAvatar: editingExtracted.readerAvatar,
          coreFeelings: editingExtracted.coreFeelings,
          voiceProfile: editingExtracted.voiceProfile,
          visualBrief: editingBrief,
          midjourneyStyle: editingBrief?.midjourneyStyleString ?? '',
        }),
      })
      const { profile: p, error } = await res.json()
      if (error) { alert(error); return }
      setProfile(p)
      setExtractedProfile(null)
      setEditingExtracted(null)
      completePhase(2)
      saveSession(3)
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Phase 3: Generate Campaign ────────────────────────────────────────────

  const handleGenerateCampaign = async () => {
    if (!selectedBook || !profile) return
    setCampaignLoading(true)
    try {
      const res = await fetch('/api/content/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook.id,
          readerAvatar: profile.readerAvatar,
          coreFeelings: profile.coreFeelings,
          voiceProfile: profile.voiceProfile,
          visualBrief: editingBrief,
          midjourneyStyle: editingBrief?.midjourneyStyleString ?? '',
        }),
      })
      const { posts: p, campaignId: cid, error } = await res.json()
      if (error) { alert(error); return }
      setPosts(p ?? [])
      setCampaignId(cid)
      completePhase(3)
      saveSession(4, cid)
    } finally {
      setCampaignLoading(false)
    }
  }

  // ── Phase 4: Review & Schedule ────────────────────────────────────────────

  const toggleApprove = async (post: ContentPost) => {
    const newStatus = approvedIds.has(post.id) ? 'draft' : 'approved'
    setApprovedIds(prev => {
      const next = new Set(prev)
      if (next.has(post.id)) next.delete(post.id)
      else next.add(post.id)
      return next
    })
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p))
    await fetch('/api/content/campaign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, status: newStatus }),
    })
  }

  const approveAll = async () => {
    const ids = posts.map(p => p.id)
    setApprovedIds(new Set(ids))
    setPosts(prev => prev.map(p => ({ ...p, status: 'approved' })))
    await Promise.all(ids.map(id =>
      fetch('/api/content/campaign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, status: 'approved' }),
      })
    ))
  }

  const updateCaption = async (post: ContentPost, caption: string) => {
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, caption } : p))
    await fetch('/api/content/campaign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, caption }),
    })
  }

  const regeneratePost = async (post: ContentPost) => {
    if (!selectedBook || !profile) return
    setRegeneratingId(post.id)
    try {
      const res = await fetch('/api/content/regenerate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          bookId: selectedBook.id,
          phase: post.phase,
          pillar: post.pillar,
          platform: post.platform,
          day: post.day,
          readerAvatar: profile.readerAvatar,
          voiceProfile: profile.voiceProfile,
          coreFeelings: profile.coreFeelings,
        }),
      })
      const { hook, caption, error } = await res.json()
      if (error) { alert(error); return }
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, hook, caption, midjourneyPrompt: '' } : p))
    } finally {
      setRegeneratingId(null)
    }
  }

  const generatePrompt = async (post: ContentPost) => {
    setGeneratingPromptId(post.id)
    try {
      const res = await fetch('/api/content/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          hook: post.hook,
          pillar: post.pillar,
          phase: post.phase,
          midjourneyStyleString: editingBrief?.midjourneyStyleString ?? '',
        }),
      })
      const { midjourneyPrompt, error } = await res.json()
      if (error) { alert(error); return }
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, midjourneyPrompt } : p))
    } finally {
      setGeneratingPromptId(null)
    }
  }

  const connectTailwind = async () => {
    if (!tailwindKey.trim()) return
    setTailwindConnecting(true)
    try {
      const res = await fetch('/api/content/tailwind-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tailwindKey }),
      })
      const { connected } = await res.json()
      setTailwindConnected(connected)
      if (connected) setTailwindModal(false)
    } finally {
      setTailwindConnecting(false)
    }
  }

  const scheduleApproved = async () => {
    const approvedList = posts.filter(p => approvedIds.has(p.id))
    if (approvedList.length === 0) return
    setScheduleLoading(true)
    try {
      const res = await fetch('/api/content/schedule-tailwind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: approvedList.map(p => p.id) }),
      })
      const { results } = await res.json()
      const map: Record<string, boolean> = {}
      for (const r of results ?? []) map[r.postId] = r.success
      setScheduleResults(map)
      setPosts(prev => prev.map(p => map[p.id] ? { ...p, status: 'scheduled' } : p))
    } finally {
      setScheduleLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const card = "bg-white rounded-xl p-6 mb-4" + " " + "border"
  const cardStyle = { borderColor: '#EEEBE6', borderWidth: '0.5px' }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#FFF8F0' }}>
      {/* Page header */}
      <div className="px-6 pt-8 pb-2 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Content Planner
            </h1>
            <p className="text-[14px] mt-1" style={{ color: '#6B7280' }}>
              Build a 30-day campaign rooted in your reader's world.
            </p>
          </div>
          {/* Tailwind connect button */}
          <button
            onClick={() => setTailwindModal(true)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              background: tailwindConnected ? 'rgba(110,191,139,0.12)' : 'white',
              border: `1px solid ${tailwindConnected ? '#6EBF8B' : '#E8E0D8'}`,
              color: tailwindConnected ? '#6EBF8B' : '#1E2D3D',
              cursor: 'pointer',
            }}
          >
            {tailwindConnected ? '✓ Tailwind Connected' : 'Connect Tailwind'}
          </button>
        </div>
      </div>

      {/* Restore banner */}
      {showRestoreBanner && (
        <div className="max-w-4xl mx-auto px-6 mb-1">
          <div
            className="px-4 py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-between"
            style={{
              background: 'rgba(233,160,32,0.10)',
              border: '1px solid rgba(233,160,32,0.3)',
              color: '#E9A020',
            }}
          >
            <span>Welcome back — your campaign is right where you left it.</span>
            <button
              onClick={() => setShowRestoreBanner(false)}
              style={{ background: 'none', border: 'none', color: '#E9A020', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 12px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Edit-phase warning banner */}
      {returnToPhase !== null && posts.length > 0 && !editWarningDismissed && (
        <div className="max-w-4xl mx-auto px-6 mb-1">
          <div
            className="px-4 py-2.5 rounded-lg text-[13px] flex items-center justify-between"
            style={{ background: 'rgba(233,160,32,0.10)', border: '1px solid rgba(233,160,32,0.3)', color: '#1E2D3D' }}
          >
            <span>Editing this won&apos;t update your existing campaign posts. Generate a new campaign to apply changes.</span>
            <button
              onClick={() => setEditWarningDismissed(true)}
              style={{ background: 'none', border: 'none', color: '#1E2D3D', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 12px', flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-4 space-y-4">

        {/* ─── PHASE 1 ────────────────────────────────────────────────────── */}
        <div className={card} style={cardStyle}>
          <PhaseStepHeader
            number={1}
            title="Book & Pinterest Setup"
            subtitle={completedPhases.includes(1) ? `${selectedBook?.title} · Visual brief locked` : 'Select your book and share your Pinterest aesthetic'}
            isActive={activePhase === 1}
            isCompleted={completedPhases.includes(1)}
            onEdit={() => { setReturnToPhase(activePhase); setEditWarningDismissed(false); setActivePhase(1) }}
          />

          {activePhase === 1 && (
            <div className="mt-6 space-y-5">
              {/* Book selector */}
              <div>
                <label className="block text-[13px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>Your Book</label>
                {booksLoading ? (
                  <LoadingSkeleton lines={1} />
                ) : books.length === 0 ? (
                  <div className="text-[13px] py-3 px-4 rounded-lg" style={{ background: '#FFF8F0', color: '#6B7280', border: '1px dashed #E8E0D8' }}>
                    No books found.{' '}
                    <a href="/dashboard" style={{ color: '#E9A020' }}>Add a book to your catalog →</a>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {books.map(book => (
                      <button
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className="flex items-center gap-3 p-3 rounded-lg text-left transition-all w-full"
                        style={{
                          background: selectedBook?.id === book.id ? 'rgba(233,160,32,0.08)' : 'white',
                          border: `1.5px solid ${selectedBook?.id === book.id ? '#E9A020' : '#EEEBE6'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 rounded flex items-center justify-center text-[18px]" style={{ background: '#FFF8F0' }}>📚</div>
                        )}
                        <div>
                          <div className="text-[14px] font-semibold" style={{ color: '#1E2D3D' }}>{book.title}</div>
                          {book.genre && <div className="text-[12px]" style={{ color: '#6B7280' }}>{book.genre}{book.seriesName ? ` · ${book.seriesName}` : ''}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pinterest URL */}
              {selectedBook && (
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>Pinterest Board URL</label>
                  <p className="text-[12px] mb-2" style={{ color: '#6B7280' }}>
                    Share a board of images that feel like your book's world — settings, light, mood, couples. We'll use it to lock your visual style.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={pinterestUrl}
                      onChange={e => setPinterestUrl(e.target.value)}
                      placeholder="https://pinterest.com/yourname/board-name/"
                      className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
                      style={{ border: '1px solid #E8E0D8', background: 'white', color: '#1E2D3D' }}
                    />
                    <button
                      onClick={handleAnalyzePinterest}
                      disabled={!pinterestUrl.trim() || analyzeLoading}
                      className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50"
                      style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      {analyzeLoading ? 'Analyzing…' : 'Analyze →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Brief result */}
              {analyzeLoading && (
                <div className="p-4 rounded-xl" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                  <LoadingSkeleton lines={5} />
                </div>
              )}

              {editingBrief && !analyzeLoading && (
                <div className="rounded-xl overflow-hidden" style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8' }}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setBriefExpanded(v => !v)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Visual Brief</span>
                    <span className="text-[12px]" style={{ color: '#6B7280' }}>{briefExpanded ? '▲ Collapse' : '▼ Expand'}</span>
                  </button>

                  {briefExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-[13px]" style={{ color: '#1E2D3D' }}>{editingBrief.summary}</p>
                      {(
                        [
                          ['Light Quality', 'lightQuality'],
                          ['Color Palette', 'colorPalette'],
                          ['Setting', 'setting'],
                          ['Mood', 'mood'],
                          ['Couple Energy', 'coupleEnergy'],
                        ] as [string, keyof VisualBrief][]
                      ).map(([label, key]) => (
                        <div key={key}>
                          <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>{label}</div>
                          <input
                            type="text"
                            value={String(editingBrief[key] ?? '')}
                            onChange={e => setEditingBrief(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                            className="w-full px-3 py-1.5 rounded text-[13px] outline-none"
                            style={{ border: '1px solid #E8E0D8', background: 'white', color: '#1E2D3D' }}
                          />
                        </div>
                      ))}

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center justify-between" style={{ color: '#6B7280' }}>
                          <span>Midjourney Style String</span>
                          <CopyButton text={editingBrief.midjourneyStyleString} />
                        </div>
                        <pre
                          className="text-[11px] p-3 rounded overflow-x-auto"
                          style={{ background: '#1E2D3D', color: '#E9A020', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                        >
                          {editingBrief.midjourneyStyleString}
                        </pre>
                        <textarea
                          value={editingBrief.midjourneyStyleString}
                          onChange={e => setEditingBrief(prev => prev ? { ...prev, midjourneyStyleString: e.target.value } : prev)}
                          rows={2}
                          className="w-full mt-1 px-3 py-1.5 rounded text-[12px] outline-none"
                          style={{ border: '1px solid #E8E0D8', background: 'white', color: '#1E2D3D', fontFamily: 'monospace', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 1 CTA */}
              {selectedBook && (
                <button
                  onClick={handlePhase1Complete}
                  disabled={!selectedBook}
                  className="w-full py-3 rounded-xl text-[14px] font-bold transition-all disabled:opacity-40"
                  style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Continue to Brand Voice →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── PHASE 2 ────────────────────────────────────────────────────── */}
        <div className={card} style={cardStyle}>
          <PhaseStepHeader
            number={2}
            title="Brand Voice Setup"
            subtitle={completedPhases.includes(2) && profile ? `Reader: ${profile.readerAvatar.slice(0, 60)}…` : 'A short conversation to lock your reader and voice'}
            isActive={activePhase === 2}
            isCompleted={completedPhases.includes(2)}
            onEdit={() => { setReturnToPhase(activePhase); setEditWarningDismissed(false); setActivePhase(2) }}
          />

          {activePhase === 2 && (
            <div className="mt-6">

              {/* ── Extracted profile results card ────────────────────────── */}
              {extractedProfile && editingExtracted && !profileLoading && (
                <div className="rounded-xl p-5 mb-4 space-y-4" style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8' }}>
                  <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Here's what we pulled from your brand guide:</div>

                  {/* Reader Avatar */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#E9A020' }}>
                      Reader Avatar{editingExtracted.readerName ? ` — ${editingExtracted.readerName}` : ''}
                    </div>
                    <textarea
                      value={editingExtracted.readerAvatar}
                      onChange={e => setEditingExtracted(prev => prev ? { ...prev, readerAvatar: e.target.value } : prev)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                      style={{ border: '1px solid #E8E0D8', background: 'white', color: '#1E2D3D' }}
                    />
                  </div>

                  {/* Core Feelings */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#E9A020' }}>5 Core Feelings</div>
                    <div className="flex flex-wrap gap-2">
                      {editingExtracted.coreFeelings.map((f, i) => (
                        <input
                          key={i}
                          value={f}
                          size={Math.max(f.length + 2, 12)}
                          onChange={e => setEditingExtracted(prev => {
                            if (!prev) return prev
                            const feelings = [...prev.coreFeelings]
                            feelings[i] = e.target.value
                            return { ...prev, coreFeelings: feelings }
                          })}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium outline-none text-center"
                          style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020', border: '1px solid rgba(233,160,32,0.3)' }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Voice Profile */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#E9A020' }}>Voice Profile</div>
                    <textarea
                      value={editingExtracted.voiceProfile}
                      onChange={e => setEditingExtracted(prev => prev ? { ...prev, voiceProfile: e.target.value } : prev)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                      style={{ border: '1px solid #E8E0D8', background: 'white', color: '#1E2D3D' }}
                    />
                  </div>

                  {/* Low confidence warning */}
                  {editingExtracted.confidence === 'low' && (
                    <p className="text-[12px]" style={{ color: '#F97B6B' }}>
                      Low confidence — the guide may not have had complete brand information. Review the fields above before continuing.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={handleUseExtractedProfile}
                      className="w-full py-3 rounded-xl text-[14px] font-bold transition-all"
                      style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      Looks good — use this
                    </button>
                    <button
                      onClick={() => { setExtractedProfile(null); setEditingExtracted(null) }}
                      className="w-full text-center text-[13px] py-1.5"
                      style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Edit answers instead
                    </button>
                  </div>
                </div>
              )}

              {/* Loading skeleton while saving extracted profile */}
              {profileLoading && extractedProfile && (
                <div className="p-4 rounded-xl mb-4" style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8' }}>
                  <LoadingSkeleton lines={4} />
                  <p className="text-[12px] text-center animate-pulse mt-3" style={{ color: '#6B7280' }}>Saving your brand voice…</p>
                </div>
              )}

              {/* ── Chat interview UI (shown when no extracted profile active) ── */}
              {!extractedProfile && (
                <>
                  {/* Autofill link */}
                  {!profile && !profileLoading && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => { setBrandGuideModal(true); setExtractError(null) }}
                        style={{ background: 'none', border: 'none', color: '#E9A020', cursor: 'pointer', fontSize: '13px', fontWeight: 500, padding: 0 }}
                      >
                        Already have a brand guide? Skip the interview →
                      </button>
                    </div>
                  )}

                  {/* Chat UI */}
                  <div
                    className="rounded-xl p-4 mb-4 space-y-3 overflow-y-auto"
                    style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8', maxHeight: '360px' }}
                  >
                    {/* Intro */}
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px]" style={{ background: '#E9A020', color: '#fff', fontWeight: 700 }}>C</div>
                      <div className="rounded-2xl rounded-tl-none px-4 py-2.5 text-[13px] max-w-[85%]" style={{ background: 'white', color: '#1E2D3D', border: '0.5px solid #EEEBE6' }}>
                        I have five questions to help me understand your reader and your voice. There are no wrong answers — write like you'd talk to a trusted author friend.
                      </div>
                    </div>

                    {/* Questions and answers */}
                    {QUESTIONS.slice(0, answers.length + (profileLoading || profile ? 0 : 1)).map((q, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px]" style={{ background: '#E9A020', color: '#fff', fontWeight: 700 }}>C</div>
                          <div className="rounded-2xl rounded-tl-none px-4 py-2.5 text-[13px] max-w-[85%]" style={{ background: 'white', color: '#1E2D3D', border: '0.5px solid #EEEBE6' }}>
                            {q}
                          </div>
                        </div>
                        {answers[i] && (
                          <div className="flex gap-3 justify-end">
                            <div className="rounded-2xl rounded-tr-none px-4 py-2.5 text-[13px] max-w-[85%]" style={{ background: '#1E2D3D', color: '#fff' }}>
                              {answers[i]}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Profile loading (interview flow) */}
                    {profileLoading && !extractedProfile && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px]" style={{ background: '#E9A020', color: '#fff', fontWeight: 700 }}>C</div>
                        <div className="rounded-2xl rounded-tl-none px-4 py-2.5 text-[13px] max-w-[85%]" style={{ background: 'white', color: '#1E2D3D', border: '0.5px solid #EEEBE6' }}>
                          <span className="animate-pulse">Crafting your reader profile…</span>
                        </div>
                      </div>
                    )}

                    {/* Generated profile */}
                    {profile && !profileLoading && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px]" style={{ background: '#E9A020', color: '#fff', fontWeight: 700 }}>C</div>
                        <div className="rounded-2xl rounded-tl-none px-4 py-3 text-[13px] max-w-[90%] space-y-3" style={{ background: 'white', color: '#1E2D3D', border: '0.5px solid #EEEBE6' }}>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#E9A020' }}>Reader Avatar</div>
                            <p>{profile.readerAvatar}</p>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#E9A020' }}>5 Core Feelings</div>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.coreFeelings.map((f, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}>{f}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#E9A020' }}>Voice Profile</div>
                            <p>{profile.voiceProfile}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Input row */}
                  {answers.length < QUESTIONS.length && !profileLoading && !profile && (
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={currentAnswer}
                        onChange={e => setCurrentAnswer(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        placeholder="Type your answer… (Enter to send)"
                        className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                        style={{ border: '1px solid #E8E0D8', background: 'white', color: '#1E2D3D' }}
                      />
                      <MicButton onResult={text => setCurrentAnswer(prev => prev ? `${prev} ${text}` : text)} />
                      <button
                        onClick={submitAnswer}
                        disabled={!currentAnswer.trim()}
                        className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
                        style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Send
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Phase 2 CTA */}
              {profile && !profileLoading && (
                <button
                  onClick={handlePhase2Complete}
                  className="w-full mt-4 py-3 rounded-xl text-[14px] font-bold transition-all"
                  style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Continue to Generate Campaign →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── PHASE 3 ────────────────────────────────────────────────────── */}
        <div className={card} style={cardStyle}>
          <PhaseStepHeader
            number={3}
            title="Generate 30-Day Campaign"
            subtitle={completedPhases.includes(3) ? `${posts.length} posts generated · ${approvedIds.size} approved` : 'One click to build your full content calendar'}
            isActive={activePhase === 3}
            isCompleted={completedPhases.includes(3)}
            onEdit={() => { setActivePhase(3); setCompletedPhases(prev => prev.filter(n => n !== 3)) }}
          />

          {activePhase === 3 && (
            <div className="mt-6">
              <div className="p-4 rounded-xl mb-4 text-[13px]" style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8', color: '#6B7280' }}>
                This will generate 30 posts across Pinterest and Instagram — 18 emotional/identity posts, 9 mood board posts, and 3 book mentions — mapped to a 4-week awareness-to-conversion arc.
              </div>

              {campaignLoading ? (
                <div className="space-y-3 py-4">
                  <LoadingSkeleton lines={4} />
                  <p className="text-[12px] text-center animate-pulse" style={{ color: '#6B7280' }}>Generating your 30-day campaign with Claude…</p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCampaign}
                  className="w-full py-4 rounded-xl text-[15px] font-bold transition-all"
                  style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Generate 30-Day Campaign
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── PHASE 4 ────────────────────────────────────────────────────── */}
        <div className={card} style={cardStyle}>
          <PhaseStepHeader
            number={4}
            title="Review & Schedule"
            subtitle={`${approvedIds.size} of ${posts.length} posts approved`}
            isActive={activePhase === 4}
            isCompleted={false}
            onEdit={undefined}
          />

          {(activePhase === 4 || completedPhases.includes(3)) && posts.length > 0 && (
            <div className="mt-6">
              {/* Top actions */}
              <div className="flex flex-wrap gap-3 mb-5">
                <button
                  onClick={approveAll}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
                  style={{ background: '#6EBF8B', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Approve All ({posts.length})
                </button>
                {tailwindConnected && approvedIds.size > 0 && (
                  <button
                    onClick={scheduleApproved}
                    disabled={scheduleLoading}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-60"
                    style={{ background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {scheduleLoading ? 'Scheduling…' : `Schedule ${approvedIds.size} Approved Posts →`}
                  </button>
                )}
                {!tailwindConnected && (
                  <button
                    onClick={() => setTailwindModal(true)}
                    className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                    style={{ background: 'white', border: '1px solid #E8E0D8', color: '#6B7280', cursor: 'pointer' }}
                  >
                    Connect Tailwind to Schedule →
                  </button>
                )}
              </div>

              {/* 30-post grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {posts.map(post => {
                  const isApproved = approvedIds.has(post.id)
                  const isScheduled = post.status === 'scheduled'
                  const phaseColor = PHASE_COLORS[post.phase] ?? '#6B7280'
                  const phaseBg = PHASE_BG[post.phase] ?? '#F5F5F4'
                  const captionExpanded = expandedCaptions.has(post.id)
                  const schedResult = scheduleResults[post.id]

                  return (
                    <div
                      key={post.id}
                      className="rounded-xl overflow-hidden flex flex-col"
                      style={{
                        background: 'white',
                        border: `1px solid ${isApproved ? '#6EBF8B' : '#EEEBE6'}`,
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {/* Card header */}
                      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: '0.5px solid #EEEBE6' }}>
                        <span className="text-[11px] font-bold" style={{ color: '#6B7280' }}>Day {post.day}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: phaseBg, color: phaseColor }}
                        >
                          {post.phase}
                        </span>
                        <span className="text-[10px] ml-auto" style={{ color: '#6B7280' }}>
                          {post.platform === 'pinterest' ? '📌' : '📸'} {post.platform}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="px-4 py-3 flex-1 space-y-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>{post.pillar}</div>

                        {/* Hook */}
                        <p className="text-[14px] font-semibold leading-snug" style={{ color: '#1E2D3D' }}>{post.hook}</p>

                        {/* Caption */}
                        <div>
                          <p
                            className="text-[12px] leading-relaxed"
                            style={{
                              color: '#4B5563',
                              display: '-webkit-box',
                              WebkitLineClamp: captionExpanded ? 'unset' : 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: captionExpanded ? 'visible' : 'hidden',
                            } as React.CSSProperties}
                          >
                            {post.caption}
                          </p>
                          <button
                            onClick={() => setExpandedCaptions(prev => {
                              const n = new Set(prev)
                              if (n.has(post.id)) n.delete(post.id); else n.add(post.id)
                              return n
                            })}
                            className="text-[11px] mt-1"
                            style={{ background: 'none', border: 'none', color: '#E9A020', cursor: 'pointer', padding: 0 }}
                          >
                            {captionExpanded ? 'Collapse ▲' : 'Expand ▼'}
                          </button>
                          {captionExpanded && (
                            <div className="mt-2 flex gap-1">
                              <textarea
                                defaultValue={post.caption}
                                rows={3}
                                onBlur={e => updateCaption(post, e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded text-[12px] outline-none resize-none"
                                style={{ border: '1px solid #E8E0D8', background: '#FFF8F0', color: '#1E2D3D' }}
                              />
                              <MicButton onResult={text => updateCaption(post, text)} />
                            </div>
                          )}
                        </div>

                        {/* Midjourney prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Midjourney Prompt</span>
                            {post.midjourneyPrompt && <CopyButton text={post.midjourneyPrompt} />}
                          </div>
                          {post.midjourneyPrompt ? (
                            <pre
                              className="text-[10px] p-2 rounded overflow-x-auto"
                              style={{ background: '#1E2D3D', color: '#E9A020', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '80px' }}
                            >
                              {post.midjourneyPrompt}
                            </pre>
                          ) : (
                            <button
                              onClick={() => generatePrompt(post)}
                              disabled={generatingPromptId === post.id}
                              className="w-full py-1.5 rounded text-[11px] font-semibold transition-all disabled:opacity-50"
                              style={{ background: 'rgba(233,160,32,0.12)', border: '1px solid rgba(233,160,32,0.3)', color: '#E9A020', cursor: 'pointer' }}
                            >
                              {generatingPromptId === post.id ? 'Generating…' : '✦ Generate Prompt'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="px-4 py-3 flex gap-2" style={{ borderTop: '0.5px solid #EEEBE6' }}>
                        <button
                          onClick={() => toggleApprove(post)}
                          className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                          style={{
                            background: isApproved ? '#6EBF8B' : 'white',
                            border: `1px solid ${isApproved ? '#6EBF8B' : '#1E2D3D'}`,
                            color: isApproved ? '#fff' : '#1E2D3D',
                            cursor: 'pointer',
                          }}
                        >
                          {isScheduled ? '✓ Scheduled' : isApproved ? '✓ Approved' : 'Approve'}
                        </button>
                        <button
                          onClick={() => regeneratePost(post)}
                          disabled={regeneratingId === post.id}
                          className="px-3 py-1.5 rounded-lg text-[12px] transition-all disabled:opacity-50"
                          style={{ background: '#FFF8F0', border: '1px solid #E8E0D8', color: '#6B7280', cursor: 'pointer' }}
                          title="Regenerate this post"
                        >
                          {regeneratingId === post.id ? '…' : '↺'}
                        </button>
                      </div>

                      {schedResult !== undefined && (
                        <div
                          className="px-4 py-1.5 text-[11px] font-medium text-center"
                          style={{
                            background: schedResult ? 'rgba(110,191,139,0.12)' : 'rgba(249,123,107,0.12)',
                            color: schedResult ? '#6EBF8B' : '#F97B6B',
                          }}
                        >
                          {schedResult ? 'Scheduled to Tailwind ✓' : 'Schedule failed — check API key'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activePhase === 4 && posts.length === 0 && !completedPhases.includes(3) && (
            <div className="mt-6 text-center py-10" style={{ color: '#6B7280' }}>
              <div className="text-4xl mb-3">📅</div>
              <p className="text-[14px]">Complete phases 1–3 to generate your campaign.</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input — always in DOM */}
      <input
        ref={brandGuideFileRef}
        type="file"
        accept=".txt,.pdf"
        style={{ display: 'none' }}
        onChange={e => {
          setBrandGuideFile(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />

      {/* ─── Brand Guide Autofill Modal ─────────────────────────────────────── */}
      {brandGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(30,45,61,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setBrandGuideModal(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-[20px] font-bold mb-1" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Let&apos;s skip the small talk.
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              Paste or upload your brand guide and we&apos;ll extract your reader avatar, core feelings, and voice profile automatically.
            </p>

            {/* Upload nudge card */}
            <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-[10px]" style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>📄 Already have a brand guide?</div>
                <div className="text-[12px]" style={{ color: 'rgba(30,45,61,0.5)' }}>Upload it and we&apos;ll extract everything for you.</div>
              </div>
              <button
                onClick={() => { setBrandGuideTab('upload'); brandGuideFileRef.current?.click() }}
                className="shrink-0 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Upload your brand guide →
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-lg mb-4" style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8' }}>
              {(['paste', 'upload'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setBrandGuideTab(tab)}
                  className="flex-1 py-2 rounded-md text-[13px] transition-all"
                  style={{
                    background: brandGuideTab === tab ? (tab === 'upload' ? '#E9A020' : 'white') : 'transparent',
                    color: brandGuideTab === tab ? (tab === 'upload' ? '#fff' : '#1E2D3D') : '#6B7280',
                    fontWeight: brandGuideTab === tab ? 600 : 400,
                    border: brandGuideTab === tab && tab !== 'upload' ? '0.5px solid #E8E0D8' : 'none',
                    cursor: 'pointer',
                    boxShadow: brandGuideTab === tab && tab !== 'upload' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {tab === 'paste' ? 'Paste text' : 'Upload file'}
                </button>
              ))}
            </div>

            {/* Paste tab */}
            {brandGuideTab === 'paste' && (
              <textarea
                value={brandGuideText}
                onChange={e => setBrandGuideText(e.target.value)}
                rows={8}
                placeholder="Paste your brand guide here…"
                className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none mb-4"
                style={{ border: '1px solid #E8E0D8', background: '#FFF8F0', color: '#1E2D3D' }}
              />
            )}

            {/* Upload tab */}
            {brandGuideTab === 'upload' && (
              <div className="mb-4">
                <button
                  onClick={() => brandGuideFileRef.current?.click()}
                  className="w-full py-8 rounded-xl text-[13px] transition-all"
                  style={{
                    background: '#FFF8F0',
                    border: `2px dashed ${brandGuideFile ? '#E9A020' : '#E8E0D8'}`,
                    color: brandGuideFile ? '#E9A020' : '#6B7280',
                    cursor: 'pointer',
                  }}
                >
                  {brandGuideFile ? (
                    <span className="font-semibold">{brandGuideFile.name}</span>
                  ) : (
                    <>
                      <div className="text-2xl mb-2">📄</div>
                      <div className="font-medium">Drop your brand guide here — .txt, .pdf, or .docx</div>
                      <div className="text-[12px] mt-1" style={{ color: '#9CA3AF' }}>Works with any brand doc, style guide, or author bio</div>
                    </>
                  )}
                </button>
                {brandGuideFile && (
                  <button
                    onClick={() => setBrandGuideFile(null)}
                    className="text-[12px] mt-2 w-full text-center"
                    style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                  >
                    Remove file
                  </button>
                )}
              </div>
            )}

            {/* Loading skeleton */}
            {extractLoading && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: '#FFF8F0', border: '0.5px solid #E8E0D8' }}>
                <LoadingSkeleton lines={3} />
                <p className="text-[12px] text-center animate-pulse mt-2" style={{ color: '#6B7280' }}>Extracting your brand voice…</p>
              </div>
            )}

            {/* Error state */}
            {extractError && !extractLoading && (
              <p className="text-[13px] mb-4 px-3 py-2 rounded-lg" style={{ color: '#F97B6B', background: 'rgba(249,123,107,0.08)', border: '0.5px solid rgba(249,123,107,0.3)' }}>
                {extractError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleExtractBrandVoice}
                disabled={extractLoading || (brandGuideTab === 'paste' ? !brandGuideText.trim() : !brandGuideFile)}
                className="flex-1 py-3 rounded-xl text-[14px] font-bold transition-all disabled:opacity-50"
                style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {extractLoading ? 'Extracting…' : 'Extract My Brand Voice'}
              </button>
              <button
                onClick={() => setBrandGuideModal(false)}
                className="px-5 py-3 rounded-xl text-[14px] font-medium transition-all"
                style={{ background: 'white', border: '1px solid #E8E0D8', color: '#6B7280', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tailwind Modal ─────────────────────────────────────────────────── */}
      {tailwindModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(30,45,61,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setTailwindModal(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-[18px] font-bold mb-1" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Connect Tailwind</h2>
            <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
              Paste your Tailwind API key to enable one-click scheduling.{' '}
              <a href="https://api-docs.tailwind.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#E9A020' }}>Get your API key →</a>
            </p>

            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#1E2D3D' }}>API Key</label>
            <input
              type="password"
              value={tailwindKey}
              onChange={e => setTailwindKey(e.target.value)}
              placeholder="tw_..."
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none mb-4"
              style={{ border: '1px solid #E8E0D8', background: '#FFF8F0', color: '#1E2D3D' }}
            />

            <div className="flex gap-3">
              <button
                onClick={connectTailwind}
                disabled={!tailwindKey.trim() || tailwindConnecting}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all disabled:opacity-50"
                style={{ background: '#E9A020', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                {tailwindConnecting ? 'Connecting…' : 'Connect'}
              </button>
              <button
                onClick={() => setTailwindModal(false)}
                className="px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all"
                style={{ background: 'white', border: '1px solid #E8E0D8', color: '#6B7280', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
