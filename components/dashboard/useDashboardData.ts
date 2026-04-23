'use client'
// components/dashboard/useDashboardData.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { buildCoachPromptAction } from '@/app/actions/buildCoachPrompt'
import { getCoachTitle } from '@/lib/coachTitle'
import type { Analysis, ChannelScore, RankLog, RoasLog, Task } from '@/types'
import type { DashboardData } from '@/lib/dashboard-data'

export type SwapCalendarEntry = {
  id: string; partnerName: string; bookTitle: string
  promoDate: string; direction: string; status: string
}

export interface DashboardState {
  userName?: string | null
  initialData?: DashboardData
  // Data
  analysis: any
  analyses: Analysis[]
  rankLogs: RankLog[]
  roasLogs: RoasLog[]
  liveML: import('@/types').MailerLiteData | null
  swapCalendar: SwapCalendarEntry[]
  kdpLastUploadedAt: string | null
  metaLastSync: string | null
  // UI state
  loading: boolean
  generating: boolean
  metaErrorBanner: boolean
  setMetaErrorBanner: React.Dispatch<React.SetStateAction<boolean>>
  storyMode: boolean
  toggleStoryMode: () => void
  isFresh: boolean
  // Priorities
  expandedPriority: number | null
  setExpandedPriority: React.Dispatch<React.SetStateAction<number | null>>
  donePriorities: Set<number>
  toggleDone: (i: number) => void
  showCompleted: boolean
  setShowCompleted: React.Dispatch<React.SetStateAction<boolean>>
  // Copy / sync
  copying: boolean
  copied: boolean
  handleCopy: () => Promise<void>
  syncingMeta: boolean
  syncingML: boolean
  handleSyncMeta: () => Promise<void>
  handleSyncML: () => Promise<void>
  setGenerating: React.Dispatch<React.SetStateAction<boolean>>
  setAnalysis: React.Dispatch<React.SetStateAction<any>>
  setKdpLastUploadedAt: React.Dispatch<React.SetStateAction<string | null>>
  // Derived / animated
  coachTitle: string
  greeting: string
  animRev: number
  animUnits: number
  animKenp: number
  animCtr: number
  _netVal: number
  isKdpStale: boolean
  channelScoresArr: ChannelScore[]
  getChannelScore: (key: string) => ChannelScore | undefined
  // Rail
  railTasks: Task[]
}

function useCountUp(target: number, active: boolean, duration = 800): number {
  const [val, setVal] = useState(active ? 0 : target)
  useEffect(() => {
    if (!active) { setVal(target); return }
    const start = Date.now()
    function tick() {
      const pct = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - pct, 3)
      setVal(target * eased)
      if (pct < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active])
  return val
}

function getDefaultDateRange() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { from, to }
}

