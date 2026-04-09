'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bold, Italic, Underline, Heading1, Heading2, Quote, List, Undo2, Redo2, Plus, X } from 'lucide-react'
import type { ChapterMeta, ChapterDraftMeta, StyleGuide, WorkbookData } from '@/app/dashboard/writing-notebook/useWorkbook'
import { ExportDropdown } from './ExportDropdown'

export interface DraftOps {
  getChapterDraftMeta: (chapterIndex: number) => ChapterDraftMeta
  setChapterDraftMeta: (chapterIndex: number, meta: ChapterDraftMeta) => void
  getChapterDraft: (chapterIndex: number, draftIndex: number) => string
  setChapterDraft: (chapterIndex: number, draftIndex: number, content: string) => void
  getActiveDraftContent: (chapterIndex: number) => string
}

interface Props {
  activeNavItem: string
  bookId: string
  workbookData: WorkbookData
  getValue: (phase: string, section: string, chapterIndex?: number) => string
  setValue: (phase: string, section: string, content: string, chapterIndex?: number) => void
  getChapterMeta: (phase: 'writing' | 'polish') => ChapterMeta
  setChapterMeta: (phase: 'writing' | 'polish', meta: ChapterMeta) => void
  getStyleGuide: () => StyleGuide
  setStyleGuide: (guide: StyleGuide) => void
  draftOps: DraftOps
  onWordCountChange: (count: number) => void
  onKeystroke: () => void
  onStorySoFarUpdate?: () => void
  storySoFarStatus?: 'upToDate' | 'updating'
  hasChapterContent?: boolean
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function getChapterStatus(idx: number, workbookData: WorkbookData): 'Draft' | 'Done' | 'Empty' {
  if (workbookData[`polish:finalDraft:${idx}`]?.trim()) return 'Done'
  if (workbookData[`writing:chapter:${idx}`]?.trim()) return 'Draft'
  return 'Empty'
}

// ── Formatting toolbar ──────────────────────────────────────────────────────

function applyInlineFormat(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onUpdate: (v: string) => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.slice(start, end)
  const replacement = before + selected + after
  const newValue = value.slice(0, start) + replacement + value.slice(end)
  onUpdate(newValue)
  setTimeout(() => {
    textarea.selectionStart = start + before.length
    textarea.selectionEnd = start + before.length + selected.length
    textarea.focus()
  }, 0)
}

function applyLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
  onUpdate: (v: string) => void,
) {
  const { selectionStart: start, value } = textarea
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart)
  onUpdate(newValue)
  setTimeout(() => {
    textarea.selectionStart = start + prefix.length
    textarea.selectionEnd = start + prefix.length
    textarea.focus()
  }, 0)
}

function FormattingToolbar({ textareaRef, onUpdate }: {
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>
  onUpdate: (v: string) => void
}) {
  const ta = () => textareaRef.current

  const buttons = [
    {
      icon: <Bold size={13} />,
      title: 'Bold',
      action: () => ta() && applyInlineFormat(ta()!, '**', '**', onUpdate),
    },
    {
      icon: <Italic size={13} />,
      title: 'Italic',
      action: () => ta() && applyInlineFormat(ta()!, '*', '*', onUpdate),
    },
    {
      icon: <Underline size={13} />,
      title: 'Underline',
      action: () => ta() && applyInlineFormat(ta()!, '<u>', '</u>', onUpdate),
    },
    { separator: true },
    {
      icon: <Heading1 size={13} />,
      title: 'Heading 1',
      action: () => ta() && applyLinePrefix(ta()!, '# ', onUpdate),
    },
    {
      icon: <Heading2 size={13} />,
      title: 'Heading 2',
      action: () => ta() && applyLinePrefix(ta()!, '## ', onUpdate),
    },
    {
      icon: <Quote size={13} />,
      title: 'Blockquote',
      action: () => ta() && applyLinePrefix(ta()!, '> ', onUpdate),
    },
    {
      icon: <List size={13} />,
      title: 'List',
      action: () => ta() && applyLinePrefix(ta()!, '- ', onUpdate),
    },
    { separator: true },
    {
      icon: <Undo2 size={13} />,
      title: 'Undo',
      action: () => { ta()?.focus(); document.execCommand('undo') },
    },
    {
      icon: <Redo2 size={13} />,
      title: 'Redo',
      action: () => { ta()?.focus(); document.execCommand('redo') },
    },
  ]

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-1.5 shrink-0"
      style={{ borderBottom: '0.5px solid #E5E7EB', background: '#FAFAF9' }}
    >
      {buttons.map((btn, i) =>
        'separator' in btn ? (
          <div key={i} className="w-px h-4 mx-1" style={{ background: '#E5E7EB' }} />
        ) : (
          <button
            key={i}
            title={btn.title}
            onMouseDown={e => { e.preventDefault(); btn.action() }}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-gray-100"
            style={{ color: '#6B7280' }}
          >
            {btn.icon}
          </button>
        )
      )}
    </div>
  )
}

