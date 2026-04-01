'use client'
// app/dashboard/upload/page.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { KDPData, MetaData, PinterestData } from '@/types'
import { getCoachTitle } from '@/lib/coachTitle'

type FileType = 'kdp' | 'meta' | 'pinterest' | 'adtracker' | 'unknown'
type FileStatus = 'reading' | 'done' | 'error' | 'unknown' | 'reprocessing'

interface ParsedFile {
  id: string
  filename: string
  type: FileType
  status: FileStatus
  data: KDPData | MetaData | PinterestData | null
  summary: string
  reprocessError?: string
}

const TYPE_INFO: Record<Exclude<FileType, 'unknown'>, { icon: string; label: string }> = {
  kdp:       { icon: '📚', label: 'KDP Report' },
  meta:      { icon: '📣', label: 'Meta Ads' },
  pinterest: { icon: '📌', label: 'Pinterest' },
  adtracker: { icon: '📊', label: 'Ad Tracker' },
}

const REPROCESS_OPTIONS: Array<{ label: string; type: FileType; hint: string }> = [
  { label: 'This is my KDP Report',       type: 'kdp',       hint: 'Excel · kdp.amazon.com → Reports → Month-end Report' },
  { label: 'This is my Meta Ads export',  type: 'meta',      hint: 'CSV · Ads Manager → Export' },
  { label: 'This is my Ad Tracker',       type: 'adtracker', hint: 'Excel · AD_TRACKER_ file' },
  { label: 'This is my Pinterest CSV',    type: 'pinterest',  hint: 'CSV · analytics.pinterest.com → Export' },
]

const PLATFORM_ERRORS: Record<string, string> = {
  kdp:       "Couldn't read this as a KDP report. Make sure it's the Month-end Excel from kdp.amazon.com → Reports.",
  meta:      "Couldn't read this as a Meta Ads export. Download as CSV from Ads Manager → select date range → Export.",
  pinterest: "Couldn't read this as a Pinterest export. Use analytics.pinterest.com → Overview → Export → CSV.",
  adtracker: "Couldn't import from this Ad Tracker file — check it has data within the last 21 days with spend > 0.",
}

function CyclingDots() {
  const [dots, setDots] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 3) + 1), 500)
    return () => clearInterval(id)
  }, [])
  return <span className="inline-block ml-0.5 w-4 text-left">{'.'.repeat(dots)}</span>
}

const ANALYSIS_STEPS = [
  // What's actually happening — crunching
  'Crunching your KDP numbers',
  'Tallying up your royalties',
  'Counting every single page read',
  'Adding up your ad spend',
  'Cross-referencing your clicks',
  'Calculating your cost per reader',
  'Measuring your rank trajectory',
  // Magical / enchanting
  'Enchanting your spreadsheets into wisdom',
  'Conjuring insights from your royalty data',
  'Weaving your ad numbers into a story',
  'Summoning your best performing tropes',
  'Sprinkling dashboard magic on your KENP reads',
  // Fun / personality
  'Schlepping through your Meta export with great enthusiasm',
  'Perusing every last click with enormous curiosity',
  'Interrogating your underperforming ads',
  'Having a stern word with your bounce rate',
  'Convincing your data to tell the truth',
  'Doing the math so you can do the writing',
  // Warm / encouraging
  'Finding the good news hiding in your numbers',
  'Spotting the pattern your future self will thank you for',
  'Building your personalized action plan',
  'Almost there — good things take a moment',
  'Your coach is putting on her reading glasses',
  'Translating spreadsheet chaos into clear next steps',
]

const FILE_HELP = [
  {
    label: '📚 KDP Report',
    steps: 'kdp.amazon.com → Reports → Month-end Report → Download Excel',
  },
  {
    label: '📣 Meta Ads',
    steps: 'Ads Manager → select your date range → Export → CSV',
  },
  {
    label: '📌 Pinterest',
    steps: 'analytics.pinterest.com → Overview → Export → select date range',
  },
  {
    label: '📊 Ad Tracker',
    steps: 'Your AD_TRACKER_ Excel file — the one you use to log daily ad spend',
  },
]

