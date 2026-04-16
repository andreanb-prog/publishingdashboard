'use client'
// components/UploadModal.tsx — full-page upload modal triggered from TopBar
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, BarChart2, BookOpen, Sparkles, CheckCircle, Upload } from 'lucide-react'
import type { KDPData, BookData, MetaData, PinterestData, ParseDiagnostics } from '@/types'

type FileType = 'kdp' | 'meta' | 'pinterest' | 'adtracker' | 'unknown'
type FileStatus = 'reading' | 'done' | 'error' | 'unknown'
type StageId = 1 | 2 | 3 | 4 | 5

interface ParsedFile {
  id: string
  filename: string
  type: FileType
  status: FileStatus
  data: KDPData | MetaData | PinterestData | null
  errorMessage?: string
  summary?: string
  diagnostics?: ParseDiagnostics
}

interface StageInfo {
  id: StageId
  percent: number
  title: string
  icon: 'fileup' | 'barchart' | 'bookopen' | 'sparkles' | 'celebrate'
}

const STAGES: StageInfo[] = [
  { id: 1, percent: 12,  title: 'Uploading your file',  icon: 'fileup'    },
  { id: 2, percent: 35,  title: 'Processing data',      icon: 'barchart'  },
  { id: 3, percent: 58,  title: 'Matching books',       icon: 'bookopen'  },
  { id: 4, percent: 82,  title: 'Running AI analysis',  icon: 'sparkles'  },
  { id: 5, percent: 100, title: 'Done!',                icon: 'celebrate' },
]

const CYCLING_MESSAGES = [
  'Turning your data into strategy...',
  'Finding the story in your numbers...',
  'Your coach is reviewing the data...',
  'Almost there — the good stuff is loading...',
  'Connecting the dots across your channels...',
  'Your publishing picture is coming into focus...',
]

