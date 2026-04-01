'use client'
// app/dashboard/upload/page.tsx
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { KDPData, MetaData, PinterestData } from '@/types'
import { getCoachTitle } from '@/lib/coachTitle'

type FileType = 'kdp' | 'meta' | 'pinterest' | 'unknown'
type FileStatus = 'reading' | 'done' | 'error'

interface ParsedFile {
  id: string
  filename: string
  type: FileType
  status: FileStatus
  data: KDPData | MetaData | PinterestData | null
  summary: string
}

const TYPE_INFO: Record<Exclude<FileType, 'unknown'>, { icon: string; label: string }> = {
  kdp:       { icon: '📚', label: 'KDP Report' },
  meta:      { icon: '📣', label: 'Meta Ads' },
  pinterest: { icon: '📌', label: 'Pinterest' },
}

const ANALYSIS_STEPS = [
  'Cracking open your KDP report...',
  'Ooh interesting — counting your page reads...',
  'Tallying up those royalties (nice)...',
  'Peeking at your ad spend...',
  'Calculating your CTR — this one\'s good...',
  'Checking in on your email list...',
  'Cross-referencing everything...',
  `${getCoachTitle().replace(' says', '')} is connecting the dots...`,
  'Almost there — writing your action plan...',
  'Putting the finishing touches on your session...',
]

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [step,      setStep]      = useState(0)
  const [stepFade,  setStepFade]  = useState(true)
  const [progress,  setProgress]  = useState(0)
  const [done,      setDone]      = useState(false)

  async function processFile(file: File) {
    const id = `${file.name}-${Date.now()}-${Math.random()}`
    setFiles(prev => [...prev, {
      id, filename: file.name, type: 'unknown', status: 'reading', data: null, summary: '',
    }])

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/parse-auto', { method: 'POST', body: formData })
      const json = await res.json()
      setFiles(prev => prev.map(f => f.id !== id ? f : {
        ...f,
        type: json.type as FileType,
        status: json.type === 'unknown' ? 'error' : 'done',
        data: json.data,
        summary: json.summary || '',
      }))
    } catch {
      setFiles(prev => prev.map(f => f.id !== id ? f : {
        ...f, status: 'error', summary: 'Something went wrong reading this file.',
      }))
    }
  }

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    Array.from(incoming).slice(0, 10).forEach(processFile)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Last recognized file wins per type
  const byType = new Map<FileType, ParsedFile>()
  files.filter(f => f.status === 'done' && f.type !== 'unknown').forEach(f => byType.set(f.type, f))
  const kdpData   = (byType.get('kdp')?.data as KDPData | undefined)           ?? null
  const metaData  = (byType.get('meta')?.data as MetaData | undefined)         ?? null
  const pinData   = (byType.get('pinterest')?.data as PinterestData | undefined) ?? null
  const hasAny    = !!(kdpData || metaData || pinData)
  const allReading = files.some(f => f.status === 'reading')
  const allDone   = files.length > 0 && files.every(f => f.status === 'done' && f.type !== 'unknown')

  // Border color: green when all files recognized, amber while dragging, default otherwise
  const borderColor = allDone
    ? '#34d399'
    : dragging
    ? '#e9a020'
    : files.length > 0
    ? 'rgba(255,255,255,0.15)'
    : 'rgba(255,255,255,0.2)'

  const bgColor = dragging
    ? 'rgba(233,160,32,0.08)'
    : 'rgba(255,255,255,0.03)'

  async function runAnalysis() {
    setAnalyzing(true)
    setStep(0)
    setProgress(0)

    let stepIdx = 0
    const interval = setInterval(() => {
      stepIdx++
      if (stepIdx < ANALYSIS_STEPS.length) {
        setStepFade(false)
        setTimeout(() => {
          setStep(stepIdx)
          setStepFade(true)
        }, 250)
        setProgress(Math.round((stepIdx / ANALYSIS_STEPS.length) * 100))
      } else {
        clearInterval(interval)
      }
    }, 1500)

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
      setProgress(100)

      if (res.ok) {
        setDone(true)
        const uploadedCount = [kdpData, metaData, pinData].filter(Boolean).length
        let redirectTo = '/dashboard'
        if (uploadedCount === 0 && mlData) {
          redirectTo = '/dashboard/mailerlite'
        } else if (uploadedCount === 1) {
          if (metaData)     redirectTo = '/dashboard/meta'
          else if (kdpData) redirectTo = '/dashboard/kdp'
          else if (pinData) redirectTo = '/dashboard/pinterest'
        }
        setTimeout(() => router.push(redirectTo + '?fresh=1'), 1500)
      } else {
        throw new Error('Analysis failed')
      }
    } catch {
      clearInterval(interval)
      setAnalyzing(false)
      alert('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="rounded-xl p-8 mb-6" style={{ background: '#0d1f35' }}>
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-2.5" style={{ color: '#e9a020' }}>
          Monthly Analysis
        </div>
        <h1 className="font-serif text-[30px] text-white leading-snug mb-2">
          Drop all your files.<br />We'll figure out the rest.
        </h1>
        <p className="text-[13.5px] mb-7 leading-relaxed max-w-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Drop up to 10 files at once — your KDP report, Meta export, Pinterest CSV.
          We automatically recognize each one. No labels needed.
        </p>

        {!analyzing ? (
          <>
            {/* Drop zone — expands to contain files */}
            <div
              className="rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 mb-5"
              style={{ borderColor, background: bgColor }}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />

              {files.length === 0 ? (
                /* ── Empty state ──────────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="text-5xl mb-4">📂</div>
                  <div className="text-[16px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Drop your files here
                  </div>
                  <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    or click to browse · up to 10 files · KDP, Meta Ads, Pinterest
                  </div>
                </div>
              ) : (
                /* ── Files inside the box ─────────────────────────────── */
                <div className="p-4" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {files.length} file{files.length !== 1 ? 's' : ''} added
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Add more — opens file picker without closing the zone */}
                      <button
                        onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                        className="text-[12px] font-semibold transition-colors"
                        style={{ color: '#e9a020' }}
                      >
                        + Add more
                      </button>
                      <button
                        onClick={() => setFiles([])}
                        className="text-[12px] transition-colors hover:underline"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Start over
                      </button>
                    </div>
                  </div>

                  {/* File rows */}
                  <div className="space-y-2">
                    {files.map(f => {
                      const info = f.type !== 'unknown' ? TYPE_INFO[f.type as Exclude<FileType, 'unknown'>] : null
                      const isReading = f.status === 'reading'
                      const isError   = f.type === 'unknown' && f.status === 'error'
                      const isReady   = f.status === 'done' && f.type !== 'unknown'

                      return (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 rounded-lg px-4 py-3"
                          style={{
                            background: isReady
                              ? 'rgba(52,211,153,0.07)'
                              : isError
                              ? 'rgba(251,113,133,0.07)'
                              : 'rgba(255,255,255,0.05)',
                            border: isReady
                              ? '1px solid rgba(52,211,153,0.2)'
                              : isError
                              ? '1px solid rgba(251,113,133,0.2)'
                              : '1px solid transparent',
                          }}
                        >
                          {/* Status icon */}
                          <span className="text-xl flex-shrink-0">
                            {isReading ? (
                              <span className="inline-block animate-spin">⏳</span>
                            ) : isError ? (
                              '❌'
                            ) : (
                              info?.icon ?? '✅'
                            )}
                          </span>

                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold truncate"
                              style={{ color: 'rgba(255,255,255,0.8)' }}>
                              {f.filename}
                            </div>
                            <div className="text-[11px] mt-0.5"
                              style={{
                                color: isReading
                                  ? 'rgba(255,255,255,0.35)'
                                  : isError
                                  ? '#f87171'
                                  : '#34d399',
                              }}>
                              {isReading
                                ? 'Reading...'
                                : isError
                                ? "We couldn't recognize this file — check it's a KDP, Meta Ads, or Pinterest export"
                                : `${info!.label} · ${f.summary}`}
                            </div>
                          </div>

                          {/* Ready badge */}
                          {isReady && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                              Ready ✓
                            </span>
                          )}

                          {/* Remove button */}
                          <button
                            onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                                       text-[14px] transition-all hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Drop-more hint at bottom of box */}
                  <div className="mt-3 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                    Drop more files here or click "+ Add more"
                  </div>
                </div>
              )}
            </div>

            {/* MailerLite auto row */}
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 mb-6"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                style={{ background: 'rgba(233,160,32,0.15)' }}>⚡</div>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Email stats pulled automatically
                </div>
                <div className="text-[11px] font-semibold" style={{ color: '#34d399' }}>
                  ✓ No file needed — always included
                </div>
              </div>
            </div>

            {/* CTA — shown only when at least one file is ready */}
            {hasAny && (
              <button
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-[15px] font-bold
                           transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#e9a020', color: '#0d1f35' }}
                disabled={allReading}
                onClick={runAnalysis}
              >
                See what's working and what to do next →
              </button>
            )}

            {!hasAny && !allReading && files.length === 0 && (
              <p className="text-[11.5px] mt-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Drop at least one file above to get started.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${!done ? 'animate-pulse' : ''}`}
              style={{ background: 'rgba(233,160,32,0.15)' }}>
              {done ? '✅' : '⚙️'}
            </div>
            <div className="font-serif text-[22px] text-white mb-2">
              {done ? 'Done! Opening your dashboard...' : `${getCoachTitle('upload').replace(' says', '')} is reading everything…`}
            </div>
            <div className="text-[13px] mb-5 transition-opacity duration-200"
              style={{ color: 'rgba(255,255,255,0.5)', opacity: stepFade ? 1 : 0 }}>
              {ANALYSIS_STEPS[step]}
            </div>
            <div className="max-w-[300px] mx-auto h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: '#e9a020' }} />
            </div>
          </div>
        )}
      </div>

      {/* How to export */}
      <div className="card p-5">
        <div className="text-[13px] font-bold text-[#0d1f35] mb-3">Where to find your files</div>
        <div className="space-y-2 text-[12.5px] text-stone-500 leading-relaxed">
          <div>
            <strong className="text-stone-700">📚 KDP:</strong>{' '}
            kdp.amazon.com → Reports → Month-end Report → Download Excel
          </div>
          <div>
            <strong className="text-stone-700">📣 Meta Ads:</strong>{' '}
            Ads Manager → select your date range → Export → CSV
          </div>
          <div>
            <strong className="text-stone-700">📌 Pinterest:</strong>{' '}
            analytics.pinterest.com → Overview → Export → select date range
          </div>
        </div>
      </div>
    </div>
  )
}