// ── Cloud import buttons ─────────────────────────────────────────────────────
const CLOUD_SERVICES = [
  { key: 'gdrive',   label: 'Google Drive',  icon: '📁' },
  { key: 'dropbox',  label: 'Dropbox',       icon: '📦' },
  { key: 'icloud',   label: 'iCloud Drive',  icon: '☁️' },
  { key: 'onedrive', label: 'OneDrive',      icon: '💾' },
]

function ImportFromCloud({ onFile }: { onFile: (files: FileList | null) => void }) {
  const [showTip, setShowTip] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleClick(key: string) {
    if (key === 'icloud') {
      setShowTip('icloud')
      return
    }
    // For Google Drive, Dropbox, OneDrive — fall back to native file picker
    // when API keys aren't configured (graceful degradation)
    setShowTip(key)
  }

  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        Or import from
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {CLOUD_SERVICES.map(s => (
          <button
            key={s.key}
            onClick={() => handleClick(s.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold
                       transition-all hover:bg-white/[0.06]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span className="text-[14px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {showTip === 'icloud' && (
        <div className="rounded-lg p-3 mb-2 text-[12px] leading-relaxed"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: 'rgba(255,255,255,0.6)' }}>
          <strong style={{ color: '#38bdf8' }}>iCloud Drive:</strong> Open the Files app on your Mac → iCloud Drive → find your file → drag it into the box above. Takes 10 seconds!
          <button onClick={() => setShowTip(null)} className="ml-2 text-[10px] opacity-50" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>dismiss</button>
        </div>
      )}

      {(showTip === 'gdrive' || showTip === 'dropbox' || showTip === 'onedrive') && (
        <div className="rounded-lg p-3 mb-2 text-[12px] leading-relaxed"
          style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.2)', color: 'rgba(255,255,255,0.6)' }}>
          <strong style={{ color: '#e9a020' }}>
            {showTip === 'gdrive' ? 'Google Drive' : showTip === 'dropbox' ? 'Dropbox' : 'OneDrive'}:
          </strong>{' '}
          Download your file from {showTip === 'gdrive' ? 'Google Drive' : showTip === 'dropbox' ? 'Dropbox' : 'OneDrive'} to your computer first, then drag it here.
          Once your admin connects the {showTip === 'gdrive' ? 'Google Drive' : showTip === 'dropbox' ? 'Dropbox' : 'OneDrive'} API, you&apos;ll be able to import directly.
          <button onClick={() => { setShowTip(null); fileRef.current?.click() }}
            className="ml-2 text-[11px] font-semibold underline" style={{ background: 'none', border: 'none', color: '#e9a020', cursor: 'pointer' }}>
            Browse files instead →
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => { onFile(e.target.files); setShowTip(null) }} />

      {/* Having trouble? */}
      <details className="mt-3">
        <summary className="text-[11px] font-semibold cursor-pointer"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Having trouble finding your files?
        </summary>
        <div className="mt-2 rounded-lg p-3 space-y-1.5 text-[11.5px] leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
          <div><strong style={{ color: 'rgba(255,255,255,0.6)' }}>KDP report:</strong> kdp.amazon.com → Reports → Download a report → Month-end report</div>
          <div><strong style={{ color: 'rgba(255,255,255,0.6)' }}>Meta ads:</strong> Ads Manager → Export → CSV (set your date range first)</div>
          <div><strong style={{ color: 'rgba(255,255,255,0.6)' }}>Pinterest:</strong> analytics.pinterest.com → Export</div>
          <div><strong style={{ color: 'rgba(255,255,255,0.6)' }}>Ad Tracker:</strong> Wherever you saved your coaching Excel file</div>
        </div>
      </details>
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [step, setStep] = useState(0)
  const [stepFade, setStepFade] = useState(true)
  const [progress, setProgress] = useState(0)
  const [shuffledSteps, setShuffledSteps] = useState(ANALYSIS_STEPS)
  const [done, setDone] = useState(false)
  const [showFileHelp, setShowFileHelp] = useState(false)

  async function reprocessAs(fileId: string, file: File | null, type: FileType) {
    if (type === 'adtracker') {
      if (!file) return
      setFiles(prev => prev.map(f => f.id !== fileId ? f : {
        ...f, status: 'reprocessing', reprocessError: undefined,
      }))
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/parse-roas-import', { method: 'POST', body: formData })
        const json = await res.json()
        if (json.success) {
          setFiles(prev => prev.map(f => f.id !== fileId ? f : {
            ...f, type: 'adtracker', status: 'done', summary: json.message || `Imported ${json.imported} days`,
          }))
        } else {
          setFiles(prev => prev.map(f => f.id !== fileId ? f : {
            ...f, status: 'unknown', reprocessError: json.error || PLATFORM_ERRORS.adtracker,
          }))
        }
      } catch {
        setFiles(prev => prev.map(f => f.id !== fileId ? f : {
          ...f, status: 'unknown', reprocessError: PLATFORM_ERRORS.adtracker,
        }))
      }
      return
    }

    if (!file) return
    setFiles(prev => prev.map(f => f.id !== fileId ? f : {
      ...f, status: 'reprocessing', reprocessError: undefined,
    }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      const res = await fetch('/api/parse-typed', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success) {
        setFiles(prev => prev.map(f => f.id !== fileId ? f : {
          ...f, type: json.type as FileType, status: 'done', data: json.data, summary: json.summary || '',
        }))
      } else {
        setFiles(prev => prev.map(f => f.id !== fileId ? f : {
          ...f, status: 'unknown', reprocessError: PLATFORM_ERRORS[type] || 'Could not read this file.',
        }))
      }
    } catch {
      setFiles(prev => prev.map(f => f.id !== fileId ? f : {
        ...f, status: 'unknown', reprocessError: PLATFORM_ERRORS[type] || 'Could not read this file.',
      }))
    }
  }

  // Store raw File objects to re-submit them
  const rawFiles = useRef<Map<string, File>>(new Map())

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    Array.from(incoming).slice(0, 10).forEach(file => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`
      rawFiles.current.set(id, file)
      // processFile uses its own id generation — we need to link them
      // So let's pass id directly
      processFileWithId(file, id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processFileWithId(file: File, id: string) {
    rawFiles.current.set(id, file)
    setFiles(prev => [...prev, {
      id, filename: file.name, type: 'unknown', status: 'reading', data: null, summary: '',
    }])

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/parse-auto', { method: 'POST', body: formData })
      const json = await res.json()

      if (json.type === 'unknown') {
        setFiles(prev => prev.map(f => f.id !== id ? f : {
          ...f, type: 'unknown', status: 'unknown', data: null, summary: '',
        }))
      } else {
        setFiles(prev => prev.map(f => f.id !== id ? f : {
          ...f,
          type: json.type as FileType,
          status: 'done',
          data: json.data,
          summary: json.summary || '',
        }))
      }
    } catch {
      setFiles(prev => prev.map(f => f.id !== id ? f : {
        ...f, status: 'error', summary: 'Something went wrong reading this file.',
      }))
    }
  }

  // Last recognized file wins per type (exclude adtracker — it goes to ROAS, not analysis)
  const byType = new Map<FileType, ParsedFile>()
  files.filter(f => f.status === 'done' && f.type !== 'unknown' && f.type !== 'adtracker')
    .forEach(f => byType.set(f.type, f))
  const kdpData  = (byType.get('kdp')?.data as KDPData | undefined) ?? null
  const metaData = (byType.get('meta')?.data as MetaData | undefined) ?? null
  const pinData  = (byType.get('pinterest')?.data as PinterestData | undefined) ?? null
  const hasAny   = !!(kdpData || metaData || pinData)
  const allReading = files.some(f => f.status === 'reading' || f.status === 'reprocessing')
  const allDone = files.length > 0 && files.every(f =>
    (f.status === 'done' && f.type !== 'unknown') || f.status === 'unknown'
  )

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

    // Shuffle messages and cycle every 3s
    const shuffled = [...ANALYSIS_STEPS].sort(() => Math.random() - 0.5)
    setShuffledSteps(shuffled)
    let stepIdx = 0
    const startTime = Date.now()
    const interval = setInterval(() => {
      stepIdx++
      if (stepIdx < shuffled.length) {
        setStepFade(false)
        const nextIdx = stepIdx
        setTimeout(() => { setStep(nextIdx); setStepFade(true) }, 250)
      } else {
        clearInterval(interval)
      }
      // Progress bar fills smoothly over ~20s
      const elapsed = Date.now() - startTime
      setProgress(Math.min(Math.round((elapsed / 20000) * 90), 90))
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
            {/* Drop zone */}
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
                <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: 300 }}>
                  <div className="text-5xl mb-4">📂</div>
                  <div className="text-[18px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Drop your files here
                  </div>
                  <div className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Click here to browse for your file · up to 10 files · KDP, Meta Ads, Pinterest
                  </div>
                  <button
                    className="px-6 py-3 rounded-xl text-[14px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
                    style={{ background: '#e9a020', color: '#0d1f35' }}
                    onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                  >
                    Browse for file
                  </button>
                </div>
              ) : (
                <div className="p-4" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {files.length} file{files.length !== 1 ? 's' : ''} added
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                        className="text-[12px] font-semibold transition-colors"
                        style={{ color: '#e9a020' }}
                      >
                        + Add more
                      </button>
                      <button
                        onClick={() => { setFiles([]); rawFiles.current.clear() }}
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
                      const isReading     = f.status === 'reading'
                      const isReprocessing = f.status === 'reprocessing'
                      const isUnknown     = f.status === 'unknown'
                      const isError       = f.status === 'error'
                      const isReady       = f.status === 'done' && f.type !== 'unknown'
                      const isAdTracker   = f.type === 'adtracker' && f.status === 'done'

                      return (
                        <div key={f.id}>
                          {/* File row */}
                          <div
                            className="flex items-center gap-3 rounded-lg px-4 py-3"
                            style={{
                              background: isReady
                                ? 'rgba(52,211,153,0.07)'
                                : isUnknown || isError
                                ? 'rgba(251,191,36,0.07)'
                                : 'rgba(255,255,255,0.05)',
                              border: isReady
                                ? '1px solid rgba(52,211,153,0.2)'
                                : isUnknown || isError
                                ? '1px solid rgba(251,191,36,0.25)'
                                : '1px solid transparent',
                            }}
                          >
                            <span className="text-xl flex-shrink-0">
                              {isReading || isReprocessing ? (
                                <span className="inline-block animate-spin">⏳</span>
                              ) : isError ? '❌'
                                : isUnknown ? '❓'
                                : info?.icon ?? '✅'}
                            </span>

                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold truncate"
                                style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {f.filename}
                              </div>
                              <div className="text-[11px] mt-0.5"
                                style={{
                                  color: isReading || isReprocessing
                                    ? 'rgba(255,255,255,0.35)'
                                    : isError
                                    ? '#f87171'
                                    : isUnknown
                                    ? '#fbbf24'
                                    : '#34d399',
                                }}>
                                {isReading ? 'Reading...'
                                  : isReprocessing ? 'Reading your file...'
                                  : isError ? f.summary
                                  : isUnknown
                                  ? (f.reprocessError || "We didn't recognize this file automatically — select what it is below")
                                  : isAdTracker
                                  ? `${info!.label} · ${f.summary} → saved to ROAS tracker`
                                  : `${info!.label} · ${f.summary}`}
                              </div>
                            </div>

                            {isReady && (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                                Ready ✓
                              </span>
                            )}
                            {isAdTracker && (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                                Imported ✓
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setFiles(prev => prev.filter(x => x.id !== f.id))
                                rawFiles.current.delete(f.id)
                              }}
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                                         text-[14px] transition-all hover:bg-white/10"
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                              title="Remove file"
                            >
                              ×
                            </button>
                          </div>

                          {/* "What is it?" panel — shown for unknown files */}
                          {isUnknown && (
                            <div className="mx-1 mt-1 mb-1 rounded-b-lg px-4 py-3"
                              style={{ background: 'rgba(233,160,32,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderTop: 'none' }}>
                              <div className="text-[11px] font-bold uppercase tracking-[0.8px] mb-2.5"
                                style={{ color: 'rgba(255,255,255,0.4)' }}>
                                What is this file?
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {REPROCESS_OPTIONS.map(opt => (
                                  <button
                                    key={opt.type}
                                    onClick={() => reprocessAs(f.id, rawFiles.current.get(f.id) ?? null, opt.type)}
                                    className="flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all hover:scale-[1.02]"
                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                                  >
                                    <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                      {opt.label}
                                    </span>
                                    <span className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                      {opt.hint}
                                    </span>
                                  </button>
                                ))}
                                <button
                                  onClick={() => {
                                    setFiles(prev => prev.filter(x => x.id !== f.id))
                                    rawFiles.current.delete(f.id)
                                  }}
                                  className="flex flex-col items-start px-3 py-2 rounded-lg text-left transition-all hover:scale-[1.02]"
                                  style={{ background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.15)' }}
                                >
                                  <span className="text-[12px] font-semibold" style={{ color: '#f87171' }}>
                                    Skip this file
                                  </span>
                                  <span className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    Remove from queue
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                    Drop more files here or click "+ Add more"
                  </div>
                </div>
              )}
            </div>

            {/* MailerLite auto row */}
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 mb-4"
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

            {/* Import from cloud row */}
            <ImportFromCloud onFile={handleFiles} />

            {/* Collapsible: What files do I need? */}
            <div className="mb-5">
              <button
                onClick={() => setShowFileHelp(s => !s)}
                className="flex items-center gap-2 text-[12px] font-semibold transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <span style={{ transform: showFileHelp ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                What files do I need?
              </button>
              {showFileHelp && (
                <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {FILE_HELP.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3"
                      style={{ borderBottom: i < FILE_HELP.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-[13px] font-semibold w-36 flex-shrink-0"
                        style={{ color: 'rgba(255,255,255,0.7)' }}>{item.label}</div>
                      <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.steps}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
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
          <div className="text-center py-10">
            {done ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl"
                  style={{ background: 'rgba(52,211,153,0.15)' }}>
                  ✅
                </div>
                <div className="text-[24px] font-semibold text-white mb-2">
                  Your dashboard is ready!
                </div>
                <p className="text-[14px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Everything&apos;s been analyzed. Opening now...
                </p>
                <button
                  onClick={() => router.push('/dashboard?fresh=1')}
                  className="px-8 py-3.5 rounded-xl text-[15px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
                  style={{ background: '#e9a020', color: '#0d1f35' }}
                >
                  View my dashboard →
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl animate-pulse"
                  style={{ background: 'rgba(233,160,32,0.15)' }}>
                  ⚙️
                </div>
                <div className="text-[20px] font-semibold text-white mb-2">
                  {`${getCoachTitle().replace(' says', '')} is reading everything…`}
                </div>
                <div className="text-[13px] mb-5 transition-opacity duration-200"
                  style={{ color: 'rgba(255,255,255,0.5)', opacity: stepFade ? 1 : 0 }}>
                  {shuffledSteps[step]}
                  <CyclingDots />
                </div>
                <div className="max-w-[300px] mx-auto h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #e9a020, #f4c542)' }} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
