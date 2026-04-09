'use client'
import { Plus } from 'lucide-react'

const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA', '#F472B6']

export type SidebarSection =
  | 'storyOutline' | 'styleGuide' | 'killList' | 'seriesBible'
  | 'storySoFar'
  | { type: 'chapter'; index: number }
  | 'consistencyCheck' | 'chapterAudit' | 'vellumExport'

interface ChapterInfo {
  index: number
  title: string
  status: 'Draft' | 'Done' | 'Empty'
}

interface Props {
  activeSection: SidebarSection
  onSelectSection: (s: SidebarSection) => void
  chapters: ChapterInfo[]
  onAddChapter: () => void
  storySoFarStatus: 'up_to_date' | 'updating' | 'idle'
}

function isChapter(s: SidebarSection): s is { type: 'chapter'; index: number } {
  return typeof s === 'object' && 'type' in s && s.type === 'chapter'
}

function sectionKey(s: SidebarSection): string {
  if (isChapter(s)) return `chapter:${s.index}`
  return s as string
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft: { bg: '#FFF3DC', text: '#633806' },
  Done:  { bg: '#D6F0E0', text: '#1A6B3A' },
  Empty: { bg: '#F5F5F4', text: '#9CA3AF' },
}

export function WritingSidebar({ activeSection, onSelectSection, chapters, onAddChapter, storySoFarStatus }: Props) {
  const isActive = (s: SidebarSection) => sectionKey(s) === sectionKey(activeSection)

  function NavItem({ section, icon, label, badge }: { section: SidebarSection; icon: string; label: string; badge?: React.ReactNode }) {
    const active = isActive(section)
    return (
      <button
        onClick={() => onSelectSection(section)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] bg-transparent border-none cursor-pointer text-left transition-all duration-150 mb-0.5"
        style={{
          background: active ? '#FFF3E0' : undefined,
          color: '#1E2D3D',
          fontWeight: active ? 500 : 400,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#FAFAF9' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? '#FFF3E0' : '' }}
      >
        <span className="text-[14px] flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {badge}
      </button>
    )
  }

  const storySoFarBadge = storySoFarStatus === 'updating' ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#EDE8FF', color: '#5B3DB5' }}>
      <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
      Updating...
    </span>
  ) : storySoFarStatus === 'up_to_date' ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#D6F0E0', color: '#1A6B3A' }}>
      Up to date
    </span>
  ) : null

  return (
    <aside
      className="flex-shrink-0 flex flex-col overflow-y-auto"
      style={{ width: 196, background: '#FFFFFF', borderRight: '1px solid #EEEBE6' }}
    >
      <nav className="flex-1 px-2 py-3">
        {/* Setup */}
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase px-3 pt-2 pb-1.5" style={{ color: '#9CA3AF' }}>
          Setup
        </div>
        <NavItem section="storyOutline" icon="&#128203;" label="Story Outline" />
        <NavItem section="styleGuide" icon="&#10024;" label="Style Guide" />
        <NavItem section="killList" icon="&#128683;" label="Kill List" />
        <NavItem section="seriesBible" icon="&#127758;" label="Series Bible" />

        <div className="mx-3 my-2" style={{ borderTop: '0.5px solid #EEEBE6' }} />

        {/* Manuscript */}
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase px-3 pt-2 pb-1.5" style={{ color: '#9CA3AF' }}>
          Manuscript
        </div>
        <NavItem section="storySoFar" icon="&#128214;" label="Story So Far" badge={storySoFarBadge} />

        {/* Chapter rows */}
        {chapters.map(ch => {
          const section: SidebarSection = { type: 'chapter', index: ch.index }
          const active = isActive(section)
          const sc = STATUS_COLORS[ch.status] || STATUS_COLORS.Empty
          return (
            <button
              key={ch.index}
              onClick={() => onSelectSection(section)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[12px] bg-transparent border-none cursor-pointer text-left transition-all duration-150 mb-0.5"
              style={{
                background: active ? '#FFF3E0' : undefined,
                fontWeight: active ? 500 : 400,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#FAFAF9' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? '#FFF3E0' : '' }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BOOK_COLORS[ch.index % BOOK_COLORS.length] }} />
              <span className="flex-1 truncate" style={{ color: '#1E2D3D' }}>
                Ch {ch.index + 1}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: sc.bg, color: sc.text }}
              >
                {ch.status}
              </span>
            </button>
          )
        })}

        <button
          onClick={onAddChapter}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[12px] bg-transparent border-none cursor-pointer"
          style={{ color: '#E9A020' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <Plus size={13} />
          New chapter
        </button>

        <div className="mx-3 my-2" style={{ borderTop: '0.5px solid #EEEBE6' }} />

        {/* Polish */}
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase px-3 pt-2 pb-1.5" style={{ color: '#9CA3AF' }}>
          Polish
        </div>
        <NavItem section="consistencyCheck" icon="&#128269;" label="Consistency Check" />
        <NavItem section="chapterAudit" icon="&#128209;" label="Chapter Audit" />
        <NavItem section="vellumExport" icon="&#128228;" label="Vellum Export" />
      </nav>
    </aside>
  )
}
