'use client'
import { useState, useMemo, useCallback } from 'react'
import { Plus, Copy, Sparkles, BookOpen, Upload, Download, FileText, ChevronDown, ChevronUp, ScrollText } from 'lucide-react'
import type { Phase, StyleGuide, ChapterMeta, WorkbookData } from './useWorkbook'
import { FileUploadDialog, type ImportTarget } from './FileUploadDialog'

// ─── WRITING FORMULA REFERENCE CARD ──────────────────────────
const WRITING_FORMULA_TEXT = `WRITING FORMULA:
• Hook readers in the first paragraph — start in the middle of the action
• Introduce key tropes or genre signals within the first 500 words
• Every chapter ends with a cliffhanger, question, or hook
• Short sentences and paragraphs (1-3 sentences max)
• Show don't tell / Minimize dialogue tags
• Balance dialogue, action, and internal thought
• Match the tone and content level set in Writing Style`

const ANTI_SLOP_SUMMARY = `ANTI-SLOP RULES — Banned words include: delve, unpack, tapestry, navigate (emotions), testament, nuanced, profound, visceral, palpable, synergy, holistic. Banned openers: Moreover, Furthermore, Additionally, That said. No adverb + weak verb. No telling emotions. Every detail must be specific.`

// ─── TYPES ───────────────────────────────────────────────────
interface Props {
  phase: Phase
  setPhase: (p: Phase) => void
  getValue: (phase: string, section: string, chapterIndex?: number) => string
  setValue: (phase: string, section: string, content: string, chapterIndex?: number) => void
  isSaving: (phase: string, section: string, chapterIndex?: number) => boolean
  isSaved: (phase: string, section: string, chapterIndex?: number) => boolean
  getStyleGuide: () => StyleGuide
  setStyleGuide: (g: StyleGuide) => void
  getChapterMeta: (p: 'writing' | 'polish') => ChapterMeta
  setChapterMeta: (p: 'writing' | 'polish', m: ChapterMeta) => void
  onSendToChat?: (text: string) => void
  globalKillList: { word: string; scope: 'global' | 'book' }[]
  onUpdateGlobalKillList: (list: { word: string; scope: 'global' | 'book' }[]) => void
  bookId?: string | null
  bookTitle?: string
  data?: WorkbookData
}

const PHASES: { key: Phase; label: string; icon: string }[] = [
  { key: 'setup', label: 'Setup', icon: '⚪' },
  { key: 'writing', label: 'Writing', icon: '🔶' },
  { key: 'edit', label: 'Edit', icon: '🚧' },
  { key: 'polish', label: 'Polish', icon: '✅' },
]

