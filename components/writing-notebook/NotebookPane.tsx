'use client'
// components/writing-notebook/NotebookPane.tsx
import { useState, useCallback } from 'react'

type Phase = 'setup' | 'writing' | 'polish'
type NRecord = {
  id: string; phase: string; section: string; chapterIndex: number | null
  chapterTitle: string | null; content: string; wordCount: number
}

interface Props {
  bookId: string
  activePhase: Phase
  onPhaseChange: (p: Phase) => void
  activeSection: string
  activeChapterIndex: number | null
  onSectionChange: (section: string, chapterIndex?: number | null) => void
  records: NRecord[]
  onRecordSaved: () => void
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

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <span
      className="text-[11px] font-medium transition-opacity duration-300"
      style={{ color: '#6EBF8B', opacity: visible ? 1 : 0 }}
    >
      Saved \u2713
    </span>
  )
}

export function NotebookPane({
  bookId, activePhase, onPhaseChange, activeSection, activeChapterIndex,
  onSectionChange, records, onRecordSaved,
}: Props) {
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({})

  const getRecord = useCallback((phase: string, section: string, chapterIndex?: number | null) => {
    return records.find(r =>
      r.phase === phase && r.section === section &&
      (chapterIndex !== undefined ? r.chapterIndex === chapterIndex : true)
    )
  }, [records])

  const save = useCallback(async (
    phase: string, section: string, content: string,
    chapterIndex?: number | null, chapterTitle?: string | null
  ) => {
    const key = `${phase}-${section}-${chapterIndex ?? ''}`
    await fetch('/api/writing-notebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, phase, section, chapterIndex: chapterIndex ?? null, chapterTitle, content }),
    })
    setSavedFields(s => ({ ...s, [key]: true }))
    setTimeout(() => setSavedFields(s => ({ ...s, [key]: false })), 2000)
    onRecordSaved()
  }, [bookId, onRecordSaved])

  const chapters = records
    .filter(r => r.phase === 'writing' && r.section === 'chapter')
    .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))

  const finalDrafts = records
    .filter(r => r.phase === 'polish' && r.section === 'finalDraft')
    .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))

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
        {activePhase === 'setup' && SETUP_SECTIONS.map(sec => {
          const rec = getRecord('setup', sec.id)
          const key = `setup-${sec.id}-`
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
                <SavedToast visible={!!savedFields[key]} />
              </div>
              <textarea
                defaultValue={rec?.content ?? ''}
                placeholder={sec.placeholder}
                onFocus={() => onSectionChange(sec.id)}
                onBlur={(e) => save('setup', sec.id, e.target.value)}
                className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow"
                style={{
                  border: '0.5px solid #E5E7EB',
                  minHeight: activeSection === sec.id ? 200 : 80,
                  color: '#1E2D3D',
                }}
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
                <button
                  onClick={() => onSectionChange('storySoFar')}
                  className="text-sm font-medium"
                  style={{ color: activeSection === 'storySoFar' ? '#E9A020' : '#1E2D3D' }}
                >
                  Story So Far
                </button>
                <SavedToast visible={!!savedFields['writing-storySoFar-']} />
              </div>
              <textarea
                defaultValue={getRecord('writing', 'storySoFar')?.content ?? ''}
                placeholder="Summarize what has happened so far in the story. The AI uses this for continuity."
                onFocus={() => onSectionChange('storySoFar')}
                onBlur={(e) => save('writing', 'storySoFar', e.target.value)}
                className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 transition-shadow"
                style={{ border: '0.5px solid #E5E7EB', minHeight: 80, color: '#1E2D3D' }}
                rows={3}
              />
            </div>

            {/* Chapter drafts */}
            {chapters.length === 0 && (
              <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                <p className="text-sm">No chapters yet. Use the chapter drawer to add one, or ask the AI.</p>
              </div>
            )}
            {chapters.map(ch => {
              const key = `writing-chapter-${ch.chapterIndex}`
              const isActive = activeSection === 'chapter' && activeChapterIndex === ch.chapterIndex
              return (
                <div
                  key={ch.id}
                  className="rounded-lg p-3 transition-colors"
                  style={{
                    border: isActive ? '1.5px solid #E9A020' : '0.5px solid #E5E7EB',
                    background: isActive ? '#FFFBF0' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: '#E9A020', color: '#FFFFFF' }}
                    >
                      Ch {ch.chapterIndex}
                    </span>
                    <input
                      defaultValue={ch.chapterTitle ?? ''}
                      placeholder="Chapter title"
                      onBlur={(e) => save('writing', 'chapter', ch.content, ch.chapterIndex, e.target.value)}
                      onClick={() => onSectionChange('chapter', ch.chapterIndex)}
                      className="flex-1 text-sm font-medium bg-transparent focus:outline-none"
                      style={{ color: '#1E2D3D' }}
                    />
                    <SavedToast visible={!!savedFields[key]} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {ch.wordCount.toLocaleString()} words
                    </span>
                  </div>
                  <textarea
                    defaultValue={ch.content ?? ''}
                    placeholder="Start writing your chapter\u2026"
                    onFocus={() => onSectionChange('chapter', ch.chapterIndex)}
                    onBlur={(e) => save('writing', 'chapter', e.target.value, ch.chapterIndex, ch.chapterTitle)}
                    className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none transition-shadow"
                    style={{
                      border: 'none',
                      minHeight: isActive ? 300 : 100,
                      color: '#1E2D3D',
                      lineHeight: '1.8',
                    }}
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
            {finalDrafts.length === 0 && (
              <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                <p className="text-sm">No final drafts yet. Finish your chapters in the Writing phase first.</p>
              </div>
            )}
            {finalDrafts.map(ch => {
              const key = `polish-finalDraft-${ch.chapterIndex}`
              const isActive = activeSection === 'finalDraft' && activeChapterIndex === ch.chapterIndex
              return (
                <div
                  key={ch.id}
                  className="rounded-lg p-3"
                  style={{
                    border: isActive ? '1.5px solid #6EBF8B' : '0.5px solid #E5E7EB',
                    background: isActive ? '#F0FDF4' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: '#6EBF8B', color: '#FFFFFF' }}
                    >
                      Ch {ch.chapterIndex}
                    </span>
                    <input
                      defaultValue={ch.chapterTitle ?? ''}
                      placeholder="Chapter title"
                      onBlur={(e) => save('polish', 'finalDraft', ch.content, ch.chapterIndex, e.target.value)}
                      onClick={() => onSectionChange('finalDraft', ch.chapterIndex)}
                      className="flex-1 text-sm font-medium bg-transparent focus:outline-none"
                      style={{ color: '#1E2D3D' }}
                    />
                    <SavedToast visible={!!savedFields[key]} />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {ch.wordCount.toLocaleString()} words
                    </span>
                  </div>
                  <textarea
                    defaultValue={ch.content ?? ''}
                    placeholder="Paste or write your final draft here\u2026"
                    onFocus={() => onSectionChange('finalDraft', ch.chapterIndex)}
                    onBlur={(e) => save('polish', 'finalDraft', e.target.value, ch.chapterIndex, ch.chapterTitle)}
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