const SLOW_MESSAGES: Record<StageId, string> = {
  1: 'Large file — still reading...',
  2: 'Checking every column — one moment...',
  3: 'Still saving — almost there...',
  4: 'Still working — large files take a moment...',
  5: '',
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

function FileUpIcon()      { return <FileUp size={32} color="#E9A020" strokeWidth={1.5} /> }
function BarChartIcon()    { return <BarChart2 size={32} color="#F97B6B" strokeWidth={1.5} /> }
function BookOpenIcon()    { return <BookOpen size={32} color="#8B5CF6" strokeWidth={1.5} /> }
function SparklesIcon()    { return <Sparkles size={32} color="#E9A020" strokeWidth={1.5} style={{ animation: 'stageSparklesPulse 1.5s ease-in-out infinite' }} /> }
function CelebrationIcon() { return <CheckCircle size={32} color="#6EBF8B" strokeWidth={1.5} style={{ animation: 'stageCelebrate 0.6s ease-out' }} /> }

const BADGE: Record<FileType, { label: string; bg: string; color: string }> = {
  kdp:       { label: 'KDP',        bg: '#FFF4E0', color: '#E9A020' },
  meta:      { label: 'Meta Ads',   bg: '#EFF6FF', color: '#60A5FA' },
  pinterest: { label: 'Pinterest',  bg: '#FFF0F3', color: '#F472B6' },
  adtracker: { label: 'Ad Tracker', bg: '#FFF4E0', color: '#E9A020' },
  unknown:   { label: 'Unknown — we\'ll try to read it', bg: '#FFF4E0', color: '#E9A020' },
}

// ── KDP multi-file merge ────────────────────────────────────────────────────
function mergeKDPFiles(kdpFiles: ParsedFile[]): { data: KDPData; monthCount: number; monthRange: string } | null {
  const dataList = kdpFiles.filter(f => f.data).map(f => f.data as KDPData)
  if (!dataList.length) return null

  // Deduplicate by month — last uploaded wins for the same month
  const byMonth = new Map<string, KDPData>()
  for (const d of dataList) byMonth.set(d.month, d)
  const unique = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))

  // Merge daily data — Map keyed by date prevents double-counting
  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()
  for (const d of unique) {
    for (const { date, value } of d.dailyUnits) dailyUnitsMap.set(date, value)
    for (const { date, value } of d.dailyKENP)  dailyKENPMap.set(date, value)
  }

  // Merge books by ASIN (or title as fallback) — sum across months
  const bookMap = new Map<string, BookData>()
  for (const d of unique) {
    for (const b of d.books) {
      const key = b.asin || b.title
      if (!bookMap.has(key)) {
        bookMap.set(key, { ...b })
      } else {
        const ex = bookMap.get(key)!
        ex.units     += b.units
        ex.kenp      += b.kenp
        ex.royalties += b.royalties
      }
    }
  }

  const books = Array.from(bookMap.values()).sort((a, b) => b.units - a.units)

  const merged: KDPData = {
    month: unique[unique.length - 1].month,
    totalRoyaltiesUSD: unique.reduce((s, d) => s + d.totalRoyaltiesUSD, 0),
    totalUnits: books.reduce((s, b) => s + b.units, 0),
    totalKENP:  books.reduce((s, b) => s + b.kenp,  0),
    books,
    dailyUnits: Array.from(dailyUnitsMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
    dailyKENP:  Array.from(dailyKENPMap.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
    summary: {
      paidUnits:      unique.reduce((s, d) => s + d.summary.paidUnits, 0),
      freeUnits:      unique.reduce((s, d) => s + d.summary.freeUnits, 0),
      paperbackUnits: unique.reduce((s, d) => s + d.summary.paperbackUnits, 0),
    },
  }

  const fmt = (m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const months = unique.map(d => d.month)
  const monthRange = months.length === 1 ? fmt(months[0]) : `${fmt(months[0])} – ${fmt(months[months.length - 1])}`

  return { data: merged, monthCount: months.length, monthRange }
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
  const [kdpDataQuality, setKdpDataQuality] = useState<'SUSPECT_DATA' | 'INCOMPLETE_DATA' | null>(null)
  const [progressPct, setProgressPct]       = useState(0)
  const [expandedDiag, setExpandedDiag]     = useState<Set<string>>(new Set())
  const [error, setError]                   = useState<string | null>(null)
  const [isTouch, setIsTouch]               = useState(false)
  const [cyclingMsgIdx, setCyclingMsgIdx]   = useState(0)
  const [successSummary, setSuccessSummary] = useState<string | null>(null)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // Cycle through brand messages while analyzing
  useEffect(() => {
    if (!analyzing) { setCyclingMsgIdx(0); return }
    const id = setInterval(() => setCyclingMsgIdx(i => (i + 1) % CYCLING_MESSAGES.length), 2500)
    return () => clearInterval(id)
  }, [analyzing])

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
      setKdpDataQuality(null)
      setProgressPct(0)
      setExpandedDiag(new Set())
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
    const isPDF  = name.endsWith('.pdf')
    const isEPUB = name.endsWith('.epub')

    try {
      if (isPDF || isEPUB) {
        update({ type: 'unknown', status: 'error', data: null, errorMessage: `${isEPUB ? 'EPUB' : 'PDF'} files are for manuscript uploads — use the Book Bible tab in your book's settings.` })
        return
      }

      if (isExcel) {
        // Lazily load xlsx so it only hits the bundle when an XLSX file is dropped
        const XLSX = await import('xlsx')
        const buf  = await file.arrayBuffer()
        const wb   = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })

        // KDP-specific sheet names are the most reliable signal — check these first
        const kdpSheetNames = ['Orders Processed', 'KENP Read', 'KENP']
        const hasKdpSheets = wb.SheetNames.some((n: string) => kdpSheetNames.includes(n))

        let detectedType: 'kdp' | 'meta' | null = hasKdpSheets ? 'kdp' : null
        if (!detectedType) {
          // "Worksheet" is the sheet name in Meta's new XLSX export — check it first
          if (wb.SheetNames.includes('Worksheet')) {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets['Worksheet'], { blankrows: false })
            if (csv.includes('Campaign name') || csv.includes('Amount spent') || csv.includes('Impressions')) {
              detectedType = 'meta'
            }
          }
          if (!detectedType) {
            for (const sheetName of wb.SheetNames) {
              const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { blankrows: false })
              if (csv.includes('KENP') || csv.includes('Royalty Date') || csv.includes('Est. KU Royalty')) { detectedType = 'kdp'; break }
              const hits = ['Ad name', 'Amount spent', 'CTR (all)', 'CTR (link', 'CPC (all)', 'Campaign name', 'Ad set name']
                .filter(s => csv.includes(s)).length
              if (hits >= 2) { detectedType = 'meta'; break }
            }
          }
        }

        if (detectedType === 'kdp') {
          const { parseKDPFile } = await import('@/lib/parsers/kdp')
          let kdpResult
          try {
            kdpResult = parseKDPFile(new Uint8Array(buf))
          } catch (parseErr: unknown) {
            const msg = parseErr instanceof Error ? parseErr.message : "This doesn't look like a KDP Royalty Estimator report."
            update({ type: 'unknown', status: 'error', data: null, errorMessage: msg })
            return
          }
          const bookCount = kdpResult.books?.length ?? 0
          const rowCount  = kdpResult.rowCount ?? 0
          const kdpSummary = bookCount > 0
            ? `${rowCount} row${rowCount !== 1 ? 's' : ''} imported for ${bookCount} title${bookCount !== 1 ? 's' : ''}`
            : 'Parsed — no rows found. Make sure you exported All Titles.'
          update({ type: 'kdp', status: 'done', data: kdpResult, summary: kdpSummary, diagnostics: kdpResult.diagnostics })
        } else if (detectedType === 'meta') {
          const { parseMetaFile } = await import('@/lib/parsers/meta')
          // Prefer "Worksheet" sheet (new Meta XLSX format), fall back to first sheet
          const metaSheet = wb.SheetNames.includes('Worksheet') ? 'Worksheet' : wb.SheetNames[0]
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[metaSheet], { blankrows: false })
          const parsedData = parseMetaFile(csv)
          update({ type: 'meta', status: 'done', data: parsedData })
          // Save rows to DB server-side for date-range filtering
          const form = new FormData()
          form.append('file', file)
          fetch('/api/parse-auto', { method: 'POST', body: form }).catch(() => {})
        } else {
          update({
            type: 'unknown', status: 'error', data: null,
            errorMessage: "Can\u2019t identify this file. If it\u2019s your KDP report, download it from KDP \u2192 Reports \u2192 Royalty Estimator and select All Titles.",
          })
        }
      } else {
        // CSV — parse entirely in the browser, no server round-trip
        const text = await file.text()
        const isPin = (text.trimStart().startsWith('Analytics overview') || text.includes('"Analytics overview"')) && text.includes('Impressions')
        const metaHits = ['Ad name', 'Amount spent', 'CTR (all)', 'CTR (link', 'CPC (all)', 'Campaign name', 'Ad set name', 'Impressions']
          .filter(s => text.includes(s)).length

        const lowerText = text.toLowerCase()
        const kdpCsvHits = ['kenp', 'royalt', 'units sold', 'asin', 'marketplace'].filter(s => lowerText.includes(s)).length

        if (isPin) {
          const { parsePinterestFile } = await import('@/lib/parsers/pinterest')
          update({ type: 'pinterest', status: 'done', data: parsePinterestFile(text) })
        } else if (metaHits >= 2) {
          const { parseMetaFile } = await import('@/lib/parsers/meta')
          update({ type: 'meta', status: 'done', data: parseMetaFile(text) })
        } else if (kdpCsvHits >= 2) {
          // KDP flat CSV — XLSX can read CSV buffers directly
          const { parseKDPFile } = await import('@/lib/parsers/kdp')
          const buf = await file.arrayBuffer()
          let kdpResult
          try {
            kdpResult = parseKDPFile(new Uint8Array(buf))
          } catch (parseErr: unknown) {
            const msg = parseErr instanceof Error ? parseErr.message : "This doesn't look like a KDP Royalty Estimator report."
            update({ type: 'unknown', status: 'error', data: null, errorMessage: msg })
            return
          }
          const bookCount = kdpResult.books?.length ?? 0
          const rowCount  = kdpResult.rowCount ?? 0
          const kdpSummary = bookCount > 0
            ? `${rowCount} row${rowCount !== 1 ? 's' : ''} imported for ${bookCount} title${bookCount !== 1 ? 's' : ''}`
            : 'Parsed — no rows found. Make sure you exported All Titles.'
          update({ type: 'kdp', status: 'done', data: kdpResult, summary: kdpSummary, diagnostics: kdpResult.diagnostics })
        } else {
          update({
            type: 'unknown', status: 'error', data: null,
            errorMessage: "Can\u2019t identify this file. Expected: KDP report (.xlsx), Meta Ads (.csv or .xlsx), or Pinterest (.csv).",
          })
        }
      }
    } catch {
      update({ status: 'error', data: null, errorMessage: "Could not read this file. Make sure it's a KDP .xlsx, Meta .csv/.xlsx, or Pinterest .csv export." })
    }
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
    rawFiles.current.delete(id)
  }

  // Derive data for analysis
  const doneFiles = files.filter(f => f.status === 'done' && f.type !== 'unknown' && f.type !== 'adtracker')
  // KDP: collect ALL files and merge (deduplicates by month, combines across months)
  const kdpFiles   = doneFiles.filter(f => f.type === 'kdp')
  const kdpMerged  = mergeKDPFiles(kdpFiles)
  const kdpData    = kdpMerged?.data ?? null
  // Other types: last uploaded wins
  const byType = new Map<FileType, ParsedFile>()
  doneFiles.filter(f => f.type !== 'kdp').forEach(f => byType.set(f.type, f))
  const metaData = (byType.get('meta')?.data as MetaData      | undefined) ?? null
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
      if (!res.ok || !res.body) {
        let errText = ''
        try { errText = await res.text() } catch { /* ignore */ }
        console.error('[upload] /api/analyze failed', res?.status, errText)
        throw new Error(errText || `Server error ${res?.status ?? 'unknown'}`)
      }

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

            if (evt.type === 'kdpDataQuality') {
              if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
              setKdpDataQuality(evt.quality as 'SUSPECT_DATA' | 'INCOMPLETE_DATA')
              setAnalyzing(false)
              break outer
            } else if (evt.type === 'stage') {
              advanceToStage(evt.stage as StageId)
              if (evt.stage === 3 || evt.stage === 4) startSlowTimer(evt.stage as StageId)
            } else if (evt.type === 'complete') {
              if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
              const parts: string[] = []
              if (kdpData?.books?.length) {
                const rows = kdpData.rowCount ?? 0
                parts.push(rows > 0
                  ? `${rows} row${rows !== 1 ? 's' : ''} imported for ${kdpData.books.length} title${kdpData.books.length !== 1 ? 's' : ''}`
                  : `${kdpData.books.length} KDP title${kdpData.books.length !== 1 ? 's' : ''}`)
              }
              if (metaData?.ads?.length) parts.push(`${metaData.ads.length} Meta ad${metaData.ads.length !== 1 ? 's' : ''}`)
              if (pinData?.pinCount) parts.push(`${pinData.pinCount} Pinterest pin${pinData.pinCount !== 1 ? 's' : ''}`)
              setSuccessSummary(parts.length ? `Upload complete — ${parts.join(', ')}` : 'Upload complete')
              advanceToStage(5)
              navigated = true
              setTimeout(() => {
                try { sessionStorage.removeItem('pendingUpload') } catch { /* ignore */ }
                // Signal any mounted dashboard to re-fetch its data immediately
                window.dispatchEvent(new CustomEvent('dashboard-data-refresh'))
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

    } catch (err) {
      console.error('[upload] analysis error:', err)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      const failed = stageRef.current
      const generic = failed <= 3 ? 'Could not save your data. Please try again.' : 'Analysis failed — please try again.'
      const specific = err instanceof Error && err.message && err.message !== 'analyze' && !err.message.startsWith('Failed to fetch')
        ? err.message : generic
      setStageError({ stage: failed, message: specific })
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
        accept=".csv,.xlsx,.pdf,.txt,.epub,application/epub+zip"
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
              <div style={{ height: 3, background: '#F0EDEA', flexShrink: 0 }}>
                <div style={{
                  height: '100%', width: `${Math.min(progressPct, 99)}%`,
                  background: '#E9A020',
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
                      <div className="mb-3 flex items-center justify-center">
                        <Upload size={32} color="#E9A020" strokeWidth={1.5} />
                      </div>
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
                      <div className="space-y-1.5">
                        {files.map(f => {
                          const badge = BADGE[f.type]
                          const diag  = f.diagnostics
                          const diagStatus: 'success' | 'partial' | 'failure' = !diag ? 'success'
                            : diag.rowCount === 0 ? 'failure'
                            : diag.skippedRows > 0 ? 'partial'
                            : 'success'
                          const isExpanded = expandedDiag.has(f.id)
                          const toggleDiag = () => setExpandedDiag(prev => {
                            const next = new Set(prev)
                            next.has(f.id) ? next.delete(f.id) : next.add(f.id)
                            return next
                          })

                          return (
                            <div key={f.id}>
                              <div
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
                                      {f.errorMessage ?? 'Could not read this file'}
                                    </div>
                                  )}
                                  {f.status === 'done' && !diag && f.summary && (
                                    <div className="text-[11px]" style={{ color: '#6EBF8B' }}>
                                      ✓ {f.summary}
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

                              {/* ── Diagnostics panel ── */}
                              {f.status === 'done' && diag && (
                                <div className="rounded-b-lg overflow-hidden"
                                  style={{ background: diagStatus === 'success' ? 'rgba(110,191,139,0.07)' : diagStatus === 'partial' ? 'rgba(233,160,32,0.07)' : 'rgba(249,123,107,0.07)', border: '0.5px solid', borderColor: diagStatus === 'success' ? 'rgba(110,191,139,0.3)' : diagStatus === 'partial' ? 'rgba(233,160,32,0.3)' : 'rgba(249,123,107,0.3)', borderTop: 'none', marginTop: -1 }}>
                                  <div className="px-3 py-2 flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      {/* Status line */}
                                      {diagStatus === 'success' && (
                                        <div className="text-[11px] font-medium" style={{ color: '#166534' }}>
                                          {diag.rowCount} row{diag.rowCount !== 1 ? 's' : ''} imported from {diag.sheetUsed} sheet
                                        </div>
                                      )}
                                      {diagStatus === 'partial' && (
                                        <div className="text-[11px] font-medium" style={{ color: '#92400E' }}>
                                          {diag.rowCount} of {diag.rowCount + diag.skippedRows} rows imported — {diag.skippedRows} skipped
                                          {diag.skipReasons.length > 0 && (
                                            <span style={{ fontWeight: 400 }}> ({diag.skipReasons.join(', ')})</span>
                                          )}
                                        </div>
                                      )}
                                      {diagStatus === 'failure' && (
                                        <div className="text-[11px] font-medium" style={{ color: '#B91C1C' }}>
                                          0 rows imported — could not read file
                                          {diag.sheetsFound.length > 0 && (
                                            <span style={{ fontWeight: 400 }}> · sheets found: {diag.sheetsFound.join(', ')}</span>
                                          )}
                                          {diag.error && (
                                            <div style={{ fontWeight: 400, marginTop: 1 }}>{diag.error}</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Expand toggle — only if there's a first row to show */}
                                    {diag.firstParsedRow && (
                                      <button
                                        onClick={toggleDiag}
                                        className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded transition-all hover:opacity-70"
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: diagStatus === 'success' ? '#166534' : diagStatus === 'partial' ? '#92400E' : '#B91C1C' }}
                                      >
                                        {isExpanded ? 'hide ▲' : 'details ▼'}
                                      </button>
                                    )}
                                  </div>

                                  {/* Collapsible first-row table */}
                                  {isExpanded && diag.firstParsedRow && (
                                    <div className="px-3 pb-2.5 overflow-x-auto">
                                      <div className="text-[9.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>
                                        First parsed row
                                      </div>
                                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                                        <tbody>
                                          {Object.entries(diag.firstParsedRow).slice(0, 8).map(([k, v]) => (
                                            <tr key={k}>
                                              <td style={{ padding: '1px 6px 1px 0', color: '#6B7280', whiteSpace: 'nowrap', fontWeight: 600, verticalAlign: 'top' }}>{k}</td>
                                              <td style={{ padding: '1px 0', color: '#1E2D3D', wordBreak: 'break-all' }}>{String(v ?? '')}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* KDP months-loaded summary */}
                  {kdpMerged && (
                    <div className="mb-4 px-3 py-2 rounded-lg text-[12px]"
                      style={{ background: '#FFF4E0', border: '0.5px solid rgba(233,160,32,0.4)', color: '#92400E' }}>
                      <span className="font-semibold">
                        {kdpMerged.monthCount} {kdpMerged.monthCount === 1 ? 'month' : 'months'} of data loaded
                      </span>
                      {' '}({kdpMerged.monthRange})
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
                  <div className="mb-4 flex items-center justify-center" style={{ height: 40 }}>
                    {STAGES[currentStage - 1].icon === 'fileup'    && <FileUpIcon />}
                    {STAGES[currentStage - 1].icon === 'barchart'  && <BarChartIcon />}
                    {STAGES[currentStage - 1].icon === 'bookopen'  && <BookOpenIcon />}
                    {STAGES[currentStage - 1].icon === 'sparkles'  && <SparklesIcon />}
                    {STAGES[currentStage - 1].icon === 'celebrate' && <CelebrationIcon />}
                  </div>

                  {/* Step label */}
                  <div className="text-[13px] mb-1" style={{ color: '#1E2D3D', fontWeight: 500 }}>
                    {STAGES[currentStage - 1].title}
                  </div>

                  {/* Success summary at stage 5 */}
                  {currentStage === 5 && successSummary ? (
                    <div className="text-[13px] px-4 max-w-xs font-semibold" style={{ color: '#6EBF8B' }}>
                      {successSummary}
                    </div>
                  ) : (
                  <div className="text-[15px] px-4 max-w-xs leading-relaxed italic" style={{ color: '#1E2D3D', opacity: 0.6, minHeight: 40 }}>
                    {CYCLING_MESSAGES[cyclingMsgIdx]}
                  </div>
                  )}

                  {/* Slow message */}
                  {showSlow && currentStage < 5 && (
                    <div className="mt-3 text-[12px] px-4 max-w-xs" style={{ color: '#9CA3AF', animation: 'stageFadeIn 0.4s ease' }}>
                      {SLOW_MESSAGES[currentStage]}
                    </div>
                  )}

                  {/* KDP data quality warning */}
                  {kdpDataQuality && (
                    <div className="mt-4 w-full max-w-xs">
                      <div className="rounded-lg px-4 py-3 mb-3 text-[13px] text-center"
                        style={{ background: 'rgba(233,160,32,0.10)', border: '1px solid rgba(233,160,32,0.35)', color: '#92400E' }}>
                        <div className="font-semibold mb-1">Your KDP data may not have uploaded completely.</div>
                        Check that you exported the full date range and try uploading again.
                      </div>
                      <button onClick={() => { setKdpDataQuality(null); setFiles([]); rawFiles.current.clear() }}
                        className="w-full py-2.5 rounded-lg text-[13px] font-bold hover:opacity-90 transition-all"
                        style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}>
                        Re-upload KDP File
                      </button>
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
            @keyframes stageSparklesPulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.5; }
            }
            @keyframes stageCelebrate {
              0%   { transform: scale(0.5); opacity: 0; }
              60%  { transform: scale(1.15); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
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