export function useDashboardData({
  userName, initialData,
}: {
  userName?: string | null
  initialData?: DashboardData
}): DashboardState {
  const hasInitial = !!initialData
  const [analysis,  setAnalysis]  = useState<any>(initialData?.analysis ?? null)
  const [analyses,  setAnalyses]  = useState<Analysis[]>(initialData?.analyses ?? [])
  const [rankLogs,  setRankLogs]  = useState<RankLog[]>(initialData?.rankLogs ?? [])
  const [roasLogs,  setRoasLogs]  = useState<RoasLog[]>(initialData?.roasLogs ?? [])
  const [loading,   setLoading]   = useState(!hasInitial)
  const [generating, setGenerating] = useState(false)
  const [kdpLastUploadedAt, setKdpLastUploadedAt] = useState<string | null>(initialData?.kdpLastUploadedAt ?? null)
  const [copied,      setCopied]      = useState(false)
  const [copying,     setCopying]     = useState(false)
  const [coachTitle, setCoachTitle] = useState('Your marketing coach says')
  useEffect(() => { setCoachTitle(getCoachTitle()) }, [])
  const [greeting, setGreeting] = useState('Hello')
  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')
  }, [])
  const [expandedPriority, setExpandedPriority] = useState<number | null>(null)
  const [donePriorities, setDonePriorities] = useState<Set<number>>(new Set())
  const [showCompleted, setShowCompleted] = useState(true)
  const [isFresh,     setIsFresh]     = useState(false)
  const [storyMode,   setStoryMode]   = useState(true)
  const [swapCalendar, setSwapCalendar] = useState<SwapCalendarEntry[]>([])

  function toggleStoryMode() {
    setStoryMode(prev => {
      const next = !prev
      localStorage.setItem('story-mode', String(next))
      return next
    })
  }

  useEffect(() => {
    fetch('/api/swaps/calendar')
      .then(r => r.json())
      .then(d => setSwapCalendar(d.swaps ?? []))
      .catch(() => setSwapCalendar([]))
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('story-mode')
      if (stored !== null) setStoryMode(stored === 'true')
    } catch {}
    function onStoryModeChange(e: Event) {
      setStoryMode((e as CustomEvent<{ on: boolean }>).detail.on)
    }
    window.addEventListener('story-mode-change', onStoryModeChange)
    return () => window.removeEventListener('story-mode-change', onStoryModeChange)
  }, [])

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const stored = localStorage.getItem('priorities-done')
      if (!stored) return
      const { date, indices } = JSON.parse(stored)
      if (date !== today) return
      setDonePriorities(new Set<number>(indices))
    } catch {}
  }, [])

  useEffect(() => {
    if (donePriorities.size === 0) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      localStorage.setItem('priorities-done', JSON.stringify({ date: today, indices: Array.from(donePriorities) }))
    } catch {}
  }, [donePriorities])

  function toggleDone(i: number) {
    setDonePriorities(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else { next.add(i); setExpandedPriority(null) }
      return next
    })
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('fresh') === '1') setIsFresh(true)
  }, [])

  const _revTarget   = analysis?.kdp  ? Math.round(((analysis.kdp.totalRoyaltiesUSD ?? 0) + analysis.kdp.totalKENP * 0.0045) * 100) / 100 : 0
  const _unitsTarget = analysis?.kdp?.totalUnits ?? 0
  const _kenpTarget  = analysis?.kdp?.totalKENP  ?? 0
  const _ctrTarget   = analysis?.meta?.bestAd?.ctr ?? 0
  const animRev   = useCountUp(_revTarget,   isFresh && !!analysis?.kdp)
  const animUnits = useCountUp(_unitsTarget, isFresh && !!analysis?.kdp)
  const animKenp  = useCountUp(_kenpTarget,  isFresh && !!analysis?.kdp)
  const animCtr   = useCountUp(_ctrTarget,   isFresh && !!analysis?.meta?.bestAd)
  const _netVal   = animRev - (analysis?.meta?.totalSpend ?? 0)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('authordash_date_range')
      if (stored) {
        const parsed = JSON.parse(stored)
        const def = getDefaultDateRange()
        if (parsed.from !== def.from || parsed.to !== def.to) setRefreshKey(k => k + 1)
      }
    } catch {}
  }, [])

  const [refreshKey,   setRefreshKey]   = useState(0)
  const [liveML,       setLiveML]       = useState<import('@/types').MailerLiteData | null>(initialData?.mailerLiteData ?? null)
  const [metaLastSync, setMetaLastSync] = useState<string | null>(initialData?.metaLastSync ?? null)
  const [syncingMeta,  setSyncingMeta]  = useState(false)
  const [syncingML,    setSyncingML]    = useState(false)
  const [metaErrorBanner, setMetaErrorBanner] = useState(false)
  const [railTasks, setRailTasks] = useState<Task[]>([])

  useEffect(() => {
    fetch('/api/tasks?status=todo')
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (Array.isArray(data)) setRailTasks(data.slice(0, 6))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.search.includes('meta_error=true')) {
      setMetaErrorBanner(true)
      const clean = window.location.pathname + window.location.search.replace(/[?&]?meta_error=true/, '')
      window.history.replaceState(null, '', clean || window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (hasInitial && refreshKey === 0) return
    const { from, to } = (() => {
      try {
        const stored = localStorage.getItem('authordash_date_range')
        if (stored) return JSON.parse(stored) as { from: string; to: string }
      } catch {}
      return getDefaultDateRange()
    })()
    const dateParams = new URLSearchParams({ from, to }).toString()

    Promise.all([
      fetch(`/api/analyze?${dateParams}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({})),
      fetch(`/api/rank?${dateParams}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({ logs: [] })),
      fetch(`/api/roas?${dateParams}`).then(r => r.ok ? r.json() : Promise.reject(r.status)).catch(() => ({ logs: [] })),
      fetch('/api/mailerlite').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([analyzeData, rankData, roasData, mlData]) => {
      const a = analyzeData.analysis ?? null
      setAnalysis(a)
      setKdpLastUploadedAt(analyzeData.kdpLastUploadedAt ?? null)
      setMetaLastSync(analyzeData.metaLastSync ?? null)
      const rows: Analysis[] = (analyzeData.analyses ?? [])
        .map((r: { data?: Analysis }) => r.data)
        .filter((d: unknown): d is Analysis => !!d && typeof d === 'object' && 'month' in (d as object))
      if (rows.length) setAnalyses(rows)
      setRankLogs(rankData.logs ?? [])
      setRoasLogs(roasData.logs ?? [])
      if (mlData?.data) setLiveML(mlData.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [refreshKey, hasInitial])

  const handleSyncMeta = useCallback(async () => {
    setSyncingMeta(true)
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) {
        const data = await res.json()
        if (data.data) setAnalysis((prev: any) => prev ? { ...prev, meta: data.data } : { meta: data.data })
        setMetaLastSync(new Date().toISOString())
        window.dispatchEvent(new Event('meta:synced'))
      }
    } catch { /* ignore */ }
    setSyncingMeta(false)
  }, [])

  const handleSyncML = useCallback(async () => {
    setSyncingML(true)
    try {
      const res = await fetch('/api/mailerlite')
      if (res.ok) {
        const data = await res.json()
        if (data.data) setLiveML(data.data)
      }
    } catch { /* ignore */ }
    setSyncingML(false)
  }, [])

  const hasTriggeredReanalysis = useRef(false)
  const triggerReanalysis = useCallback(async (currentAnalysis: any) => {
    if (!currentAnalysis?.month) return
    setGenerating(true)
    try {
      const body = {
        kdp:        currentAnalysis.kdp        ?? undefined,
        meta:       currentAnalysis.meta       ?? undefined,
        mailerLite: currentAnalysis.mailerLite ?? undefined,
        pinterest:  currentAnalysis.pinterest  ?? undefined,
        month:      currentAnalysis.month,
      }
      const response = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok || !response.body) return
      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'complete' && event.analysis) setAnalysis(event.analysis)
          } catch { /* ignore partial SSE chunks */ }
        }
      }
    } catch { /* ignore */ }
    finally { setGenerating(false) }
  }, [])

  useEffect(() => {
    if (!analysis) return
    if (analysis.actionPlan?.length) { hasTriggeredReanalysis.current = false; return }
    const hasChannelData = !!(analysis.kdp || analysis.meta || analysis.mailerLite)
    if (!hasChannelData) return
    if (hasTriggeredReanalysis.current) return
    hasTriggeredReanalysis.current = true
    triggerReanalysis(analysis)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])

  useEffect(() => {
    function onUploadComplete() { setRefreshKey(k => k + 1) }
    window.addEventListener('dashboard-data-refresh', onUploadComplete)
    return () => window.removeEventListener('dashboard-data-refresh', onUploadComplete)
  }, [])

  useEffect(() => {
    function onDateRangeChange() { setRefreshKey(k => k + 1) }
    window.addEventListener('date-range-change', onDateRangeChange)
    return () => window.removeEventListener('date-range-change', onDateRangeChange)
  }, [])

  useEffect(() => {
    const isAnalyzing = new URLSearchParams(window.location.search).get('analyzing') === '1'
    if (!isAnalyzing) return
    let pendingData: any
    try {
      const raw = sessionStorage.getItem('pendingUpload')
      if (!raw) return
      pendingData = JSON.parse(raw)
    } catch { return }

    setGenerating(true)
    setAnalysis((prev: any) => prev ?? {
      month:      pendingData.month,
      kdp:        pendingData.kdp        ?? undefined,
      meta:       pendingData.meta       ?? undefined,
      pinterest:  pendingData.pinterest  ?? undefined,
      mailerLite: pendingData.mailerLite ?? undefined,
      channelScores: [], actionPlan: [], insights: [],
    })

    let pollCount = 0
    const pollId = setInterval(async () => {
      try {
        pollCount++
        if (pollCount > 60) { clearInterval(pollId); setGenerating(false); sessionStorage.removeItem('pendingUpload'); return }
        const res = await fetch('/api/analyze')
        if (!res.ok) return
        const data = await res.json()
        const a = data.analysis
        if (a?.channelScores?.length > 0) {
          clearInterval(pollId)
          setAnalysis(a)
          setKdpLastUploadedAt(data.kdpLastUploadedAt ?? null)
          setGenerating(false)
          sessionStorage.removeItem('pendingUpload')
          window.history.replaceState({}, '', window.location.pathname)
        }
      } catch { /* ignore poll errors */ }
    }, 3000)
    return () => clearInterval(pollId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopy = useCallback(async () => {
    setCopying(true)
    try {
      const prompt = await buildCoachPromptAction(analysis, rankLogs, roasLogs, swapCalendar)
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 4000)
    } catch {
      alert('Could not copy automatically — please try again.')
    } finally {
      setCopying(false)
    }
  }, [analysis, rankLogs, roasLogs, swapCalendar])

  const isKdpStale = !!kdpLastUploadedAt &&
    (Date.now() - new Date(kdpLastUploadedAt).getTime()) > 35 * 24 * 60 * 60 * 1000

  const channelScoresArr: ChannelScore[] = Array.isArray(analysis?.channelScores) ? analysis.channelScores : []
  const getChannelScore = useCallback((key: string): ChannelScore | undefined =>
    channelScoresArr.find((s: ChannelScore) => (s.channel === 'email' ? 'mailerlite' : s.channel) === key),
  [channelScoresArr])

  return {
    userName, initialData,
    analysis, analyses, rankLogs, roasLogs, liveML, swapCalendar,
    kdpLastUploadedAt, metaLastSync,
    loading, generating, metaErrorBanner, setMetaErrorBanner,
    storyMode, toggleStoryMode, isFresh,
    expandedPriority, setExpandedPriority, donePriorities, toggleDone, showCompleted, setShowCompleted,
    copying, copied, handleCopy,
    syncingMeta, syncingML, handleSyncMeta, handleSyncML,
    setGenerating, setAnalysis, setKdpLastUploadedAt,
    coachTitle, greeting,
    animRev, animUnits, animKenp, animCtr, _netVal,
    isKdpStale, channelScoresArr, getChannelScore,
    railTasks,
  }
}