export function WorkbookPane(props: Props) {
  const { phase, setPhase, getValue, setValue, getChapterMeta, setChapterMeta } = props
  const [showUpload, setShowUpload] = useState(false)

  const handleImport = useCallback((target: ImportTarget, content: string) => {
    const CHAPTER_RE = /^(?:chapter\s+\d+|ch\.?\s*\d+|part\s+\d+)/gim

    if (target.type === 'storyOutline') {
      const existing = getValue('setup', 'storyOutline')
      setValue('setup', 'storyOutline', existing ? existing + '\n\n' + content : content)
      setPhase('setup')
    } else if (target.type === 'characterBible') {
      const existing = getValue('setup', 'characterBible')
      setValue('setup', 'characterBible', existing ? existing + '\n\n' + content : content)
      setPhase('setup')
    } else if (target.type === 'singleChapter') {
      const meta = getChapterMeta('writing')
      const idx = meta.count
      setChapterMeta('writing', { count: meta.count + 1, titles: [...meta.titles, ''] })
      setValue('writing', 'chapter', content, idx)
      setPhase('writing')
    } else if (target.type === 'splitChapters') {
      const parts = content.split(CHAPTER_RE).filter(s => s.trim())
      const headings = content.match(CHAPTER_RE) || []
      const meta = getChapterMeta('writing')
      let startIdx = meta.count
      const newTitles = [...meta.titles]
      parts.forEach((text, i) => {
        newTitles.push(headings[i]?.trim() || '')
        setValue('writing', 'chapter', text.trim(), startIdx + i)
      })
      setChapterMeta('writing', { count: startIdx + parts.length, titles: newTitles })
      setPhase('writing')
    }
  }, [getValue, setValue, getChapterMeta, setChapterMeta, setPhase])

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Phase tabs */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #EEEBE6' }}>
        {PHASES.map(p => (
          <button
            key={p.key}
            onClick={() => setPhase(p.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer transition-all"
            style={{
              background: phase === p.key ? '#E9A020' : 'transparent',
              color: phase === p.key ? '#FFFFFF' : '#1E2D3D',
              border: phase === p.key ? 'none' : '1.5px solid #1E2D3D',
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowUpload(true)}
          className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
          style={{ background: 'transparent', color: '#9CA3AF' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E9A020'; e.currentTarget.style.background = '#FFF8F0' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent' }}
          title="Import .docx or .txt file"
        >
          <Upload size={16} />
        </button>
      </div>

      {/* Phase content */}
      <div className="flex-1 overflow-y-auto">
        {phase === 'setup' && <SetupPhase {...props} />}
        {phase === 'writing' && <WritingPhase {...props} />}
        {phase === 'edit' && <EditPhase {...props} />}
        {phase === 'polish' && <PolishPhase {...props} />}
      </div>

      {/* File upload dialog */}
      <FileUploadDialog
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onImport={handleImport}
      />
    </div>
  )
}

// ─── SAVE INDICATOR ──────────────────────────────────────────
function SaveStatus({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="text-[11px]" style={{ color: '#9CA3AF' }}>Saving...</span>
  if (saved) return <span className="text-[11px]" style={{ color: '#6EBF8B' }}>Saved</span>
  return null
}

// ─── TEXTAREA ────────────────────────────────────────────────
function WBTextarea({
  value, onChange, placeholder, minH = 400, showWordCount, phase, section, chapterIndex, isSaving, isSaved,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; minH?: number
  showWordCount?: boolean; phase: string; section: string; chapterIndex?: number
  isSaving: (p: string, s: string, c?: number) => boolean
  isSaved: (p: string, s: string, c?: number) => boolean
}) {
  const wordCount = useMemo(() => value.trim().split(/\s+/).filter(Boolean).length, [value])
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <SaveStatus saving={isSaving(phase, section, chapterIndex)} saved={isSaved(phase, section, chapterIndex)} />
        {showWordCount && value.trim() && (
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{wordCount.toLocaleString()} words</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 rounded-lg text-[15px] leading-[1.7] resize-y outline-none focus:ring-2 focus:ring-amber-200"
        style={{
          minHeight: minH,
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#1E2D3D',
        }}
      />
    </div>
  )
}

// ─── SECTION TABS ────────────────────────────────────────────
function SectionTabs({ tabs, active, setActive }: { tabs: string[]; active: string; setActive: (t: string) => void }) {
  return (
    <div className="flex gap-1 px-4 pt-3 flex-shrink-0" style={{ borderBottom: '1px solid #EEEBE6' }}>
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => setActive(t)}
          className="px-3 py-2 text-xs font-semibold border-none cursor-pointer bg-transparent transition-all"
          style={{
            color: active === t ? '#E9A020' : '#6B7280',
            borderBottom: active === t ? '2px solid #E9A020' : '2px solid transparent',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── KILL LIST ───────────────────────────────────────────────
const ANTI_SLOP_WORDS = [
  'delve', 'unpack', 'tapestry', 'navigate', 'testament', 'nuanced',
  'profound', 'visceral', 'palpable', 'synergy', 'holistic',
]

function KillList({ guide, setGuide, globalKillList, onUpdateGlobalKillList }: {
  guide: StyleGuide; setGuide: (g: StyleGuide) => void
  globalKillList: { word: string; scope: 'global' | 'book' }[]
  onUpdateGlobalKillList: (list: { word: string; scope: 'global' | 'book' }[]) => void
}) {
  const [input, setInput] = useState('')
  const allKills = guide.killList ?? []

  const addWord = () => {
    const word = input.trim().toLowerCase()
    if (!word) return
    if (allKills.some(k => k.word === word) || ANTI_SLOP_WORDS.includes(word)) return
    const updated = [...allKills, { word, scope: 'global' as const }]
    setGuide({ ...guide, killList: updated })
    // Update global list
    const globals = updated.filter(k => k.scope === 'global')
    onUpdateGlobalKillList(globals)
    setInput('')
  }

  const removeWord = (word: string) => {
    const updated = allKills.filter(k => k.word !== word)
    setGuide({ ...guide, killList: updated })
    onUpdateGlobalKillList(updated.filter(k => k.scope === 'global'))
  }

  const toggleScope = (word: string) => {
    const updated = allKills.map(k =>
      k.word === word ? { ...k, scope: (k.scope === 'global' ? 'book' : 'global') as 'global' | 'book' } : k
    )
    setGuide({ ...guide, killList: updated })
    onUpdateGlobalKillList(updated.filter(k => k.scope === 'global'))
  }

  return (
    <div className="mt-4">
      <label className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>Your Kill List</label>
      <p className="text-xs mt-0.5 mb-2" style={{ color: '#9CA3AF' }}>
        Words and phrases to ban from your manuscript. The AI will never use these in any chapter it writes.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWord()}
          placeholder="Type a word and press Enter"
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ borderColor: '#E5E7EB' }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allKills.map(k => (
          <span
            key={k.word}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer"
            style={{
              background: k.scope === 'global' ? '#E9A020' : 'transparent',
              color: k.scope === 'global' ? '#FFFFFF' : '#1E2D3D',
              border: k.scope === 'book' ? '1.5px solid #1E2D3D' : 'none',
            }}
            onClick={() => toggleScope(k.word)}
          >
            {k.word}
            <button
              onClick={e => { e.stopPropagation(); removeWord(k.word) }}
              className="ml-0.5 bg-transparent border-none cursor-pointer text-xs font-bold"
              style={{ color: k.scope === 'global' ? '#FFFFFF' : '#1E2D3D', opacity: 0.7 }}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <p className="text-[11px] text-right mt-1" style={{ color: '#9CA3AF' }}>
        {allKills.length} word{allKills.length !== 1 ? 's' : ''} on your kill list
      </p>
    </div>
  )
}

// ─── AI RULES TOGGLES ────────────────────────────────────────
function AIRulesSection({ guide, setGuide }: { guide: StyleGuide; setGuide: (g: StyleGuide) => void }) {
  const rules = guide.aiRules ?? { antiSlopEnabled: true, writingFormulaEnabled: true }

  const toggle = (key: 'antiSlopEnabled' | 'writingFormulaEnabled') => {
    setGuide({ ...guide, aiRules: { ...rules, [key]: !rules[key] } })
  }

  return (
    <div className="mt-6">
      <label className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>AI Writing Rules</label>
      <p className="text-xs mt-0.5 mb-3" style={{ color: '#9CA3AF' }}>
        These rules guide how the AI writes your chapters. Turn off anything that doesn't fit your style.
      </p>
      <div className="space-y-3">
        <ToggleRow
          label="Anti-Slop Filter"
          description="Prevents the AI from using overused AI phrases — words like 'visceral', 'palpable', 'tapestry', and cliched constructions. Recommended for all genres. Turn off if your genre or readers expect this language."
          enabled={rules.antiSlopEnabled}
          onToggle={() => toggle('antiSlopEnabled')}
        />
        <ToggleRow
          label="Writing Formula"
          description="Applies chapter structure rules — hooks in the first paragraph, cliffhanger endings, short paragraphs. Turn off for literary fiction, cozy mystery, or any genre where you prefer a different structure."
          enabled={rules.writingFormulaEnabled}
          onToggle={() => toggle('writingFormulaEnabled')}
        />
      </div>
    </div>
  )
}

function ToggleRow({ label, description, enabled, onToggle }: {
  label: string; description: string; enabled: boolean; onToggle: () => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#FAFAF9' }}>
      <button
        onClick={onToggle}
        className="w-10 h-5 rounded-full flex-shrink-0 mt-0.5 border-none cursor-pointer transition-colors relative"
        style={{ background: enabled ? '#E9A020' : '#D1D5DB' }}
      >
        <div
          className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
          style={{ left: enabled ? 21 : 2 }}
        />
      </button>
      <div>
        <div className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{description}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SETUP PHASE
// ═══════════════════════════════════════════════════════════════
function SetupPhase(props: Props) {
  const [section, setSection] = useState('Story Outline')
  const { getValue, setValue, isSaving, isSaved, getStyleGuide, setStyleGuide, globalKillList, onUpdateGlobalKillList } = props
  const guide = getStyleGuide()

  return (
    <div>
      <SectionTabs tabs={['Story Outline', 'Character Bible', 'Writing/Style Guide']} active={section} setActive={setSection} />
      <div className="p-4">
        {section === 'Story Outline' && (
          <WBTextarea
            value={getValue('setup', 'storyOutline')}
            onChange={v => setValue('setup', 'storyOutline', v)}
            placeholder="Paste your chapter-by-chapter outline here."
            minH={500}
            phase="setup" section="storyOutline" isSaving={isSaving} isSaved={isSaved}
          />
        )}
        {section === 'Character Bible' && (
          <>
            <WBTextarea
              value={getValue('setup', 'characterBible')}
              onChange={v => setValue('setup', 'characterBible', v)}
              placeholder="Add your characters — names, descriptions, personality, relationships."
              minH={500}
              phase="setup" section="characterBible" isSaving={isSaving} isSaved={isSaved}
            />
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              If your outline already has character details, skip this tab.
            </p>
          </>
        )}
        {section === 'Writing/Style Guide' && (
          <div className="space-y-4">
            <Field label="Niche & sub-niche" value={guide.niche ?? ''} onChange={v => setStyleGuide({ ...guide, niche: v })} />
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E2D3D' }}>Point of view</label>
              <select
                value={guide.pov ?? ''}
                onChange={e => setStyleGuide({ ...guide, pov: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="">Select...</option>
                <option>First Person Single</option>
                <option>First Person Dual</option>
                <option>Third Person Limited</option>
                <option>Third Person Omniscient</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E2D3D' }}>Tense</label>
              <select
                value={guide.tense ?? ''}
                onChange={e => setStyleGuide({ ...guide, tense: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="">Select...</option>
                <option>Present</option>
                <option>Past</option>
              </select>
            </div>
            <Field label="Total word count target" value={guide.totalWordCount ?? ''} onChange={v => setStyleGuide({ ...guide, totalWordCount: v })} type="number" />
            <Field label="Chapter word count target" value={guide.chapterWordCount ?? ''} onChange={v => setStyleGuide({ ...guide, chapterWordCount: v })} placeholder="e.g. 3000-4000" />
            <Field label="Tropes" value={guide.tropes ?? ''} onChange={v => setStyleGuide({ ...guide, tropes: v })} placeholder="enemies to lovers, found family, slow burn, chosen one, unreliable narrator, whodunit..." />

            {/* Writing Formula Reference Card */}
            <div className="p-4 text-xs whitespace-pre-wrap" style={{ background: '#FFF8F0', borderLeft: '3px solid #E9A020', color: '#1E2D3D' }}>
              {WRITING_FORMULA_TEXT}
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#1E2D3D' }}>Personal style preferences</label>
              <textarea
                value={guide.personalStylePreferences ?? ''}
                onChange={e => setStyleGuide({ ...guide, personalStylePreferences: e.target.value })}
                placeholder="Describe your writing style, voice preferences, anything the AI should know about how you write..."
                className="w-full p-3 rounded-lg text-sm resize-y outline-none"
                style={{ minHeight: 120, border: '1px solid #E5E7EB' }}
              />
            </div>

            <KillList guide={guide} setGuide={setStyleGuide} globalKillList={globalKillList} onUpdateGlobalKillList={onUpdateGlobalKillList} />
            <AIRulesSection guide={guide} setGuide={setStyleGuide} />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: '#1E2D3D' }}>{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
        style={{ borderColor: '#E5E7EB' }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// WRITING PHASE
// ═══════════════════════════════════════════════════════════════
function WritingPhase(props: Props) {
  const [section, setSection] = useState('Story So Far')
  return (
    <div>
      <SectionTabs tabs={['Story So Far', 'Drafts']} active={section} setActive={setSection} />
      <div className="p-4">
        {section === 'Story So Far' && (
          <>
            <WBTextarea
              value={props.getValue('writing', 'storySoFar')}
              onChange={v => props.setValue('writing', 'storySoFar', v)}
              placeholder="Running summary of what's happened. Update after each chapter. The AI uses this for continuity."
              minH={400}
              phase="writing" section="storySoFar" isSaving={props.isSaving} isSaved={props.isSaved}
            />
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              Aim for 1-2 paragraphs per completed chapter.
            </p>
          </>
        )}
        {section === 'Drafts' && <ChapterDrafts {...props} phaseKey="writing" />}
      </div>
    </div>
  )
}

// ─── CHAPTER STATUS TAG ─────────────────────────────────────
function ChapterStatusTag({ draftContent, finalContent }: { draftContent: string; finalContent: string }) {
  if (finalContent.trim()) {
    return (
      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: '#6EBF8B', color: '#FFFFFF' }}>
        Final
      </span>
    )
  }
  if (draftContent.trim()) {
    return (
      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: '#E9A020', color: '#FFFFFF' }}>
        Draft
      </span>
    )
  }
  return (
    <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ color: '#9CA3AF', border: '1px solid #D1D5DB' }}>
      Empty
    </span>
  )
}

// ─── EXPORT DROPDOWN ────────────────────────────────────────
function ExportDropdown({ bookId, bookTitle, phaseKey }: { bookId?: string | null; bookTitle?: string; phaseKey: 'writing' | 'polish' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const downloadDocx = async (type: 'manuscript' | 'notes') => {
    if (!bookId) return
    setIsOpen(false)
    const source = phaseKey === 'polish' ? 'final' : 'drafts'
    const res = await fetch('/api/writing-notebook/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, type, format: 'docx', source }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = type === 'notes' ? 'Notes' : (phaseKey === 'polish' ? 'Final' : 'Draft')
    a.download = `${bookTitle || 'Book'} — ${suffix}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyForGoogleDocs = async () => {
    if (!bookId) return
    setIsOpen(false)
    const source = phaseKey === 'polish' ? 'final' : 'drafts'
    const res = await fetch('/api/writing-notebook/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, type: 'manuscript', format: 'text', source }),
    })
    if (!res.ok) return
    const { text } = await res.json()
    await navigator.clipboard.writeText(text)
    showToast('Copied — paste into a new Google Doc')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-transparent border-none cursor-pointer"
        style={{ color: '#9CA3AF' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#E9A020')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
      >
        <Download size={14} /> Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 p-2 rounded-lg min-w-[240px]"
            style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <button
              onClick={() => downloadDocx('manuscript')}
              className="w-full text-left flex items-center gap-2 px-2 py-2 rounded text-xs border-none cursor-pointer"
              style={{ background: 'transparent', color: '#1E2D3D' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <FileText size={14} style={{ color: '#E9A020' }} />
              Download as Word (.docx)
            </button>
            <button
              onClick={copyForGoogleDocs}
              className="w-full text-left flex flex-col items-start px-2 py-2 rounded text-xs border-none cursor-pointer"
              style={{ background: 'transparent', color: '#1E2D3D' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-2">
                <Copy size={14} style={{ color: '#E9A020' }} />
                Copy text for Google Docs
              </div>
              <span className="text-[11px] italic ml-[22px] mt-0.5" style={{ color: '#9CA3AF' }}>
                Open docs.google.com, create a new doc, and paste.
              </span>
            </button>
            <div style={{ height: 1, background: '#EEEBE6', margin: '4px 0' }} />
            <button
              onClick={() => downloadDocx('notes')}
              className="w-full text-left flex items-center gap-2 px-2 py-2 rounded text-xs border-none cursor-pointer"
              style={{ background: 'transparent', color: '#1E2D3D' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <BookOpen size={14} style={{ color: '#E9A020' }} />
              Export outline & notes (.docx)
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg"
          style={{ background: '#6EBF8B', color: '#FFFFFF' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── STORY SO FAR CARD (drawer) ─────────────────────────────
function StorySoFarCard({ content, onEdit }: { content: string; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const isEmpty = !content.trim()

  return (
    <div className="rounded-lg p-3 mb-3" style={{ background: '#EFF6FF', borderLeft: '3px solid #E9A020' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <ScrollText size={14} style={{ color: '#60A5FA' }} />
          <span className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>Story So Far</span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs bg-transparent border-none cursor-pointer"
          style={{ color: '#E9A020', opacity: 0.8 }}
        >
          Edit
        </button>
      </div>
      {isEmpty ? (
        <p className="text-[13px] italic" style={{ color: '#9CA3AF' }}>
          No story summary yet — add one after your first chapter
        </p>
      ) : (
        <>
          <div
            className={`text-[13px] leading-[1.7] ${expanded ? 'max-h-72 overflow-y-auto' : ''}`}
            style={{ color: '#1E2D3D' }}
          >
            {expanded ? content : (content.length > 120 ? content.slice(0, 120) + '...' : content)}
          </div>
          {content.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 mt-1 text-[11px] bg-transparent border-none cursor-pointer"
              style={{ color: '#9CA3AF' }}
            >
              {expanded ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Read more</>}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── CHAPTER DRAFTS ──────────────────────────────────────────
function ChapterDrafts(props: Props & { phaseKey: 'writing' | 'polish' }) {
  const { getValue, setValue, isSaving, isSaved, getChapterMeta, setChapterMeta, onSendToChat, phaseKey, bookId, bookTitle, setPhase } = props
  const meta = getChapterMeta(phaseKey)
  const [activeChapter, setActiveChapter] = useState(0)
  const [showManuscript, setShowManuscript] = useState(false)

  const addChapter = () => {
    const newMeta = { count: meta.count + 1, titles: [...meta.titles, ''] }
    setChapterMeta(phaseKey, newMeta)
  }

  const chapterContent = getValue(phaseKey, 'chapter', activeChapter)
  const chapterTitle = meta.titles[activeChapter] ?? ''

  const setTitle = (title: string) => {
    const titles = [...meta.titles]
    titles[activeChapter] = title
    setChapterMeta(phaseKey, { ...meta, titles })
  }

  const wordCount = useMemo(() => chapterContent.trim().split(/\s+/).filter(Boolean).length, [chapterContent])

  // Full manuscript
  const manuscript = useMemo(() => {
    const parts: string[] = []
    let total = 0
    for (let i = 0; i < meta.count; i++) {
      const c = getValue(phaseKey, 'chapter', i)
      if (c.trim()) {
        const title = meta.titles[i] || `Chapter ${i + 1}`
        parts.push(`— ${title} —\n\n${c}`)
        total += c.trim().split(/\s+/).filter(Boolean).length
      }
    }
    return { text: parts.join('\n\n'), total }
  }, [meta, getValue, phaseKey])

  // Story outline and story so far for drawer cards
  const storyOutline = getValue('setup', 'storyOutline')
  const storySoFar = getValue('writing', 'storySoFar')

  if (showManuscript) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => setShowManuscript(false)} className="text-xs font-medium bg-transparent border-none cursor-pointer" style={{ color: '#E9A020' }}>
            Back to chapters
          </button>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>{manuscript.total.toLocaleString()} words total</span>
        </div>
        <div className="p-6 rounded-lg text-[15px] leading-[1.8] whitespace-pre-wrap" style={{ background: '#FFF8F0', maxWidth: 800, color: '#1E2D3D' }}>
          {manuscript.text || 'No chapters written yet.'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      {/* ── Chapter Drawer (left sidebar) ── */}
      <div className="w-64 flex-shrink-0 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {/* Drawer header */}
        <div className="flex items-center justify-between mb-3">
          <ExportDropdown bookId={bookId} bookTitle={bookTitle} phaseKey={phaseKey} />
          <button
            onClick={addChapter}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer"
            style={{ background: '#E9A020', color: '#FFFFFF' }}
          >
            <Plus size={12} /> New Chapter
          </button>
        </div>

        {/* 1. Story Outline card */}
        <div className="rounded-lg p-3 mb-3" style={{ background: '#FFF8F0', borderLeft: '3px solid #E9A020' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} style={{ color: '#E9A020' }} />
              <span className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>Story Outline</span>
            </div>
            <button
              onClick={() => setPhase('setup')}
              className="text-xs bg-transparent border-none cursor-pointer"
              style={{ color: '#E9A020', opacity: 0.8 }}
            >
              Edit
            </button>
          </div>
          <p className="text-[13px]" style={{ color: '#6B7280' }}>
            {storyOutline ? (storyOutline.length > 80 ? storyOutline.slice(0, 80) + '...' : storyOutline) : (
              <span className="italic" style={{ color: '#9CA3AF' }}>No outline yet</span>
            )}
          </p>
        </div>

        {/* 2. Story So Far card */}
        <StorySoFarCard
          content={storySoFar}
          onEdit={() => {
            setPhase('writing')
            // The WritingPhase will default to "Story So Far" tab
          }}
        />

        {/* 3. Chapter cards */}
        <div className="space-y-1.5">
          {Array.from({ length: meta.count }, (_, i) => {
            const draftContent = getValue('writing', 'chapter', i)
            const finalContent = getValue('polish', 'chapter', i)
            const title = meta.titles[i] || `Chapter ${i + 1}`
            const isActive = activeChapter === i
            return (
              <button
                key={i}
                onClick={() => setActiveChapter(i)}
                className="w-full text-left p-2.5 rounded-lg border-none cursor-pointer transition-colors"
                style={{
                  background: isActive ? '#FFF8F0' : '#FFFFFF',
                  border: isActive ? '1.5px solid #E9A020' : '1px solid #E5E7EB',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                    {i + 1}
                  </span>
                  <ChapterStatusTag draftContent={draftContent} finalContent={finalContent} />
                  <span className="text-xs truncate flex-1" style={{ color: '#1E2D3D' }}>{title}</span>
                </div>
                {draftContent.trim() && (
                  <p className="text-[11px] mt-1 truncate ml-7" style={{ color: '#9CA3AF' }}>
                    {draftContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {meta.count === 0 && (
          <p className="text-xs text-center mt-4 italic" style={{ color: '#9CA3AF' }}>
            No chapters yet. Click "+ New Chapter" to start writing.
          </p>
        )}

        {/* View Full Manuscript */}
        <button
          onClick={() => setShowManuscript(true)}
          className="flex items-center gap-1.5 mt-4 text-xs font-medium bg-transparent border-none cursor-pointer w-full justify-center"
          style={{ color: '#E9A020' }}
        >
          <BookOpen size={14} /> View Full Manuscript
        </button>
      </div>

      {/* ── Chapter Editor (main area) ── */}
      <div className="flex-1 min-w-0">
        <input
          value={chapterTitle}
          onChange={e => setTitle(e.target.value)}
          placeholder="Chapter title (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none mb-2"
          style={{ borderColor: '#E5E7EB' }}
        />
        <WBTextarea
          value={chapterContent}
          onChange={v => setValue(phaseKey, 'chapter', v, activeChapter)}
          placeholder={phaseKey === 'polish' ? 'Final draft for this chapter...' : 'Write your chapter here...'}
          minH={600}
          showWordCount
          phase={phaseKey} section="chapter" chapterIndex={activeChapter}
          isSaving={isSaving} isSaved={isSaved}
        />

        {/* Actions */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(chapterContent)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-transparent border-none cursor-pointer"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              <Copy size={12} /> Copy
            </button>
            {onSendToChat && (
              <button
                onClick={() => onSendToChat(`Here is Chapter ${activeChapter + 1}: ${chapterContent}. Please review and suggest improvements.`)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-transparent cursor-pointer"
                style={{ color: '#E9A020', border: '1.5px solid #E9A020' }}
              >
                <Sparkles size={12} /> Send to AI
              </button>
            )}
          </div>
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{wordCount.toLocaleString()} words</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EDIT PHASE
// ═══════════════════════════════════════════════════════════════
function EditPhase(props: Props) {
  const [section, setSection] = useState('Diagnose')
  const { getValue, setValue, isSaving, isSaved } = props
  const [diagnoseStatus, setDiagnoseStatus] = useState<'not_started' | 'in_progress' | 'complete'>('not_started')
  const [planStatus, setPlanStatus] = useState<'not_started' | 'in_progress' | 'complete'>('not_started')

  const statusIcons = { not_started: '⚪', in_progress: '🔶', complete: '✅' }
  const statusLabels = { not_started: 'Not started', in_progress: 'In progress', complete: 'Complete' }
  const nextStatus = (s: typeof diagnoseStatus) => s === 'not_started' ? 'in_progress' : s === 'in_progress' ? 'complete' : 'not_started'

  return (
    <div>
      <SectionTabs tabs={['Diagnose', 'Plan']} active={section} setActive={setSection} />
      <div className="p-4">
        {section === 'Diagnose' && (
          <>
            <WBTextarea
              value={getValue('edit', 'diagnose')}
              onChange={v => setValue('edit', 'diagnose', v)}
              placeholder="Paste AI diagnostic feedback here."
              minH={400}
              phase="edit" section="diagnose" isSaving={isSaving} isSaved={isSaved}
            />
            <button
              onClick={() => setDiagnoseStatus(nextStatus(diagnoseStatus))}
              className="mt-2 text-xs font-medium bg-transparent border-none cursor-pointer"
              style={{ color: '#6B7280' }}
            >
              {statusIcons[diagnoseStatus]} {statusLabels[diagnoseStatus]}
            </button>
          </>
        )}
        {section === 'Plan' && (
          <>
            <WBTextarea
              value={getValue('edit', 'plan')}
              onChange={v => setValue('edit', 'plan', v)}
              placeholder="Your edit plan — the specific changes you'll make."
              minH={400}
              phase="edit" section="plan" isSaving={isSaving} isSaved={isSaved}
            />
            <button
              onClick={() => setPlanStatus(nextStatus(planStatus))}
              className="mt-2 text-xs font-medium bg-transparent border-none cursor-pointer"
              style={{ color: '#6B7280' }}
            >
              {statusIcons[planStatus]} {statusLabels[planStatus]}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// POLISH PHASE
// ═══════════════════════════════════════════════════════════════
function PolishPhase(props: Props) {
  const [section, setSection] = useState('Verify')
  const { getValue, setValue, isSaving, isSaved, getChapterMeta } = props

  // Complete manuscript from polish final drafts
  const meta = getChapterMeta('polish')
  const manuscript = useMemo(() => {
    const parts: string[] = []
    let total = 0
    for (let i = 0; i < meta.count; i++) {
      const c = getValue('polish', 'chapter', i)
      if (c.trim()) {
        const title = meta.titles[i] || `Chapter ${i + 1}`
        parts.push(`— ${title} —\n\n${c}`)
        total += c.trim().split(/\s+/).filter(Boolean).length
      }
    }
    return { text: parts.join('\n\n'), total }
  }, [meta, getValue])

  return (
    <div>
      <SectionTabs tabs={['Verify', 'Final Drafts', 'Complete Manuscript']} active={section} setActive={setSection} />
      <div className="p-4">
        {section === 'Verify' && (
          <WBTextarea
            value={getValue('polish', 'verify')}
            onChange={v => setValue('polish', 'verify', v)}
            placeholder="Paste AI verification notes here."
            minH={400}
            phase="polish" section="verify" isSaving={isSaving} isSaved={isSaved}
          />
        )}
        {section === 'Final Drafts' && <ChapterDrafts {...props} phaseKey="polish" />}
        {section === 'Complete Manuscript' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>Complete Manuscript</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{manuscript.total.toLocaleString()} words</span>
            </div>
            <div className="p-6 rounded-lg text-[15px] leading-[1.8] whitespace-pre-wrap mb-4" style={{ background: '#FFF8F0', maxWidth: 800, color: '#1E2D3D' }}>
              {manuscript.text || 'No final drafts written yet.'}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(manuscript.text)}
              className="w-full py-3 rounded-lg text-sm font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: '#E9A020', color: '#FFFFFF' }}
            >
              <Copy size={16} /> Copy Full Manuscript
            </button>
            <p className="text-xs text-center mt-2" style={{ color: '#9CA3AF' }}>
              Your complete manuscript. Ready to copy into Vellum.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