// ── Kill List editor ────────────────────────────────────────────────────────

function KillListEditor({
  getStyleGuide, setStyleGuide,
}: {
  getStyleGuide: () => StyleGuide
  setStyleGuide: (g: StyleGuide) => void
}) {
  const guide = getStyleGuide()
  const words = guide.killList ?? []
  const [newWord, setNewWord] = useState('')

  function addWord() {
    const w = newWord.trim()
    if (!w || words.some(k => k.word.toLowerCase() === w.toLowerCase())) return
    setStyleGuide({ ...guide, killList: [...words, { word: w, scope: 'book' }] })
    setNewWord('')
  }

  function removeWord(word: string) {
    setStyleGuide({ ...guide, killList: words.filter(k => k.word !== word) })
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h2 className="text-[22px] font-medium mb-1" style={{ color: '#1E2D3D' }}>Kill List</h2>
        <p className="text-[13px]" style={{ color: '#9CA3AF' }}>
          Words the AI will never use when writing for this book. Add overused, clichéd, or off-brand words.
        </p>
      </div>

      {/* Add word */}
      <div className="flex gap-2">
        <input
          value={newWord}
          onChange={e => setNewWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWord()}
          placeholder="Add a word or phrase…"
          className="flex-1 px-3 py-2 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{ border: '0.5px solid #E5E7EB', color: '#1E2D3D' }}
        />
        <button
          onClick={addWord}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          style={{ background: '#E9A020', color: '#FFFFFF' }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Word chips */}
      {words.length === 0 ? (
        <p className="text-[13px] italic" style={{ color: '#9CA3AF' }}>No kill list words yet for this book.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {words.map(k => (
            <span
              key={k.word}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px]"
              style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
            >
              {k.word}
              <button onClick={() => removeWord(k.word)} className="hover:opacity-60 transition-opacity">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── New draft button (shared between pill-row and single-draft views) ───────

function NewDraftButton({ onNewDraft, align = 'left' }: {
  onNewDraft: (copyContent: boolean) => void
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="px-2 py-1 text-[12px] font-medium transition-opacity hover:opacity-70"
        style={{ color: '#E9A020', background: 'none', border: 'none' }}
      >
        + New draft
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 flex gap-1.5 px-2 py-1.5 rounded-lg z-10 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <button
            onClick={() => { onNewDraft(false); setOpen(false) }}
            className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#1E2D3D', border: '0.5px solid #E5E7EB' }}
          >
            Start blank
          </button>
          <button
            onClick={() => { onNewDraft(true); setOpen(false) }}
            className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#1E2D3D', border: '0.5px solid #E5E7EB' }}
          >
            Copy current draft
          </button>
        </div>
      )}
    </div>
  )
}

// ── Auto-sizing prose textarea ──────────────────────────────────────────────

function ProseTextarea({
  value,
  placeholder,
  onChange,
  textareaRef,
}: {
  value: string
  placeholder: string
  onChange: (v: string) => void
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>
}) {
  function resize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    if (textareaRef.current) resize(textareaRef.current)
  })

  return (
    <textarea
      ref={el => { textareaRef.current = el }}
      value={value}
      onChange={e => {
        onChange(e.target.value)
        resize(e.target)
      }}
      placeholder={placeholder}
      className="w-full resize-none focus:outline-none"
      style={{
        fontSize: 15,
        lineHeight: '1.95',
        color: '#1E2D3D',
        border: 'none',
        background: 'transparent',
        minHeight: 300,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    />
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function EditorArea({
  activeNavItem, bookId, workbookData,
  getValue, setValue, getChapterMeta, setChapterMeta,
  getStyleGuide, setStyleGuide,
  draftOps,
  onWordCountChange, onKeystroke,
  onStorySoFarUpdate, storySoFarStatus, hasChapterContent,
}: Props) {
  const { getChapterDraftMeta, setChapterDraftMeta, getChapterDraft, setChapterDraft, getActiveDraftContent } = draftOps
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Parse nav item → workbook coordinates
  const isChapter = activeNavItem.startsWith('chapter:')
  const chapterIdx = isChapter ? parseInt(activeNavItem.split(':')[1]) : null

  // Draft state for chapters
  const draftMeta = isChapter && chapterIdx != null ? getChapterDraftMeta(chapterIdx) : null
  const activeDraftIdx = draftMeta?.activeDraft ?? 0
  const draftCount = draftMeta?.draftCount ?? 1

  const getInitialContent = useCallback((): string => {
    if (isChapter && chapterIdx != null) return getActiveDraftContent(chapterIdx)
    switch (activeNavItem) {
      case 'storyOutline': return getValue('setup', 'storyOutline')
      case 'styleGuide':   return getValue('setup', 'styleGuide')
      case 'seriesBible':  return getValue('setup', 'seriesBible')
      case 'storySoFar':   return getValue('writing', 'storySoFar')
      default: return ''
    }
  }, [activeNavItem, isChapter, chapterIdx, getValue, getActiveDraftContent])

  const [content, setContent] = useState(getInitialContent)

  // Reset content when nav item changes
  useEffect(() => {
    setContent(getInitialContent())
  }, [activeNavItem, getInitialContent]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update live word count
  useEffect(() => {
    onWordCountChange(wordCount(content))
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleContentChange(v: string) {
    setContent(v)
    onKeystroke()
    if (isChapter && chapterIdx != null) {
      // Always save to active draft
      setChapterDraft(chapterIdx, activeDraftIdx, v)
    } else {
      switch (activeNavItem) {
        case 'storyOutline': setValue('setup', 'storyOutline', v); break
        case 'styleGuide':   setValue('setup', 'styleGuide', v); break
        case 'seriesBible':  setValue('setup', 'seriesBible', v); break
        case 'storySoFar':   setValue('writing', 'storySoFar', v); break
      }
    }
  }

  // Switch to a different draft
  function handleDraftSwitch(draftIdx: number) {
    if (chapterIdx == null || draftIdx === activeDraftIdx) return
    // Save current content first
    setChapterDraft(chapterIdx, activeDraftIdx, content)
    // Switch active draft
    setChapterDraftMeta(chapterIdx, { draftCount, activeDraft: draftIdx })
    // Load new draft content
    setContent(getChapterDraft(chapterIdx, draftIdx))
  }

  // Create a new draft
  function handleNewDraft(copyContent: boolean) {
    if (chapterIdx == null) return
    // Save current content first
    setChapterDraft(chapterIdx, activeDraftIdx, content)
    const newIdx = draftCount
    const newContent = copyContent ? content : ''
    setChapterDraft(chapterIdx, newIdx, newContent)
    setChapterDraftMeta(chapterIdx, { draftCount: draftCount + 1, activeDraft: newIdx })
    setContent(newContent)
  }

  // Update chapter title in chapterMeta
  function handleTitleBlur(title: string) {
    if (chapterIdx == null) return
    const meta = getChapterMeta('writing')
    const titles = [...meta.titles]
    titles[chapterIdx] = title
    setChapterMeta('writing', { ...meta, titles })
  }

  // ── Kill list ──
  if (activeNavItem === 'killList') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FormattingToolbar textareaRef={textareaRef} onUpdate={() => {}} />
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <KillListEditor getStyleGuide={getStyleGuide} setStyleGuide={setStyleGuide} />
        </div>
      </div>
    )
  }

  // ── Consistency Check (placeholder) ──
  if (activeNavItem === 'consistencyCheck') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FormattingToolbar textareaRef={textareaRef} onUpdate={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: '#FFF8F0' }}
            >
              <span style={{ fontSize: 22 }}>🔍</span>
            </div>
            <p className="text-[15px] font-medium mb-1" style={{ color: '#1E2D3D' }}>Consistency Check</p>
            <p className="text-[13px]" style={{ color: '#9CA3AF' }}>Coming soon — AI will scan for plot holes, name inconsistencies, and timeline errors.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Vellum Export ──
  if (activeNavItem === 'vellumExport') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FormattingToolbar textareaRef={textareaRef} onUpdate={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: '#FFF8F0' }}
            >
              <span style={{ fontSize: 22 }}>📤</span>
            </div>
            <p className="text-[15px] font-medium mb-2" style={{ color: '#1E2D3D' }}>Export your manuscript</p>
            <p className="text-[13px] mb-4" style={{ color: '#9CA3AF' }}>
              Download as Word (.docx) or copy clean text for Google Docs / Vellum.
            </p>
            <ExportDropdown bookId={bookId} drawerToggle="drafts" />
          </div>
        </div>
      </div>
    )
  }

  // ── Section labels ──
  const SECTION_META: Record<string, { title: string; placeholder: string }> = {
    storyOutline: {
      title: 'Story Outline',
      placeholder: 'Write your story outline here… What happens in each act? What are the key turning points?',
    },
    styleGuide: {
      title: 'Style Guide',
      placeholder: 'Define your writing style… POV, tense, tone, pacing notes, things to avoid.',
    },
    seriesBible: {
      title: 'Series Bible',
      placeholder: 'Document series-wide facts… world rules, recurring characters, location details, timeline.',
    },
    storySoFar: {
      title: 'Story So Far',
      placeholder: 'AI-generated summary of your manuscript so far. Edit freely — the AI uses this for continuity.',
    },
  }

  const meta = isChapter ? null : SECTION_META[activeNavItem]

  // ── Chapter editor ──
  if (isChapter && chapterIdx != null) {
    const writingMeta = getChapterMeta('writing')
    const title = writingMeta.titles[chapterIdx] ?? ''
    const status = getChapterStatus(chapterIdx, workbookData)

    const STATUS_STYLE: Record<string, React.CSSProperties> = {
      Draft: { background: '#FFF3E0', color: '#E9A020', border: '1px solid #F5CFA0' },
      Done:  { background: '#D6F0E0', color: '#1A6B3A' },
      Empty: { background: '#F3F4F6', color: '#9CA3AF' },
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FormattingToolbar textareaRef={textareaRef} onUpdate={handleContentChange} />
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-3xl mx-auto">
            {/* Draft switcher row — show if draftCount > 1 */}
            {draftCount > 1 && (
              <div className="flex items-center gap-1.5 mb-3">
                {Array.from({ length: draftCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleDraftSwitch(i)}
                    className="px-3 py-1 rounded-full transition-colors"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      background: i === activeDraftIdx ? '#E9A020' : 'transparent',
                      color: i === activeDraftIdx ? '#FFFFFF' : '#888888',
                    }}
                    onMouseEnter={e => {
                      if (i !== activeDraftIdx) (e.target as HTMLElement).style.background = '#FFF8F0'
                    }}
                    onMouseLeave={e => {
                      if (i !== activeDraftIdx) (e.target as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    Draft {i + 1}
                  </button>
                ))}
                <NewDraftButton onNewDraft={handleNewDraft} />
              </div>
            )}

            {/* Chapter label pills */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold"
                style={{ background: '#F97B6B', color: '#FFFFFF' }}
              >
                Ch {chapterIdx + 1}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[12px] font-medium"
                style={STATUS_STYLE[status]}
              >
                {status}
              </span>
              {/* "+ New draft" button when only 1 draft exists */}
              {draftCount <= 1 && (
                <div className="ml-auto">
                  <NewDraftButton onNewDraft={handleNewDraft} align="right" />
                </div>
              )}
            </div>

            {/* Editable chapter title */}
            <input
              defaultValue={title}
              placeholder="Chapter title…"
              onBlur={e => handleTitleBlur(e.target.value)}
              className="w-full bg-transparent focus:outline-none mb-4"
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: '#1E2D3D',
                border: 'none',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}
            />

            {/* Prose textarea */}
            <ProseTextarea
              value={content}
              placeholder="Start writing your chapter…"
              onChange={handleContentChange}
              textareaRef={textareaRef}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Generic text section (outline, style guide, series bible, story so far) ──
  if (meta) {
    const isStorySoFar = activeNavItem === 'storySoFar'
    const showFillButton = isStorySoFar && hasChapterContent && onStorySoFarUpdate
    const isUpdating = storySoFarStatus === 'updating'

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <FormattingToolbar textareaRef={textareaRef} onUpdate={handleContentChange} />
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{ fontSize: 24, fontWeight: 500, color: '#1E2D3D', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {meta.title}
              </h2>
              {showFillButton && !isUpdating && !content.trim() && (
                <button
                  onClick={onStorySoFarUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                  style={{ background: '#E9A020', color: '#FFFFFF' }}
                >
                  ✨ Fill in the story so far
                </button>
              )}
              {showFillButton && isUpdating && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium"
                  style={{ background: '#EDE8FF', color: '#5B3DB5' }}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2 border-[#5B3DB5] border-t-transparent"
                    style={{ animation: 'spin 0.8s linear infinite' }}
                  />
                  Generating…
                </span>
              )}
              {showFillButton && !isUpdating && content.trim() && (
                <button
                  onClick={onStorySoFarUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ background: '#F3F4F6', color: '#6B7280', border: '0.5px solid #E5E7EB' }}
                >
                  ↻ Regenerate
                </button>
              )}
            </div>
            <ProseTextarea
              value={content}
              placeholder={meta.placeholder}
              onChange={handleContentChange}
              textareaRef={textareaRef}
            />
          </div>
        </div>
        {isStorySoFar && (
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        )}
      </div>
    )
  }

  // ── Empty / no book ──
  return (
    <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
      <p className="text-[14px]">Select a section from the sidebar to start writing.</p>
    </div>
  )
}
