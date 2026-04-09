'use client'
// components/writing-notebook/NotebookPane.tsx
import { useState, useCallback, useRef } from 'react'
import { Pencil, CheckCircle, AlertCircle, ScrollText, Loader2 } from 'lucide-react'
import type { ChapterMeta, ChapterStatus } from '@/lib/writing-notebook-types'
import { WorkbookImporter } from './WorkbookImporter'
import { AuditPanel } from './AuditPanel'

type Phase = 'setup' | 'writing' | 'polish'

interface Props {
  bookId: string
  bookTitle?: string
  activePhase: Phase
  onPhaseChange: (p: Phase) => void
  activeSection: string
  activeChapterIndex: number | null
  onSectionChange: (section: string, chapterIndex?: number | null) => void
  getValue: (phase: string, section: string, chapterIndex?: number) => string
  setValue: (phase: string, section: string, content: string, chapterIndex?: number) => Promise<void>
  getChapterMeta: (phase: 'writing' | 'polish') => ChapterMeta
  saving: Record<string, boolean>
  saved: Record<string, boolean>
  onReloadWorkbook: () => void
}

const PHASES: { id: Phase; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'writing', label: 'Writing' },
  { id: 'polish', label: 'Polish' },
]

const SETUP_SECTIONS = [
  { id: 'storyOutline', label: 'Story Outline', placeholder: 'Write your story outline here\u2026 What happens in each act? What are the key turning points?' },
  { id: 'characterBible', label: 'Character Bible', placeholder: 'Describe your main characters\u2026 Their goals, flaws, arcs, relationships.' },
  { id: 'styleGuide', label: 'Style Guide', placeholder: 'Define your writing style\u2026 POV, tense, tone, pacing notes, things to avoid.' },
]

function SavedIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="text-[11px] font-medium" style={{ color: '#9CA3AF' }}>Saving...</span>
  if (saved) return <span className="text-[11px] font-medium transition-opacity duration-300" style={{ color: '#6EBF8B' }}>Saved &#10003;</span>
  return null
}

function detectChapterTitle(text: string): string | null {
  // Work with the first 3 raw lines only
  const lines = text.split('\n').slice(0, 3).map(l => l.trim())
  const line0 = lines[0] ?? ''

  // Pattern 1: "Chapter N — Title" or "Chapter N: Title" (em-dash, en-dash, hyphen, colon)
  const inlineMatch = line0.match(/^chapter\s+\S+\s*[—–-]\s*(.+)$/i)
    ?? line0.match(/^chapter\s+\S+\s*:\s*(.+)$/i)
  if (inlineMatch) return inlineMatch[1].trim()

  // Pattern 2: "Chapter N" alone on first line → next non-empty line is the title
  if (/^chapter\s+\S+$/i.test(line0)) {
    const nextNonEmpty = lines.slice(1).find(l => l.length > 0)
    if (nextNonEmpty && !/\bpov\b/i.test(nextNonEmpty)) return nextNonEmpty
  }

  // Pattern 3: POV labels or anything else → no title
  return null
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const STATUS_CYCLE: ChapterStatus[] = ['draft', 'complete', 'needs_edit']
const STATUS_CONFIG: Record<ChapterStatus, { label: string; bg: string; color: string; border?: string; Icon: typeof Pencil }> = {
  draft:      { label: 'Draft',      bg: 'transparent', color: '#E9A020', border: '1px solid #E9A020', Icon: Pencil },
  complete:   { label: 'Complete',   bg: '#6EBF8B',     color: '#FFFFFF', Icon: CheckCircle },
  needs_edit: { label: 'Needs Edit', bg: 'transparent', color: '#F97B6B', border: '1px solid #F97B6B', Icon: AlertCircle },
  empty:      { label: 'Empty',      bg: 'transparent', color: '#9CA3AF', border: '1px solid #D1D5DB', Icon: Pencil },
}

function ChapterStatusButton({ status, onClick }: { status: ChapterStatus; onClick: () => void }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
      style={{ background: cfg.bg, color: cfg.color, border: cfg.border }}
    >
      <cfg.Icon size={11} />
      {cfg.label}
    </button>
  )
}

