'use client'
// components/UploadModal.tsx — full-page upload modal triggered from TopBar
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { KDPData, MetaData, PinterestData } from '@/types'

type FileType = 'kdp' | 'meta' | 'pinterest' | 'adtracker' | 'unknown'
type FileStatus = 'reading' | 'done' | 'error' | 'unknown'
type StageId = 1 | 2 | 3 | 4 | 5

interface ParsedFile {
  id: string
  filename: string
  type: FileType
  status: FileStatus
  data: KDPData | MetaData | PinterestData | null
}

interface StageInfo {
  id: StageId
  percent: number
  title: string
  message: string
  icon: 'book' | 'check' | 'bars' | 'star' | 'celebrate'
}

const STAGES: StageInfo[] = [
  { id: 1, percent: 12,  title: 'Reading your file',   message: 'Cracking open your report...',         icon: 'book'      },
  { id: 2, percent: 35,  title: 'Detecting format',    message: 'Found your sales data — looks good!',  icon: 'check'     },
  { id: 3, percent: 58,  title: 'Saving your data',    message: 'Turning your data into your story...', icon: 'bars'      },
  { id: 4, percent: 82,  title: 'Running AI analysis', message: 'Your coach is reading the numbers...', icon: 'star'      },
  { id: 5, percent: 100, title: 'Done!',               message: 'Your dashboard is ready!',             icon: 'celebrate' },
]

const SLOW_MESSAGES: Record<StageId, string> = {
  1: 'Large file — still reading...',
  2: 'Checking every column — one moment...',
  3: 'Still saving — almost there...',
  4: 'Still working — large files take a moment...',
  5: '',
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function BookIcon()        { return <div style={{ animation: 'stageBookBounce 1.4s ease-in-out infinite', fontSize: 56, lineHeight: 1 }}>📖</div> }
function StarIcon()        { return <div style={{ fontSize: 52, lineHeight: 1, animation: 'stageStarPulse 1.2s ease-in-out infinite' }}>⭐</div> }
function CelebrationIcon() { return <div style={{ fontSize: 54, lineHeight: 1, animation: 'stageCelebrate 0.6s ease-out' }}>🎉</div> }

function CheckIcon() {
  return (
    <svg viewBox="0 0 56 56" fill="none" width="56" height="56">
      <circle cx="28" cy="28" r="26" stroke="#E9A020" strokeWidth="2.5" opacity="0.2" />
      <circle cx="28" cy="28" r="26" stroke="#E9A020" strokeWidth="2.5"
        strokeDasharray="163" strokeDashoffset="163"
        style={{ animation: 'stageCircleDraw 0.6s ease-out forwards' }} />
      <path d="M16 28L24 36L40 20" stroke="#6EBF8B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="32" strokeDashoffset="32"
        style={{ animation: 'stageCheckDraw 0.4s 0.5s ease-out forwards' }} />
    </svg>
  )
}

function BarsIcon() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 48, paddingBottom: 4 }}>
      {[{ h: 60, d: '0s' }, { h: 85, d: '0.12s' }, { h: 45, d: '0.24s' }, { h: 100, d: '0.36s' }].map((b, i) => (
        <div key={i} style={{
          width: 10, borderRadius: 3, height: `${b.h * 0.4}px`, transformOrigin: 'bottom',
          background: i === 3 ? '#E9A020' : '#F0EDEA',
          border: `1.5px solid ${i === 3 ? '#E9A020' : '#D4D0CB'}`,
          animation: `stageBarsGrow 0.6s ${b.d} ease-out both`,
        }} />
      ))}
    </div>
  )
}

