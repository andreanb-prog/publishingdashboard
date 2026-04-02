'use client'
// components/UploadModal.tsx — full-page upload modal triggered from TopBar
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { KDPData, MetaData, PinterestData } from '@/types'

type FileType = 'kdp' | 'meta' | 'pinterest' | 'adtracker' | 'unknown'
type FileStatus = 'reading' | 'done' | 'error' | 'unknown'

interface ParsedFile {
  id: string
  filename: string
  type: FileType
  status: FileStatus
  data: KDPData | MetaData | PinterestData | null
}

const ANALYSIS_STEPS = [
  'Enchanting your data with a little dashboard magic',
  'Summoning insights from the numbers realm',
  'Weaving your spreadsheets into wisdom',
  'Conjuring your coaching session',
  "Schlepping through your spreadsheets so you don't have to",
  'Perusing your KDP report like a very dedicated fan',
  'Reading between the lines of your ad data',
  'Decoding the ancient mysteries of Meta Ads Manager',
  'Writing the first draft of your marketing story',
  'Plotting your path to more royalties',
  'Finding the protagonist hiding in your ad performance',
  'Every number tells a story. Finding yours',
  'Your coach is putting on her reading glasses',
  'Calculating your KENP karma',
  'Having a stern word with your underperforming ads',
  'Finding the good news hiding in your numbers',
  'Translating spreadsheet chaos into clear next steps',
  'Building your personalized action plan',
  'Almost there — good things take a moment',
  'Doing the math so you can do the writing',
]

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

  const [files, setFiles] = useState<ParsedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)
  const [stepFade, setStepFade] = useState(true)
  const [shuffledSteps, setShuffledSteps] = useState(ANALYSIS_STEPS)
  const [error, setError] = useState<string | null>(null)
  const [isTouch, setIsTouch] = useState(false)

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
      setAnalyzeStep(0)
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
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/parse-auto', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.type === 'unknown') {
        setFiles(prev => prev.map(f => f.id !== id ? f : { ...f, type: 'unknown', status: 'unknown', data: null }))
      } else {
        setFiles(prev => prev.map(f => f.id !== id ? f : {
          ...f, type: json.type as FileType, status: 'done', data: json.data,
        }))
      }
    } catch {
      setFiles(prev => prev.map(f => f.id !== id ? f : { ...f, status: 'error', data: null }))
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

  async function runAnalysis() {
    setAnalyzing(true)
    setError(null)
    setAnalyzeStep(0)

    const shuffled = [...ANALYSIS_STEPS].sort(() => Math.random() - 0.5)
    setShuffledSteps(shuffled)
    let stepIdx = 0
    const interval = setInterval(() => {
      stepIdx++
      if (stepIdx < shuffled.length) {
        setStepFade(false)
        const next = stepIdx
        setTimeout(() => { setAnalyzeStep(next); setStepFade(true) }, 250)
      }
    }, 3000)

    try {
      const mlRes  = await fetch('/api/mailerlite').catch(() => null)
      const mlData = mlRes?.ok ? (await mlRes.json()).data : null
      const month  = new Date().toISOString().substring(0, 7)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kdp: kdpData, meta: metaData, mailerLite: mlData, pinterest: pinData, month }),
      })

      clearInterval(interval)

      if (res.ok) {
        onSuccess()
        const uploadedCount = [kdpData, metaData, pinData].filter(Boolean).length
        let redirectTo = '/dashboard'
        if (uploadedCount === 0 && mlData) {
          redirectTo = '/dashboard/mailerlite'
        } else if (uploadedCount === 1) {
          if (metaData)     redirectTo = '/dashboard/meta'
          else if (kdpData) redirectTo = '/dashboard/kdp'
          else if (pinData) redirectTo = '/dashboard/pinterest'
        }
        setTimeout(() => router.push(redirectTo + '?fresh=1'), 400)
      } else {
        throw new Error('Analysis failed')
      }
    } catch {
      clearInterval(interval)
      setAnalyzing(false)
      setError('Something went wrong. Please try again.')
    }
  }

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
              background: 'white',
              border: '1px solid #EEEBE6',
              maxHeight: '100dvh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid #EEEBE6' }}>
              <div className="text-[15px] font-semibold" style={{ color: '#1E2D3D' }}>
                Upload Your Data Files
              </div>
              {!analyzing && (
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
              )}
            </div>

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
                /* ── Analyzing state ── */
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="text-6xl mb-6" style={{ animation: 'bookBounce 1.4s ease-in-out infinite' }}>
                    📖
                  </div>
                  <div className="text-[15px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>
                    Reading your files...
                  </div>
                  <div
                    className="text-[13px] px-4 max-w-xs"
                    style={{
                      color: '#6B7280',
                      opacity: stepFade ? 1 : 0,
                      transition: 'opacity 0.25s ease',
                      minHeight: 40,
                    }}
                  >
                    {shuffledSteps[analyzeStep]}
                  </div>
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

          {/* Book bounce animation */}
          <style>{`
            @keyframes bookBounce {
              0%, 100% { transform: translateY(0) scale(1); }
              40%       { transform: translateY(-8px) scale(1.08); }
              60%       { transform: translateY(-4px) scale(1.04); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
