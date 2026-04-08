'use client'
// components/writing-notebook/ChapterDrawer.tsx
import { useState, useCallback } from 'react'
import { BookOpen, ScrollText, ChevronDown, ChevronUp, Plus, Pencil, FileText, CheckCircle, AlertCircle, PartyPopper } from 'lucide-react'
import { ExportDropdown } from './ExportDropdown'
import type { WorkbookData, ChapterMeta, ChapterStatus } from '@/app/writing-notebook/page'

interface Props {
  bookId: string
  workbookData: WorkbookData
  getChapterMeta: (phase: 'writing' | 'polish') => ChapterMeta
  drawerToggle: 'drafts' | 'final'
  onDrawerToggle: (v: 'drafts' | 'final') => void
  activeChapterIndex: number | null
  onChapterClick: (chapterIndex: number) => void
  onSectionClick: (section: string) => void
  onAddChapter: () => void
  onOpenChat: () => void
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function getChapterStatus(idx: number, meta: ChapterMeta, workbookData: WorkbookData): ChapterStatus {
  // Use explicit status from meta if available
  const explicit = meta.statuses?.[idx]
  if (explicit) return explicit
  // Fallback: if content exists → draft, else empty
  const content = workbookData[`writing:chapter:${idx}`]
  return content?.trim() ? 'draft' : 'empty'
}

const STATUS_STYLES: Record<ChapterStatus, { bg: string; color: string; label: string; border?: string; Icon: typeof Pencil }> = {
  complete:   { bg: '#6EBF8B', color: '#FFFFFF', label: 'Complete',   Icon: CheckCircle },
  draft:      { bg: '#E9A020', color: '#FFFFFF', label: 'Draft',      Icon: Pencil },
  needs_edit: { bg: '#F97B6B', color: '#FFFFFF', label: 'Needs Edit', Icon: AlertCircle },
  empty:      { bg: 'transparent', color: '#9CA3AF', label: 'Empty', border: '1px solid #D1D5DB', Icon: Pencil },
}

export function ChapterDrawer({
  bookId, workbookData, getChapterMeta, drawerToggle, onDrawerToggle,
  activeChapterIndex, onChapterClick, onSectionClick, onAddChapter, onOpenChat,
}: Props) {
  const [storySoFarExpanded, setStorySoFarExpanded] = useState(false)

  const outline = workbookData['setup:storyOutline'] ?? ''
  const storySoFar = workbookData['writing:storySoFar'] ?? ''

  const writingMeta = getChapterMeta('writing')
  const polishMeta = getChapterMeta('polish')

  // Combine chapter indices from both phases
  const maxCount = Math.max(writingMeta.count, polishMeta.count)
  const chapterIndices = Array.from({ length: maxCount }, (_, i) => i)

  const getChapterContent = useCallback((idx: number) => {
    if (drawerToggle === 'final') return workbookData[`polish:finalDraft:${idx}`] ?? ''
    return workbookData[`writing:chapter:${idx}`] ?? ''
  }, [workbookData, drawerToggle])

  const getChapterTitle = useCallback((idx: number) => {
    const meta = drawerToggle === 'final' ? polishMeta : writingMeta
    return meta.titles[idx] ?? ''
  }, [drawerToggle, writingMeta, polishMeta])

  // Total words across all records
  const totalWords = Object.entries(workbookData)
    .filter(([k]) => k.startsWith('writing:chapter:') || k.startsWith('polish:finalDraft:'))
    .reduce((sum, [, v]) => sum + wordCount(v), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#FFF8F0', borderLeft: '1px solid #E5E7EB' }}>
      {/* Drawer header */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium" style={{ color: '#1E2D3D' }}>Your Story</h2>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              {maxCount} chapter{maxCount !== 1 ? 's' : ''} &middot; {totalWords.toLocaleString()} words
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportDropdown bookId={bookId} drawerToggle={drawerToggle} />
            <button
              onClick={onAddChapter}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{ border: '1.5px solid #E9A020', color: '#E9A020' }}
            >
              <Plus size={14} />
              <span className="hidden lg:inline">New Chapter</span>
            </button>
          </div>
        </div>

        {/* Drafts / Final toggle */}
        <div className="flex gap-1 mt-2">
          {(['drafts', 'final'] as const).map(t => (
            <button
              key={t}
              onClick={() => onDrawerToggle(t)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize"
              style={{
                background: drawerToggle === t ? '#E9A020' : 'transparent',
                color: drawerToggle === t ? '#FFFFFF' : '#1E2D3D',
                border: drawerToggle === t ? 'none' : '1px solid #1E2D3D',
              }}
            >
              {t === 'drafts' ? 'Drafts' : 'Final'}
            </button>
          ))}
        </div>
      </div>

      {/* Celebration banner — all chapters complete */}
      {maxCount > 0 && writingMeta.statuses?.length >= maxCount &&
        Array.from({ length: maxCount }, (_, i) => writingMeta.statuses[i]).every(s => s === 'complete') && (
        <div className="mx-4 mt-2 rounded-lg p-3 flex items-center gap-2" style={{ background: '#F0FDF4', border: '1px solid #6EBF8B' }}>
          <PartyPopper size={18} style={{ color: '#6EBF8B' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#1E2D3D' }}>All chapters complete!</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>Ready to export?</p>
          </div>
          <ExportDropdown bookId={bookId} drawerToggle={drawerToggle} />
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-2">
        {/* CARD 1 — Story Outline (pinned) */}
        <div className="rounded-lg p-3" style={{ background: '#FFF8F0', borderLeft: '3px solid #E9A020' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} style={{ color: '#E9A020' }} />
              <span className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>Story Outline</span>
            </div>
            <button onClick={() => onSectionClick('storyOutline')} className="text-xs hover:underline" style={{ color: '#E9A020' }}>
              Edit &rarr;
            </button>
          </div>
          <p className="text-[13px] italic mt-1 line-clamp-3" style={{ color: '#9CA3AF' }}>
            {outline ? outline.slice(0, 120) + (outline.length > 120 ? '\u2026' : '') : 'No outline yet \u2014 add one in Setup \u2192'}
          </p>
        </div>

        {/* CARD 2 — Story So Far (expandable) */}
        <div className="rounded-lg p-3" style={{ background: '#EFF6FF', borderLeft: '3px solid #E9A020' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ScrollText size={14} style={{ color: '#60A5FA' }} />
              <span className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>Story So Far</span>
            </div>
            <button onClick={() => onSectionClick('storySoFar')} className="text-xs hover:underline" style={{ color: '#E9A020' }}>
              Edit &rarr;
            </button>
          </div>
          {storySoFar ? (
            <>
              {!storySoFarExpanded && (
                <p className="text-[13px] italic mt-1 line-clamp-3" style={{ color: '#9CA3AF' }}>
                  {storySoFar.slice(0, 120)}{storySoFar.length > 120 ? '\u2026' : ''}
                </p>
              )}
              {storySoFarExpanded && (
                <div className="text-[13px] mt-1 p-2 overflow-y-auto whitespace-pre-wrap" style={{ color: '#4B5563', maxHeight: '18rem', lineHeight: '1.7' }}>
                  {storySoFar}
                </div>
              )}
              <button onClick={() => setStorySoFarExpanded(!storySoFarExpanded)} className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#9CA3AF' }}>
                {storySoFarExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {storySoFarExpanded ? 'Collapse' : 'Show more'}
              </button>
            </>
          ) : (
            <p className="text-[13px] italic mt-1" style={{ color: '#9CA3AF' }}>No summary yet &mdash; add one after your first chapter</p>
          )}
        </div>

        {/* CHAPTER CARDS */}
        {chapterIndices.length === 0 && (
          <div className="text-center py-8">
            <FileText size={32} style={{ color: '#D1D5DB' }} className="mx-auto mb-2" />
            <p className="text-[15px] font-medium" style={{ color: '#1E2D3D' }}>No chapters yet</p>
            <button onClick={onOpenChat} className="text-[13px] mt-1 hover:underline" style={{ color: '#E9A020' }}>
              Ask the AI to write your first one &rarr;
            </button>
          </div>
        )}

        {chapterIndices.map(idx => {
          const content = getChapterContent(idx)
          const title = getChapterTitle(idx)
          const status = getChapterStatus(idx, writingMeta, workbookData)
          const st = STATUS_STYLES[status]
          const isSelected = activeChapterIndex === idx
          const wc = wordCount(content)

          return (
            <button
              key={idx}
              onClick={() => onChapterClick(idx)}
              className="w-full text-left rounded-lg p-3 transition-all group"
              style={{
                background: '#FFFFFF',
                border: isSelected ? '1.5px solid #E9A020' : '0.5px solid #E5E7EB',
                borderLeftWidth: isSelected ? 3 : undefined,
                borderLeftColor: isSelected ? '#E9A020' : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#E9A020', color: '#FFFFFF' }}>
                  Ch {idx + 1}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: st.bg, color: st.color, border: st.border }}>
                  <st.Icon size={10} />
                  {st.label}
                </span>
                <span className="text-sm font-medium truncate flex-1" style={{ color: '#1E2D3D' }}>
                  {title || 'Untitled'}
                </span>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{wc.toLocaleString()}</span>
                <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9CA3AF' }} />
              </div>
              <p className="text-[13px] italic mt-1 truncate" style={{ color: '#9CA3AF' }}>
                {content ? content.slice(0, 80) + (content.length > 80 ? '\u2026' : '') : 'No content yet'}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
