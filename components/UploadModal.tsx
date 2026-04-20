'use client'
// components/UploadModal.tsx — full-page upload modal triggered from TopBar
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import type { KDPData, BookData, MetaData, PinterestData, ParseDiagnostics } from '@/types'

type FileType = 'kdp' | 'meta' | 'pinterest' | 'adtracker' | 'unknown'
type FileStatus = 'reading' | 'done' | 'error' | 'unknown'

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

  const byMonth = new Map<string, KDPData>()
  for (const d of dataList) byMonth.set(d.month, d)
  const unique = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))

  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()
  for (const d of unique) {
    for (const { date, value } of d.dailyUnits) dailyUnitsMap.set(date, value)
    for (const { date, value } of d.dailyKENP)  dailyKENPMap.set(date, value)
  }

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

  const [files, setFiles]             = useState<ParsedFile[]>([])
  const [dragging, setDragging]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [expandedDiag, setExpandedDiag] = useState<Set<string>>(new Set())
  const [error, setError]             = useState<string | null>(null)
  const [isTouch, setIsTouch]         = useState(false)

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setFiles([])
      rawFiles.current.clear()
      setDragging(false)
      setUploading(false)
      setError(null)
      setExpandedDiag(new Set())
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, uploading, onClose])

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
        const XLSX = await import('xlsx')
        const buf  = await file.arrayBuffer()
        const wb   = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })

        const kdpSheetNames = ['Orders Processed', 'KENP Read', 'KENP']
        const hasKdpSheets = wb.SheetNames.some((n: string) => kdpSheetNames.includes(n))

        let detectedType: 'kdp' | 'meta' | null = hasKdpSheets ? 'kdp' : null
        if (!detectedType) {
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
            : 'No sales data found — download from KDP → Reports → Sales Dashboard → By Month.'
          update({ type: 'kdp', status: bookCount > 0 ? 'done' : 'error', data: bookCount > 0 ? kdpResult : null, summary: kdpSummary, errorMessage: bookCount === 0 ? "Your file uploaded but no sales data was found. Make sure you're downloading the correct KDP report: Reports → Sales Dashboard → By Month." : undefined, diagnostics: kdpResult.diagnostics })
        } else if (detectedType === 'meta') {
          const { parseMetaFile } = await import('@/lib/parsers/meta')
          const metaSheet = wb.SheetNames.includes('Worksheet') ? 'Worksheet' : wb.SheetNames[0]
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[metaSheet], { blankrows: false })
          const parsedData = parseMetaFile(csv)
          update({ type: 'meta', status: 'done', data: parsedData })
        } else {
          update({
            type: 'unknown', status: 'error', data: null,
            errorMessage: "Can\u2019t identify this file. If it\u2019s your KDP report, download it from KDP \u2192 Reports \u2192 Royalty Estimator and select All Titles.",
          })
        }
      } else {
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
            : 'No sales data found — download from KDP → Reports → Sales Dashboard → By Month.'
          update({ type: 'kdp', status: bookCount > 0 ? 'done' : 'error', data: bookCount > 0 ? kdpResult : null, summary: kdpSummary, errorMessage: bookCount === 0 ? "Your file uploaded but no sales data was found. Make sure you're downloading the correct KDP report: Reports → Sales Dashboard → By Month." : undefined, diagnostics: kdpResult.diagnostics })
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

  const doneFiles = files.filter(f => f.status === 'done' && f.type !== 'unknown' && f.type !== 'adtracker')
  const kdpFiles  = doneFiles.filter(f => f.type === 'kdp')
  const kdpMerged = mergeKDPFiles(kdpFiles)
  const byType = new Map<FileType, ParsedFile>()
  doneFiles.filter(f => f.type !== 'kdp').forEach(f => byType.set(f.type, f))
  const metaData = (byType.get('meta')?.data as MetaData      | undefined) ?? null
  const pinData  = (byType.get('pinterest')?.data as PinterestData | undefined) ?? null
  const hasAny     = !!(kdpMerged?.data || metaData || pinData)
  const anyReading = files.some(f => f.status === 'reading')
  const canAnalyze = files.length > 0 && hasAny && !anyReading && !uploading

  async function runAnalysis() {
    setUploading(true)
    setError(null)

    try {
      let uploaded = 0

      for (const f of files) {
        if (f.type === 'unknown' || f.type === 'adtracker') continue
        const rawFile = rawFiles.current.get(f.id)
        if (!rawFile) {
          console.warn('[UploadModal] rawFile missing for id:', f.id, '— file may have been cleared')
          continue
        }

        if (f.type === 'kdp') {
          const form = new FormData()
          form.append('file', rawFile)
          const res  = await fetch('/api/parse-kdp', { method: 'POST', body: form })
          const json = await res.json().catch(() => ({}))
          if (res.ok) {
            const rowCount = (json.data?.rowCount ?? json.rowCount ?? 0) as number
            const summary  = `${rawFile.name} — ${rowCount} row${rowCount !== 1 ? 's' : ''} imported`
            setFiles(prev => prev.map(pf => pf.id !== f.id ? pf : { ...pf, summary }))
          } else {
            const msg = (json.error as string | undefined) || 'Upload failed'
            setFiles(prev => prev.map(pf => pf.id !== f.id ? pf : { ...pf, status: 'error', errorMessage: msg }))
          }
        } else if (f.type === 'meta') {
          const form = new FormData()
          form.append('file', rawFile)
          fetch('/api/parse-auto', { method: 'POST', body: form }).catch(() => {})
        }
        uploaded++
      }

      if (uploaded === 0) {
        throw new Error('No files could be read. Please remove and re-add your files, then try again.')
      }

      window.dispatchEvent(new CustomEvent('dashboard-data-refresh'))
      onSuccess()

      const hasKdp  = files.some(f => f.type === 'kdp')
      const hasMeta = files.some(f => f.type === 'meta')
      const hasPin  = files.some(f => f.type === 'pinterest')
      const redirectTo = hasKdp ? '/dashboard/kdp' : hasMeta ? '/dashboard/meta' : hasPin ? '/dashboard/pinterest' : '/dashboard'
      setTimeout(() => router.push(redirectTo + '?fresh=1'), 1200)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
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
        accept=".csv,.xlsx,.pdf,.txt,.epub,application/epub+zip"
        style={{ display: 'none', position: 'absolute', left: '-9999px' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {/* ── Modal overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onClick={e => { if (e.target === e.currentTarget && !uploading) onClose() }}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: 'white', border: '1px solid #EEEBE6', maxHeight: '100dvh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid #EEEBE6' }}>
              <div className="text-[15px] font-semibold" style={{ color: '#1E2D3D' }}>
                Upload Your Data Files
              </div>
              <button
                onClick={onClose}
                disabled={uploading}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-stone-100"
                style={{ background: 'transparent', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: '#6B7280', opacity: uploading ? 0.4 : 1 }}
                aria-label="Close"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1 1L12 12M12 1L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5" style={{ overscrollBehavior: 'contain' }}>
              {/* Drop zone */}
              <div
                className="rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 mb-4"
                style={{ borderColor, background: bgColor, pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.5 : 1 }}
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

                            {/* Filename + result */}
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
                              onClick={e => { e.stopPropagation(); if (!uploading) removeFile(f.id) }}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-all hover:bg-stone-200 min-w-[24px] min-h-[24px]"
                              style={{ background: 'transparent', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', color: '#9CA3AF', opacity: uploading ? 0.4 : 1 }}
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid #EEEBE6' }}>
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all hover:bg-stone-50"
                style={{ background: 'transparent', border: '1px solid #EEEBE6', color: '#6B7280', cursor: uploading ? 'not-allowed' : 'pointer', minHeight: 40, opacity: uploading ? 0.4 : 1 }}
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
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? 'Uploading...' : 'Analyze Files →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
