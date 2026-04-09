'use client'
import { Plus, FileText } from 'lucide-react'
import type { WorkbookData, ChapterMeta, ChapterDraftMeta } from '@/app/dashboard/writing-notebook/useWorkbook'

export type StorySoFarStatus = 'upToDate' | 'updating'

interface Props {
  workbookData: WorkbookData
  getChapterMeta: (phase: 'writing' | 'polish') => ChapterMeta
  getChapterDraftMeta: (chapterIndex: number) => ChapterDraftMeta
  getActiveDraftContent: (chapterIndex: number) => string
  activeNavItem: string
  onNavChange: (item: string) => void
  onAddChapter: () => void
  storySoFarStatus: StorySoFarStatus
  onStorySoFarUpdate?: () => void
  hasChapterContent?: boolean
}

const BOOK_COLORS = [
  '#F97B6B', // B1 coral
  '#F4A261', // B2 peach
  '#8B5CF6', // B3 plum
  '#5BBFB5', // B4 teal
  '#60A5FA', // B5 sky
  '#F472B6', // B6 rose
]

function getChapterStatus(idx: number, workbookData: WorkbookData, getActiveDraftContent: (i: number) => string): 'Draft' | 'Done' | 'Empty' {
  if (workbookData[`polish:finalDraft:${idx}`]?.trim()) return 'Done'
  if (getActiveDraftContent(idx).trim()) return 'Draft'
  return 'Empty'
}

const STATUS_PILL: Record<'Draft' | 'Done' | 'Empty', React.CSSProperties> = {
  Draft: { background: '#FFF3E0', color: '#E9A020', border: '1px solid #F5CFA0' },
  Done: { background: '#D6F0E0', color: '#1A6B3A' },
  Empty: { background: 'transparent', color: '#9CA3AF', border: '1px solid #E5E7EB' },
}

function NavItem({
  id, icon, label, activeNavItem, onNavChange, badge,
}: {
  id: string
  icon: string
  label: string
  activeNavItem: string
  onNavChange: (id: string) => void
  badge?: React.ReactNode
}) {
  const isActive = activeNavItem === id
  return (
    <button
      onClick={() => onNavChange(id)}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors"
      style={{
        background: isActive ? '#FFF3E0' : 'transparent',
        color: isActive ? '#1E2D3D' : '#4B5563',
        fontWeight: isActive ? 500 : 400,
      }}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      <span className="text-[13px] flex-1 truncate">{label}</span>
      {badge}
    </button>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-widest font-semibold"
      style={{ color: '#9CA3AF' }}
    >
      {children}
    </p>
  )
}