const BADGE: Record<FileType, { label: string; bg: string; color: string }> = {
  kdp:       { label: 'KDP',        bg: '#FFF4E0', color: '#E9A020' },
  meta:      { label: 'Meta Ads',   bg: '#EFF6FF', color: '#60A5FA' },
  pinterest: { label: 'Pinterest',  bg: '#FFF0F3', color: '#F472B6' },
  adtracker: { label: 'Ad Tracker', bg: '#FFF4E0', color: '#E9A020' },
  unknown:   { label: 'Unknown — we\'ll try to read it', bg: '#FFF4E0', color: '#E9A020' },
}

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const rawFiles = useRef<Map<string, File>>(new Map())

  const stageRef     = useRef<StageId>(1)
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [files, setFiles]                   = useState<ParsedFile[]>([])
  const [dragging, setDragging]             = useState(false)
  const [analyzing, setAnalyzing]           = useState(false)
  const [currentStage, setCurrentStage]     = useState<StageId>(1)
  const [stageVisible, setStageVisible]     = useState(true)
  const [showSlow, setShowSlow]             = useState(false)
  const [stageError, setStageError]         = useState<{ stage: StageId; message: string } | null>(null)
  const [progressPct, setProgressPct]       = useState(0)
  const [error, setError]                   = useState<string | null>(null)
  const [isTouch, setIsTouch]               = useState(false)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setFiles([])
      rawFiles.current.clear()
      setDragging(false)
      setAnalyzing(false)
      setError(null)
      setCurrentStage(1)
      setStageVisible(true)
      setShowSlow(false)
      setStageError(null)
      setProgressPct(0)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !analyzing) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, analyzing, onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    Array.from(incoming).slice(0, 10).forEach(file => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`
      rawFiles.current.set(id, file)
      processFile(file, id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processFile(file: File, id: string) {
    setFiles(prev => [...prev, { id, filename: file.name, type: 'unknown', status: 'reading', data: null }])
    const update = (patch: Partial<ParsedFile>) =>
      setFiles(prev => prev.map(f => f.id !== id ? f : { ...f, ...patch }))

    const name = file.name.toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

    try {
      if (isExcel) {
        // Lazily load xlsx so it only hits the bundle when an XLSX file is dropped
        const XLSX = await import('xlsx')
        const buf  = await file.arrayBuffer()
        const wb   = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })

        let detectedType: 'kdp' | 'meta' | null = null
        for (const sheetName of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false })
          if (csv.includes('KENP') || csv.includes('Royalty Date')) { detectedType = 'kdp'; break }
          const hits = ['Ad name', 'Amount spent', 'CTR (all)', 'CTR (link', 'CPC (all)', 'Campaign name', 'Ad set name']
            .filter(s => csv.includes(s)).length
          if (hits >= 2) { detectedType = 'meta'; break }
        }

        if (detectedType === 'kdp') {
          const { parseKDPFile } = await import('@/lib/parsers/kdp')
          update({ type: 'kdp', status: 'done', data: parseKDPFile(new Uint8Array(buf)) })
        } else if (detectedType === 'meta') {
          const { parseMetaFile } = await import('@/lib/parsers/meta')
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { blankrows: false })
          update({ type: 'meta', status: 'done', data: parseMetaFile(csv) })
        } else {
          update({ type: 'unknown', status: 'unknown', data: null })
        }
      } else {
        // CSV — parse entirely in the browser, no server round-trip
        const text = await file.text()
        const isPin = (text.trimStart().startsWith('Analytics overview') || text.includes('"Analytics overview"')) && text.includes('Impressions')
        const metaHits = ['Ad name', 'Amount spent', 'CTR (all)', 'CTR (link', 'CPC (all)', 'Campaign name', 'Ad set name', 'Impressions']
          .filter(s => text.includes(s)).length

        if (isPin) {
          const { parsePinterestFile } = await import('@/lib/parsers/pinterest')
          update({ type: 'pinterest', status: 'done', data: parsePinterestFile(text) })
        } else if (metaHits >= 2) {
          const { parseMetaFile } = await import('@/lib/parsers/meta')
          update({ type: 'meta', status: 'done', data: parseMetaFile(text) })
        } else {
          update({ type: 'unknown', status: 'unknown', data: null })
        }
      }
    } catch {
      update({ status: 'error', data: null })
    }
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
    rawFiles.current.delete(id)
  }

  // Derive data for analysis
  const byType = new Map<FileType, ParsedFile>()
  files
    .filter(f => f.status === 'done' && f.type !== 'unknown' && f.type !== 'adtracker')
    .forEach(f => byType.set(f.type, f))
  const kdpData  = (byType.get('kdp')?.data  as KDPData      | undefined) ?? null
  const metaData = (byType.get('meta')?.data as MetaData     | undefined) ?? null
  const pinData  = (byType.get('pinterest')?.data as PinterestData | undefined) ?? null
  const hasAny     = !!(kdpData || metaData || pinData)
  const anyReading = files.some(f => f.status === 'reading')
  const canAnalyze = files.length > 0 && hasAny && !anyReading && !analyzing

  function advanceToStage(stage: StageId) {
    stageRef.current = stage
    setShowSlow(false)
    setStageVisible(false)
    setTimeout(() => {
      setCurrentStage(stage)
      setProgressPct(STAGES[stage - 1].percent)
      setStageVisible(true)
    }, 350)
  }

  function startSlowTimer(stage: StageId) {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    slowTimerRef.current = setTimeout(() => {
      if (stageRef.current === stage) setShowSlow(true)
    }, 9000)
  }

  async function runAnalysis() {
    setAnalyzing(true)
    setError(null)
    setStageError(null)
    setCurrentStage(1)
    stageRef.current = 1
    setProgressPct(STAGES[0].percent)
    setStageVisible(true)
    setShowSlow(false)

    try {
      // Stages 1 & 2 are client-side (file parsing already done) — advance quickly for UX
      await sleep(500)
      advanceToStage(2)
      await sleep(400)

      const mlRes  = await fetch('/api/mailerlite').catch(() => null)
      const mlData = mlRes?.ok ? (await mlRes.json()).data : null
      const month  = new Date().toISOString().substring(0, 7)

      // Store parsed data in sessionStorage so the dashboard can show optimistic numbers
      // if the user navigates away before analysis completes
      try {
        sessionStorage.setItem('pendingUpload', JSON.stringify({
          kdp: kdpData, meta: metaData, pinterest: pinData, mailerLite: mlData, month,
          timestamp: Date.now(),
        }))
      } catch { /* storage unavailable */ }

      // POST to analyze — server responds with SSE stream
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kdp: kdpData, meta: metaData, mailerLite: mlData, pinterest: pinData, month }),
      })
      if (!res.ok || !res.body) throw new Error('analyze')

      // Read SSE events — server drives stage 3, 4, then complete/error
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf      = ''
      let navigated = false

      const uploadedCount = [kdpData, metaData, pinData].filter(Boolean).length
      let redirectTo = '/dashboard'
      if (uploadedCount === 0 && mlData) redirectTo = '/dashboard/mailerlite'
      else if (uploadedCount === 1) {
        if (metaData)     redirectTo = '/dashboard/meta'
        else if (kdpData) redirectTo = '/dashboard/kdp'
        else if (pinData) redirectTo = '/dashboard/pinterest'
      }

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })

        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))

            if (evt.type === 'stage') {
              advanceToStage(evt.stage as StageId)
              if (evt.stage === 3 || evt.stage === 4) startSlowTimer(evt.stage as StageId)
            } else if (evt.type === 'complete') {
              if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
              advanceToStage(5)
              navigated = true
              setTimeout(() => {
                try { sessionStorage.removeItem('pendingUpload') } catch { /* ignore */ }
                onSuccess()
                setTimeout(() => router.push(redirectTo + '?fresh=1'), 400)
              }, 1500)
              break outer
            } else if (evt.type === 'error') {
              throw new Error(evt.message || 'analyze')
            }
          } catch (parseErr) {
            // Rethrow real errors; ignore malformed SSE lines
            if (parseErr instanceof Error && parseErr.message !== 'analyze') {
              const msg = parseErr.message
              if (msg && msg !== 'Unexpected token') throw parseErr
            }
          }
        }
      }

      if (!navigated) throw new Error('analyze')

    } catch {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      const failed = stageRef.current
      setStageError({
        stage: failed,
        message: failed <= 3 ? 'Could not save your data. Please try again.' : 'Analysis failed — please try again.',
      })
      setAnalyzing(false)
    }
  }

  function retryAnalysis() { setStageError(null); runAnalysis() }

  const borderColor = dragging ? '#E9A020' : '#D4D0CB'
  const bgColor     = dragging ? 'rgba(233,160,32,0.04)' : 'white'

  return (
    <>
      {/* ── File input — ALWAYS in DOM, never conditionally mounted ── */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none', position: 'absolute', left: '-9999px' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* ── Modal overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onClick={e => { if (e.target === e.currentTarget && !analyzing) onClose() }}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{
              background: analyzing ? '#FFF8F0' : 'white',
              border: '1px solid #EEEBE6',
              maxHeight: '100dvh',
              transition: 'background 0.4s ease',
            }}
          >
            {/* Progress bar — analysis only */}
            {analyzing && (
              <div style={{ height: 4, background: '#F0EDEA', flexShrink: 0 }}>
                <div style={{
                  height: '100%', width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #E9A020, #F5B840)',
                  transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                  borderRadius: '0 2px 2px 0',
                }} />
              </div>
            )}

            {/* Header — upload phase only */}
            {!analyzing && (
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid #EEEBE6' }}>
                <div className="text-[15px] font-semibold" style={{ color: '#1E2D3D' }}>
                  Upload Your Data Files
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-stone-100"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                  aria-label="Close"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1 1L12 12M12 1L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5" style={{ overscrollBehavior: 'contain' }}>
              {!analyzing ? (
                <>
                  {/* Drop zone */}
                  <div
                    className="rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 mb-4"
                    style={{ borderColor, background: bgColor }}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragging(true) }}
                    onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                  >
                    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                      <div className="text-4xl mb-3">📁</div>
                      <div className="text-[15px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                        Drop files here
                      </div>
                      <div className="text-[13px]" style={{ color: '#6B7280' }}>
                        or {isTouch ? 'tap' : 'click'} to browse
                      </div>
                      <div className="text-[11px] mt-2" style={{ color: '#9CA3AF' }}>
                        KDP report · Meta .xlsx or .csv · Pinterest CSV
                      </div>
                    </div>
                  </div>

                  {/* File list */}
                  {files.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-2"
                        style={{ color: '#6B7280' }}>
                        Added files
                      </div>
                      <div className="space-y-2">
                        {files.map(f => {
                          const badge = BADGE[f.type]
                          return (
                            <div key={f.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                              style={{ background: '#F9F8F6', border: '0.5px solid #EEEBE6' }}>

                              {/* Status icon */}
                              <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                                {f.status === 'reading' ? (
                                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#E9A020' }}>
                                    <circle cx="7" cy="7" r="5.5" stroke="#EEEBE6" strokeWidth="1.5" />
                                    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                ) : f.status === 'error' ? (
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1 1L13 13M13 1L1 13" stroke="#F97B6B" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#6EBF8B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>

                              {/* Filename */}
                              <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] font-medium truncate" style={{ color: '#1E2D3D' }}>
                                  {f.filename}
                                </div>
                                {f.status === 'error' && (
                                  <div className="text-[11px]" style={{ color: '#F97B6B' }}>
                                    Could not read this file
                                  </div>
                                )}
                              </div>

                              {/* Type badge */}
                              {f.status !== 'reading' && (
                                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                                  style={{ background: badge.bg, color: badge.color }}>
                                  {badge.label}
                                </span>
                              )}

                              {/* Remove */}
                              <button
                                onClick={e => { e.stopPropagation(); removeFile(f.id) }}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-all hover:bg-stone-200 min-w-[24px] min-h-[24px]"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                                aria-label="Remove file"
                              >
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Inline error */}
                  {error && (
                    <div className="rounded-lg px-4 py-3 mb-2 text-[13px] leading-relaxed"
                      style={{ background: 'rgba(249,123,107,0.1)', border: '1px solid rgba(249,123,107,0.3)', color: '#F97B6B' }}>
                      {error}
                    </div>
                  )}
                </>
              ) : (
                /* ── Staged analysis loader ── */
                <div
                  className="flex flex-col items-center justify-center text-center py-10"
                  style={{
                    opacity: stageVisible ? 1 : 0,
                    transform: stageVisible ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                    minHeight: 260,
                  }}
                >
                  {/* Icon */}
                  <div className="mb-6 flex items-center justify-center" style={{ height: 64 }}>
                    {STAGES[currentStage - 1].icon === 'book'      && <BookIcon />}
                    {STAGES[currentStage - 1].icon === 'check'     && <CheckIcon />}
                    {STAGES[currentStage - 1].icon === 'bars'      && <BarsIcon />}
                    {STAGES[currentStage - 1].icon === 'star'      && <StarIcon />}
                    {STAGES[currentStage - 1].icon === 'celebrate' && <CelebrationIcon />}
                  </div>

                  {/* Step label */}
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#E9A020' }}>
                    {currentStage < 5 ? `Step ${currentStage} of 4` : 'Complete'}
                  </div>

                  {/* Title */}
                  <div className="text-[17px] font-bold mb-2" style={{ color: '#1E2D3D' }}>
                    {STAGES[currentStage - 1].title}
                  </div>

                  {/* Message */}
                  <div className="text-[13px] px-4 max-w-xs leading-relaxed" style={{ color: '#6B7280', minHeight: 40 }}>
                    {STAGES[currentStage - 1].message}
                  </div>

                  {/* Slow message */}
                  {showSlow && currentStage < 5 && (
                    <div className="mt-3 text-[12px] px-4 max-w-xs" style={{ color: '#9CA3AF', animation: 'stageFadeIn 0.4s ease' }}>
                      {SLOW_MESSAGES[currentStage]}
                    </div>
                  )}

                  {/* Error */}
                  {stageError && (
                    <div className="mt-4 w-full max-w-xs">
                      <div className="rounded-lg px-4 py-3 mb-3 text-[13px] text-center"
                        style={{ background: 'rgba(249,123,107,0.12)', border: '1px solid rgba(249,123,107,0.3)', color: '#E05A47' }}>
                        <span className="font-semibold">Step {stageError.stage} failed — </span>{stageError.message}
                      </div>
                      <button onClick={retryAnalysis}
                        className="w-full py-2.5 rounded-lg text-[13px] font-bold hover:opacity-90 transition-all"
                        style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}>
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Progress dots */}
                  {!stageError && currentStage < 5 && (
                    <div className="flex gap-2 mt-6">
                      {([1, 2, 3, 4] as StageId[]).map(s => (
                        <div key={s} style={{
                          width: s === currentStage ? 18 : 6, height: 6, borderRadius: 3,
                          background: s < currentStage ? '#6EBF8B' : s === currentStage ? '#E9A020' : '#E8E4DF',
                          transition: 'all 0.4s ease',
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!analyzing && (
              <div className="flex items-center justify-between px-5 py-4 gap-3 flex-shrink-0"
                style={{ borderTop: '1px solid #EEEBE6' }}>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all hover:bg-stone-50"
                  style={{ background: 'transparent', border: '1px solid #EEEBE6', color: '#6B7280', cursor: 'pointer', minHeight: 40 }}
                >
                  Cancel
                </button>
                <button
                  onClick={canAnalyze ? runAnalysis : undefined}
                  disabled={!canAnalyze}
                  className="px-5 py-2 rounded-lg text-[13px] font-bold transition-all"
                  style={{
                    background: canAnalyze ? '#E9A020' : '#F0EDEA',
                    color: canAnalyze ? '#0d1f35' : '#9CA3AF',
                    border: 'none',
                    cursor: canAnalyze ? 'pointer' : 'not-allowed',
                    minHeight: 40,
                  }}
                >
                  Analyze Files →
                </button>
              </div>
            )}
          </div>

          <style>{`
            @keyframes stageBookBounce {
              0%, 100% { transform: translateY(0) scale(1); }
              40%       { transform: translateY(-9px) scale(1.1); }
              60%       { transform: translateY(-4px) scale(1.05); }
            }
            @keyframes stageCircleDraw {
              from { stroke-dashoffset: 163; } to { stroke-dashoffset: 0; }
            }
            @keyframes stageCheckDraw {
              from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; }
            }
            @keyframes stageBarsGrow {
              from { transform: scaleY(0); } to { transform: scaleY(1); }
            }
            @keyframes stageStarPulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50%       { transform: scale(1.18); opacity: 0.85; }
            }
            @keyframes stageCelebrate {
              0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
              60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes stageFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