export function NotebookPane({
  bookId, bookTitle, activePhase, onPhaseChange, activeSection, activeChapterIndex,
  onSectionChange, getValue, setValue, getChapterMeta, saving, saved, onReloadWorkbook,
}: Props) {
  const [toast, setToast] = useState('')
  const [summarizingChapter, setSummarizingChapter] = useState<number | null>(null)
  const [polishTab, setPolishTab] = useState<'finalDrafts' | 'chapterAudit'>('finalDrafts')
  const [auditChapterIndex, setAuditChapterIndex] = useState(0)
  const titleInputRefs = useRef<Map<number, HTMLInputElement>>(new Map())

  const getKey = useCallback((phase: string, section: string, chapterIndex?: number) => {
    return chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
  }, [])

  const writingMeta = getChapterMeta('writing')
  const polishMeta = getChapterMeta('polish')

  const summarizeChapter = useCallback(async (chapterIdx: number) => {
    const content = getValue('writing', 'chapter', chapterIdx)
    if (!content?.trim()) return

    const meta = getChapterMeta('writing')
    const title = meta.titles[chapterIdx] ?? ''

    setSummarizingChapter(chapterIdx)
    try {
      const res = await fetch('/api/writing-notebook/summarize-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, chapterIndex: chapterIdx, chapterTitle: title, chapterContent: content }),
      })
      if (res.ok) {
        const data = await res.json()
        // Update Story So Far in local state + reload workbook to refresh drawer
        await setValue('writing', 'storySoFar', data.storySoFar)
        onReloadWorkbook()
        setToast('Story So Far updated \u2713')
        setTimeout(() => setToast(''), 3000)
      }
    } catch { /* don't block — completion is the primary action */ }
    setSummarizingChapter(null)
  }, [bookId, getValue, getChapterMeta, setValue, onReloadWorkbook])

  const cycleChapterStatus = useCallback((chapterIdx: number) => {
    const meta = getChapterMeta('writing')
    const statuses = [...(meta.statuses ?? [])]
    const current = statuses[chapterIdx] ?? 'draft'
    const currentCycleIdx = STATUS_CYCLE.indexOf(current)
    const next = STATUS_CYCLE[(currentCycleIdx + 1) % STATUS_CYCLE.length]
    statuses[chapterIdx] = next
    // Immediate save (not debounced)
    setValue('writing', 'chapterMeta', JSON.stringify({ ...meta, statuses }))
    if (next === 'complete') {
      setToast(`Chapter ${chapterIdx + 1} marked complete \u2713`)
      setTimeout(() => setToast(''), 3000)
      // Auto-generate Story So Far summary
      summarizeChapter(chapterIdx)
    }
  }, [getChapterMeta, setValue, summarizeChapter])

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Phase tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
        {PHASES.map(p => (
          <button
            key={p.id}
            onClick={() => onPhaseChange(p.id)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: activePhase === p.id ? '#E9A020' : 'transparent',
              color: activePhase === p.id ? '#FFFFFF' : '#1E2D3D',
              border: activePhase === p.id ? 'none' : '1px solid #1E2D3D',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SETUP phase */}
        {activePhase === 'setup' && (
          <WorkbookImporter
            bookId={bookId}
            onImportComplete={onReloadWorkbook}
            onSwitchToOutline={() => onSectionChange('storyOutline')}
          />
        )}
        {activePhase === 'setup' && SETUP_SECTIONS.map(sec => {
          const key = getKey('setup', sec.id)
          const content = getValue('setup', sec.id)
          return (
            <div key={sec.id}>
              <div className="flex items-center justify-between mb-1.5">
                <button
                  onClick={() => onSectionChange(sec.id)}
                  className="text-sm font-medium"
                  style={{ color: activeSection === sec.id ? '#E9A020' : '#1E2D3D' }}
                >
                  {sec.label}
                </button>
                <SavedIndicator saving={saving[key]} saved={saved[key]} />
              </div>
              <textarea
                key={`${sec.id}-${bookId}-${content ? 'loaded' : 'empty'}`}
                defaultValue={content}
                placeholder={sec.placeholder}
                onFocus={() => onSectionChange(sec.id)}
                onBlur={(e) => setValue('setup', sec.id, e.target.value)}
                className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow"
                style={{ border: '0.5px solid #E5E7EB', minHeight: activeSection === sec.id ? 200 : 80, color: '#1E2D3D' }}
                rows={activeSection === sec.id ? 10 : 3}
              />
            </div>
          )
        })}

        {/* WRITING phase */}
        {activePhase === 'writing' && (
          <>
            {/* Story So Far */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <button onClick={() => onSectionChange('storySoFar')} className="text-sm font-medium" style={{ color: activeSection === 'storySoFar' ? '#E9A020' : '#1E2D3D' }}>
                  Story So Far
                </button>
                <SavedIndicator saving={saving[getKey('writing', 'storySoFar')]} saved={saved[getKey('writing', 'storySoFar')]} />
              </div>
              <textarea
                key={`storySoFar-${bookId}-${getValue('writing', 'storySoFar') ? 'loaded' : 'empty'}`}
                defaultValue={getValue('writing', 'storySoFar')}
                placeholder="Summarize what has happened so far in the story. The AI uses this for continuity."
                onFocus={() => onSectionChange('storySoFar')}
                onBlur={(e) => setValue('writing', 'storySoFar', e.target.value)}
                className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow"
                style={{ border: '0.5px solid #E5E7EB', minHeight: 80, color: '#1E2D3D' }}
                rows={3}
              />
            </div>

            {/* Chapter drafts */}
            {writingMeta.count === 0 && (
              <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                <p className="text-sm">No chapters yet. Use the chapter drawer to add one, or ask the AI.</p>
              </div>
            )}
            {Array.from({ length: writingMeta.count }, (_, i) => {
              const key = getKey('writing', 'chapter', i)
              const content = getValue('writing', 'chapter', i)
              const title = writingMeta.titles[i] ?? ''
              const isActive = activeSection === 'chapter' && activeChapterIndex === i
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 transition-colors"
                  style={{
                    border: isActive ? '1.5px solid #E9A020' : '0.5px solid #E5E7EB',
                    background: isActive ? '#FFFBF0' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#E9A020', color: '#FFFFFF' }}>
                      Ch {i + 1}
                    </span>
                    <input
                      key={`ch-title-${i}-${bookId}-${title}`}
                      ref={(el) => { if (el) titleInputRefs.current.set(i, el); else titleInputRefs.current.delete(i) }}
                      defaultValue={title}
                      placeholder="Chapter title"
                      onBlur={(e) => {
                        const meta = getChapterMeta('writing')
                        const titles = [...meta.titles]
                        titles[i] = e.target.value
                        setValue('writing', 'chapterMeta', JSON.stringify({ ...meta, titles }))
                      }}
                      onClick={() => onSectionChange('chapter', i)}
                      className="flex-1 text-sm font-medium bg-transparent focus:outline-none"
                      style={{ color: '#1E2D3D' }}
                    />
                    <SavedIndicator saving={saving[key]} saved={saved[key]} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {wordCount(content).toLocaleString()} words
                    </span>
                    <ChapterStatusButton
                      status={(writingMeta.statuses?.[i] as ChapterStatus) ?? 'draft'}
                      onClick={() => cycleChapterStatus(i)}
                    />
                  </div>
                  {summarizingChapter === i && (
                    <div className="flex items-center gap-1.5 mb-1 ml-1">
                      <Loader2 size={12} className="animate-spin" style={{ color: '#E9A020' }} />
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>Updating story summary...</span>
                    </div>
                  )}
                  <textarea
                    key={`ch-${i}-${bookId}-${content ? 'loaded' : 'empty'}`}
                    defaultValue={content}
                    placeholder="Start writing your chapter\u2026"
                    onFocus={() => onSectionChange('chapter', i)}
                    onBlur={(e) => setValue('writing', 'chapter', e.target.value, i)}
                    onPaste={(e) => {
                      const currentTitle = (getChapterMeta('writing').titles[i] ?? '').trim()
                      if (currentTitle) return
                      const pasted = e.clipboardData.getData('text')
                      const detected = detectChapterTitle(pasted)
                      if (!detected) return
                      const titleInput = titleInputRefs.current.get(i)
                      if (titleInput) titleInput.value = detected
                      const meta = getChapterMeta('writing')
                      const titles = [...meta.titles]
                      titles[i] = detected
                      setValue('writing', 'chapterMeta', JSON.stringify({ ...meta, titles }))
                      setToast('Chapter title detected \u2713')
                      setTimeout(() => setToast(''), 2000)
                    }}
                    className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none transition-shadow"
                    style={{ border: 'none', minHeight: isActive ? 300 : 100, color: '#1E2D3D', lineHeight: '1.8' }}
                    rows={isActive ? 15 : 4}
                  />
                  {content?.trim() && (
                    <button
                      onClick={() => summarizeChapter(i)}
                      disabled={summarizingChapter === i}
                      className="flex items-center gap-1 mt-1 ml-1 text-xs hover:underline disabled:opacity-50 transition-opacity"
                      style={{ color: '#E9A020' }}
                    >
                      {summarizingChapter === i ? (
                        <><Loader2 size={11} className="animate-spin" /> Updating...</>
                      ) : (
                        <><ScrollText size={11} /> Update story summary</>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* POLISH phase */}
        {activePhase === 'polish' && (
          <>
            {/* Polish sub-tabs */}
            <div className="flex gap-1 mb-4">
              {(['finalDrafts', 'chapterAudit'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPolishTab(tab)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-all"
                  style={{
                    background: polishTab === tab ? '#1E2D3D' : '#F5F5F4',
                    color: polishTab === tab ? '#FFFFFF' : '#4B5563',
                  }}
                >
                  {tab === 'finalDrafts' ? 'Final Drafts' : 'Chapter Audit'}
                </button>
              ))}
            </div>

            {/* Final Drafts sub-tab */}
            {polishTab === 'finalDrafts' && (
              <>
                {polishMeta.count === 0 && (
                  <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                    <p className="text-sm">No final drafts yet. Finish your chapters in the Writing phase first.</p>
                  </div>
                )}
                {Array.from({ length: polishMeta.count }, (_, i) => {
                  const key = getKey('polish', 'finalDraft', i)
                  const content = getValue('polish', 'finalDraft', i)
                  const title = polishMeta.titles[i] ?? ''
                  const isActive = activeSection === 'finalDraft' && activeChapterIndex === i
                  return (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{
                        border: isActive ? '1.5px solid #6EBF8B' : '0.5px solid #E5E7EB',
                        background: isActive ? '#F0FDF4' : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#6EBF8B', color: '#FFFFFF' }}>
                          Ch {i + 1}
                        </span>
                        <input
                          key={`fd-title-${i}-${bookId}-${title}`}
                          defaultValue={title}
                          placeholder="Chapter title"
                          onBlur={(e) => {
                            const meta = getChapterMeta('polish')
                            const titles = [...meta.titles]
                            titles[i] = e.target.value
                            setValue('polish', 'chapterMeta', JSON.stringify({ ...meta, titles }))
                          }}
                          onClick={() => onSectionChange('finalDraft', i)}
                          className="flex-1 text-sm font-medium bg-transparent focus:outline-none"
                          style={{ color: '#1E2D3D' }}
                        />
                        <SavedIndicator saving={saving[key]} saved={saved[key]} />
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{wordCount(content).toLocaleString()} words</span>
                      </div>
                      <textarea
                        key={`fd-${i}-${bookId}-${content ? 'loaded' : 'empty'}`}
                        defaultValue={content}
                        placeholder="Paste or write your final draft here..."
                        onFocus={() => onSectionChange('finalDraft', i)}
                        onBlur={(e) => setValue('polish', 'finalDraft', e.target.value, i)}
                        className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none transition-shadow"
                        style={{ border: 'none', minHeight: isActive ? 300 : 100, color: '#1E2D3D', lineHeight: '1.8' }}
                        rows={isActive ? 15 : 4}
                      />
                    </div>
                  )
                })}
              </>
            )}

            {/* Chapter Audit sub-tab */}
            {polishTab === 'chapterAudit' && (
              <>
                {writingMeta.count === 0 ? (
                  <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                    <p className="text-sm">No chapters yet. Write some chapters first to run an audit.</p>
                  </div>
                ) : (
                  <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
                    {/* Chapter selector */}
                    {writingMeta.count > 1 && (
                      <div className="flex gap-1 mb-3 flex-wrap">
                        {Array.from({ length: writingMeta.count }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setAuditChapterIndex(i)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium border-none cursor-pointer transition-all"
                            style={{
                              background: auditChapterIndex === i ? '#E9A020' : '#F5F5F4',
                              color: auditChapterIndex === i ? '#FFFFFF' : '#4B5563',
                            }}
                          >
                            Ch {i + 1}{writingMeta.titles[i] ? ` · ${writingMeta.titles[i]}` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden rounded-lg" style={{ border: '0.5px solid #E5E7EB', background: '#FFFFFF' }}>
                      <AuditPanel
                        bookId={bookId}
                        bookTitle={bookTitle || 'Untitled'}
                        chapterIndex={auditChapterIndex}
                        chapterTitle={writingMeta.titles[auditChapterIndex] ?? ''}
                        chapterContent={getValue('writing', 'chapter', auditChapterIndex)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50"
          style={{ background: '#6EBF8B', color: '#FFFFFF' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