export function SidebarNav({
  workbookData, getChapterMeta, getChapterDraftMeta, getActiveDraftContent, activeNavItem, onNavChange, onAddChapter, storySoFarStatus,
  onStorySoFarUpdate, hasChapterContent,
}: Props) {
  const writingMeta = getChapterMeta('writing')
  const polishMeta = getChapterMeta('polish')
  const maxCount = Math.max(writingMeta.count, polishMeta.count, 0)
  const chapterIndices = Array.from({ length: maxCount }, (_, i) => i)

  const canTriggerUpdate = hasChapterContent && onStorySoFarUpdate && storySoFarStatus !== 'updating'

  const storySoFarBadge = storySoFarStatus === 'updating' ? (
    <span
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={{ background: '#EDE8FF', color: '#5B3DB5' }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full border border-[#5B3DB5] border-t-transparent"
        style={{ animation: 'spin 0.8s linear infinite' }}
      />
      Updating
    </span>
  ) : canTriggerUpdate ? (
    <button
      onClick={e => { e.stopPropagation(); onStorySoFarUpdate!() }}
      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 transition-opacity hover:opacity-70"
      style={{ background: '#D6F0E0', color: '#1A6B3A' }}
      title="Regenerate Story So Far"
    >
      Up to date
    </button>
  ) : null

  return (
    <div
      className="flex flex-col h-full overflow-hidden shrink-0"
      style={{ width: 196, background: '#FAFAF9', borderRight: '0.5px solid #E5E7EB' }}
    >
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {/* ── Setup ─────────────────────────── */}
        <SectionLabel>Setup</SectionLabel>
        <NavItem id="storyOutline" icon="📋" label="Story Outline" activeNavItem={activeNavItem} onNavChange={onNavChange} />
        <NavItem id="styleGuide"   icon="✨" label="Style Guide"   activeNavItem={activeNavItem} onNavChange={onNavChange} />
        <NavItem id="killList"     icon="🚫" label="Kill List"     activeNavItem={activeNavItem} onNavChange={onNavChange} />
        <NavItem id="seriesBible"  icon="🌍" label="Series Bible"  activeNavItem={activeNavItem} onNavChange={onNavChange} />

        <div className="mx-1 my-2" style={{ borderTop: '0.5px solid #E5E7EB' }} />

        {/* ── Manuscript ────────────────────── */}
        <SectionLabel>Manuscript</SectionLabel>

        {/* Story So Far with badge */}
        <button
          onClick={() => onNavChange('storySoFar')}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors"
          style={{
            background: activeNavItem === 'storySoFar' ? '#FFF3E0' : 'transparent',
            color: activeNavItem === 'storySoFar' ? '#1E2D3D' : '#4B5563',
            fontWeight: activeNavItem === 'storySoFar' ? 500 : 400,
          }}
        >
          <span className="text-[13px] leading-none">📖</span>
          <span className="text-[13px] flex-1 truncate">Story So Far</span>
          {storySoFarBadge}
        </button>

        {/* Chapter rows */}
        {chapterIndices.map(idx => {
          const id = `chapter:${idx}`
          const isActive = activeNavItem === id
          const title = writingMeta.titles[idx] ?? ''
          const status = getChapterStatus(idx, workbookData, getActiveDraftContent)
          const dotColor = BOOK_COLORS[idx % BOOK_COLORS.length]
          const chDraftMeta = getChapterDraftMeta(idx)

          return (
            <button
              key={idx}
              onClick={() => onNavChange(id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors"
              style={{
                background: isActive ? '#FFF3E0' : 'transparent',
                color: isActive ? '#1E2D3D' : '#4B5563',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: dotColor }}
              />
              <span className="text-[13px] flex-1 truncate min-w-0">
                Ch {idx + 1}{title ? ` · ${title}` : ''}
              </span>
              {chDraftMeta.draftCount > 1 && (
                <span className="text-[10px] shrink-0" style={{ color: '#9CA3AF' }}>
                  {chDraftMeta.draftCount} drafts
                </span>
              )}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                style={STATUS_PILL[status]}
              >
                {status}
              </span>
            </button>
          )
        })}

        {/* + New chapter */}
        <button
          onClick={onAddChapter}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors hover:bg-orange-50"
        >
          <Plus size={12} style={{ color: '#E9A020' }} />
          <span className="text-[13px]" style={{ color: '#E9A020' }}>New chapter</span>
        </button>

        {/* Full Manuscript */}
        <button
          onClick={() => onNavChange('manuscript')}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors"
          style={{
            background: activeNavItem === 'manuscript' ? '#FFF3E0' : 'transparent',
            color: activeNavItem === 'manuscript' ? '#1E2D3D' : '#4B5563',
            fontWeight: activeNavItem === 'manuscript' ? 500 : 400,
          }}
        >
          <FileText size={13} />
          <span className="text-[13px]">Full Manuscript</span>
        </button>

        <div className="mx-1 my-2" style={{ borderTop: '0.5px solid #E5E7EB' }} />

        {/* ── Polish ────────────────────────── */}
        <SectionLabel>Polish</SectionLabel>
        <NavItem id="consistencyCheck" icon="🔍" label="Consistency Check" activeNavItem={activeNavItem} onNavChange={onNavChange} />
        <NavItem id="chapterAudit"     icon="📋" label="Chapter Audit"     activeNavItem={activeNavItem} onNavChange={onNavChange} />
        <NavItem id="vellumExport"     icon="📤" label="Vellum Export"     activeNavItem={activeNavItem} onNavChange={onNavChange} />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
