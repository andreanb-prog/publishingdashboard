'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Loader2, AlertTriangle, MessageSquare, Star, ArrowRight } from 'lucide-react'
import type { AuditType, AuditFinding } from '@/lib/auditPrompts'
import { AUDIT_TYPE_LABELS } from '@/lib/auditPrompts'

interface Props {
  bookId: string
  bookTitle: string
  chapterIndex: number
  chapterTitle: string
  chapterContent: string
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  flag:   { bg: '#FEF2F2', border: '#F97B6B', text: '#B91C1C' },
  note:   { bg: '#FFFBEB', border: '#D97706', text: '#92400E' },
  praise: { bg: '#F0FDF4', border: '#6EBF8B', text: '#166534' },
}

const SEVERITY_ICONS: Record<string, typeof AlertTriangle> = {
  flag: AlertTriangle,
  note: MessageSquare,
  praise: Star,
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  pacing:    { bg: '#EDE9FE', text: '#6D28D9' },
  heat:      { bg: '#FEE2E2', text: '#DC2626' },
  emotional: { bg: '#DBEAFE', text: '#2563EB' },
  dialogue:  { bg: '#FEF3C7', text: '#D97706' },
  structure: { bg: '#E0E7FF', text: '#4338CA' },
}

const AUDIT_TYPES: AuditType[] = ['ku_pacing', 'heat_map', 'emotional_arc']

