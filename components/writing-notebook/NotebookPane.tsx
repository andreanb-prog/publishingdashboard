'use client'
// components/writing-notebook/NotebookPane.tsx
import { useCallback } from 'react'
import type { ChapterMeta } from '@/app/writing-notebook/page'
import { WorkbookImporter } from './WorkbookImporter'

type Phase = 'setup' | 'writing' | 'polish'

interface Props {
  bookId: string
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

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function NotebookPane({
  bookId, activePhase, onPhaseChange, activeSection, activeChapterIndex,
  onSectionChange, getValue, setValue, getChapterMeta, saving, saved, onReloadWorkbook,
}: Props) {
  const getKey = useCallback((phase: string, section: string, chapterIndex?: number) => {
    return chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
  }, [])

  const writingMeta = getChapterMeta('writing')
  const polishMeta = getChapterMeta('polish')

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
                  </div>
                  <textarea
                    key={`ch-${i}-${bookId}-${content ? 'loaded' : 'empty'}`}
                    defaultValue={content}
                    placeholder="Start writing your chapter\u2026"
                    onFocus={() => onSectionChange('chapter', i)}
                    onBlur={(e) => setValue('writing', 'chapter', e.target.value, i)}
                    className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none transition-shadow"
                    style={{ border: 'none', minHeight: isActive ? 300 : 100, color: '#1E2D3D', lineHeight: '1.8' }}
                    rows={isActive ? 15 : 4}
                  />
                </div>
              )
            })}
          </>
        )}

        {/* POLISH phase */}
        {activePhase === 'polish' && (
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
                    placeholder="Paste or write your final draft here\u2026"
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
      </div>
    </div>
  )
}