export function AuditPanel({ bookId, bookTitle, chapterIndex, chapterTitle, chapterContent }: Props) {
  const [auditType, setAuditType] = useState<AuditType>('ku_pacing')
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedAuditType, setLoadedAuditType] = useState<AuditType | null>(null)
  const [activeFindingIndex, setActiveFindingIndex] = useState<number | null>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const findingRefs = useRef<(HTMLDivElement | null)[]>([])

  const wordCount = useMemo(() => chapterContent.trim().split(/\s+/).length, [chapterContent])

  // Load existing audit on mount / chapter change
  useEffect(() => {
    if (!bookId || chapterIndex == null) return
    let cancelled = false

    async function loadExisting() {
      try {
        const res = await fetch(`/api/writing-notebook/audit?bookId=${bookId}&chapterIndex=${chapterIndex}&auditType=${auditType}`)
        const data = await res.json()
        if (cancelled) return
        if (data.audits?.length > 0) {
          setFindings(data.audits[0].findings)
          setLoadedAuditType(auditType)
        } else {
          setFindings([])
          setLoadedAuditType(null)
        }
      } catch {
        // no existing audit — fine
      }
    }

    loadExisting()
    return () => { cancelled = true }
  }, [bookId, chapterIndex, auditType])

  const runAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFindings([])
    setActiveFindingIndex(null)

    try {
      const res = await fetch('/api/writing-notebook/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          chapterIndex,
          auditType,
          chapterContent,
          chapterTitle,
          bookTitle,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Audit failed')

      setFindings(data.findings)
      setLoadedAuditType(auditType)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [bookId, chapterIndex, auditType, chapterContent, chapterTitle, bookTitle])

  // Summary counts
  const flagCount = findings.filter(f => f.severity === 'flag').length
  const noteCount = findings.filter(f => f.severity === 'note').length
  const praiseCount = findings.filter(f => f.severity === 'praise').length

  // Build highlighted text with findings anchored to passages
  const highlightedContent = useMemo(() => {
    if (!chapterContent || findings.length === 0) return null

    type Segment = { text: string; findingIndex?: number; severity?: string }
    const segments: Segment[] = []

    // Find all quote positions
    const matches: { start: number; end: number; findingIndex: number; severity: string }[] = []
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i]
      if (!f.quote) continue
      const idx = chapterContent.indexOf(f.quote)
      if (idx === -1) continue
      matches.push({ start: idx, end: idx + f.quote.length, findingIndex: i, severity: f.severity })
    }

    // Sort by position, remove overlaps
    matches.sort((a, b) => a.start - b.start)
    const cleaned: typeof matches = []
    for (const m of matches) {
      if (cleaned.length === 0 || m.start >= cleaned[cleaned.length - 1].end) {
        cleaned.push(m)
      }
    }

    // Build segments
    let cursor = 0
    for (const m of cleaned) {
      if (m.start > cursor) {
        segments.push({ text: chapterContent.slice(cursor, m.start) })
      }
      segments.push({ text: chapterContent.slice(m.start, m.end), findingIndex: m.findingIndex, severity: m.severity })
      cursor = m.end
    }
    if (cursor < chapterContent.length) {
      segments.push({ text: chapterContent.slice(cursor) })
    }

    return segments
  }, [chapterContent, findings])

  const jumpToPassage = (findingIndex: number) => {
    setActiveFindingIndex(findingIndex)
    const el = document.getElementById(`audit-highlight-${findingIndex}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const hasContent = chapterContent.trim().length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '0.5px solid #EEEBE6' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[14px]">&#128270;</span>
          <h3 className="text-[15px] font-semibold" style={{ color: '#1E2D3D' }}>
            Chapter Audit
          </h3>
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
            Ch {chapterIndex + 1}
          </span>
        </div>

        {/* Audit type pills */}
        <div className="flex gap-1.5 mb-3">
          {AUDIT_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setAuditType(t)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all"
              style={{
                background: auditType === t ? '#1E2D3D' : '#F5F5F4',
                color: auditType === t ? '#FFFFFF' : '#4B5563',
              }}
            >
              {AUDIT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Run button */}
        <button
          onClick={runAudit}
          disabled={loading || !hasContent}
          className="w-full py-2.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-opacity"
          style={{
            background: loading || !hasContent ? '#E5E7EB' : '#D97706',
            color: loading || !hasContent ? '#9CA3AF' : '#FFFFFF',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" style={{ color: '#8B5CF6' }} />
              Reading your chapter...
            </>
          ) : (
            `Run ${AUDIT_TYPE_LABELS[auditType]} Audit`
          )}
        </button>

        {!hasContent && (
          <p className="text-[11px] mt-1.5 text-center" style={{ color: '#9CA3AF' }}>
            Write or import a chapter first to run an audit.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg text-[13px]" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {findings.length > 0 && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: chapter text with highlights */}
          <div ref={textRef} className="flex-1 overflow-y-auto p-4" style={{ minWidth: 0 }}>
            {/* Summary bar */}
            <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '0.5px solid #EEEBE6' }}>
              <span className="text-[12px] font-medium flex items-center gap-1" style={{ color: '#B91C1C' }}>
                <AlertTriangle size={12} /> {flagCount} flag{flagCount !== 1 ? 's' : ''}
              </span>
              <span className="text-[12px] font-medium flex items-center gap-1" style={{ color: '#92400E' }}>
                <MessageSquare size={12} /> {noteCount} note{noteCount !== 1 ? 's' : ''}
              </span>
              <span className="text-[12px] font-medium flex items-center gap-1" style={{ color: '#166534' }}>
                <Star size={12} /> {praiseCount} praise
              </span>
              <span className="text-[11px] ml-auto" style={{ color: '#9CA3AF' }}>
                {wordCount.toLocaleString()} words
              </span>
            </div>

            {/* Highlighted text */}
            <div className="text-[14px] leading-[1.9] whitespace-pre-wrap" style={{ color: '#1E2D3D' }}>
              {highlightedContent ? (
                highlightedContent.map((seg, i) =>
                  seg.findingIndex != null ? (
                    <mark
                      key={i}
                      id={`audit-highlight-${seg.findingIndex}`}
                      className="cursor-pointer rounded px-0.5 transition-all"
                      style={{
                        background: activeFindingIndex === seg.findingIndex
                          ? SEVERITY_COLORS[seg.severity!].border + '40'
                          : SEVERITY_COLORS[seg.severity!].bg,
                        borderBottom: `2px solid ${SEVERITY_COLORS[seg.severity!].border}`,
                        outline: activeFindingIndex === seg.findingIndex
                          ? `2px solid ${SEVERITY_COLORS[seg.severity!].border}`
                          : 'none',
                      }}
                      onClick={() => {
                        setActiveFindingIndex(seg.findingIndex!)
                        findingRefs.current[seg.findingIndex!]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                    >
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )
              ) : (
                chapterContent
              )}
            </div>
          </div>

          {/* Right: findings panel */}
          <div
            className="overflow-y-auto flex-shrink-0 p-3 space-y-2"
            style={{ width: 320, borderLeft: '0.5px solid #EEEBE6', background: '#FAFAF9' }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
              {AUDIT_TYPE_LABELS[loadedAuditType || auditType]} Findings
            </p>
            {findings.map((f, i) => {
              const sc = SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.note
              const cc = CATEGORY_COLORS[f.category] || CATEGORY_COLORS.structure
              const Icon = SEVERITY_ICONS[f.severity] || MessageSquare
              const isActive = activeFindingIndex === i

              return (
                <div
                  key={i}
                  ref={el => { findingRefs.current[i] = el }}
                  className="rounded-lg p-3 transition-all cursor-pointer"
                  style={{
                    background: isActive ? sc.bg : '#FFFFFF',
                    borderLeft: `3px solid ${sc.border}`,
                    border: isActive ? `1px solid ${sc.border}` : '1px solid #E5E7EB',
                    borderLeftWidth: 3,
                    borderLeftColor: sc.border,
                  }}
                  onClick={() => jumpToPassage(i)}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: cc.bg, color: cc.text }}
                    >
                      {f.category.charAt(0).toUpperCase() + f.category.slice(1)}
                    </span>
                    <Icon size={12} style={{ color: sc.border }} />
                  </div>
                  <p className="text-[13px] leading-[1.5]" style={{ color: '#1E2D3D' }}>
                    {f.comment}
                  </p>
                  {f.quote && (
                    <button
                      onClick={e => { e.stopPropagation(); jumpToPassage(i) }}
                      className="flex items-center gap-1 mt-2 text-[11px] font-medium bg-transparent border-none cursor-pointer p-0"
                      style={{ color: '#D97706' }}
                    >
                      Jump to passage <ArrowRight size={10} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state (no findings, not loading) */}
      {findings.length === 0 && !loading && !error && hasContent && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#F5F5F4' }}>
              <span className="text-[20px]">&#128270;</span>
            </div>
            <p className="text-[14px] font-medium mb-1" style={{ color: '#1E2D3D' }}>
              Ready to audit Chapter {chapterIndex + 1}
            </p>
            <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
              Select an audit type and click Run to get AI-powered feedback on your chapter.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
