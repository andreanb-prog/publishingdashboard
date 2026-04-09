'use client'
import { useState, useMemo } from 'react'
import { Plus, Copy, Sparkles, BookOpen, Check } from 'lucide-react'

interface WorkbookProps {
  getValue: (phase: string, section: string, chapterIndex?: number | null) => string
  setValue: (phase: string, section: string, chapterIndex: number | null, value: string) => void
  getSaveState: (phase: string, section: string, chapterIndex?: number | null) => 'idle' | 'saving' | 'saved'
  onSendToChat: (text: string) => void
  activePhase: string
  setActivePhase: (p: string) => void
}

const PHASES = [
  { key: 'setup', label: 'Setup' },
  { key: 'writing', label: 'Writing' },
  { key: 'edit', label: 'Edit' },
  { key: 'polish', label: 'Polish' },
]

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'idle') return null
  return (
    <span className="text-[12px]" style={{ color: state === 'saving' ? '#9CA3AF' : '#6EBF8B' }}>
      {state === 'saving' ? 'Saving...' : 'Saved'}
    </span>
  )
}

function AutoSaveTextarea({
  value,
  onChange,
  saveState,
  placeholder,
  minHeight = 400,
  helper,
}: {
  value: string
  onChange: (v: string) => void
  saveState: 'idle' | 'saving' | 'saved'
  placeholder: string
  minHeight?: number
  helper?: string
}) {
  return (
    <div>
      <div className="flex justify-end mb-1">
        <SaveIndicator state={saveState} />
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 rounded-lg text-[15px] outline-none resize-y"
        style={{
          minHeight,
          border: '1px solid #E5E7EB',
          background: 'white',
          color: '#1E2D3D',
          lineHeight: 1.7,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      />
      {helper && (
        <p className="text-[12px] mt-1" style={{ color: '#9CA3AF' }}>{helper}</p>
      )}
    </div>
  )
}

function SectionTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 mb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="px-4 py-2 text-[13px] font-medium cursor-pointer bg-transparent border-none"
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

// ── SETUP PHASE ────────────────────────────────────
function SetupPhase({ getValue, setValue, getSaveState }: Pick<WorkbookProps, 'getValue' | 'setValue' | 'getSaveState'>) {
  const [section, setSection] = useState('Story Outline')

  // Parse style guide JSON
  const styleGuideRaw = getValue('setup', 'styleGuide')
  const styleGuide = useMemo(() => {
    try { return JSON.parse(styleGuideRaw || '{}') }
    catch { return {} }
  }, [styleGuideRaw])

  const updateStyleGuide = (field: string, val: string) => {
    const updated = { ...styleGuide, [field]: val }
    setValue('setup', 'styleGuide', null, JSON.stringify(updated))
  }

  return (
    <>
      <SectionTabs tabs={['Story Outline', 'Character Bible', 'Style Guide']} active={section} onChange={setSection} />

      {section === 'Story Outline' && (
        <AutoSaveTextarea
          value={getValue('setup', 'outline')}
          onChange={v => setValue('setup', 'outline', null, v)}
          saveState={getSaveState('setup', 'outline')}
          placeholder="Paste your chapter-by-chapter outline here."
          minHeight={500}
        />
      )}

      {section === 'Character Bible' && (
        <AutoSaveTextarea
          value={getValue('setup', 'characterBible')}
          onChange={v => setValue('setup', 'characterBible', null, v)}
          saveState={getSaveState('setup', 'characterBible')}
          placeholder="Add your characters — names, descriptions, personality, relationships."
          minHeight={500}
          helper="If your outline already has character details, you can skip this tab."
        />
      )}

      {section === 'Style Guide' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <SaveIndicator state={getSaveState('setup', 'styleGuide')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Niche & sub-niche</label>
              <input
                type="text"
                value={styleGuide.niche || ''}
                onChange={e => updateStyleGuide('niche', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                style={{ border: '1px solid #E5E7EB', color: '#1E2D3D' }}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Point of view</label>
              <select
                value={styleGuide.pov || ''}
                onChange={e => updateStyleGuide('pov', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none cursor-pointer"
                style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white' }}
              >
                <option value="">Select...</option>
                <option value="First Person Single">First Person Single</option>
                <option value="First Person Dual">First Person Dual</option>
                <option value="Third Person Limited">Third Person Limited</option>
                <option value="Third Person Omniscient">Third Person Omniscient</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Tense</label>
              <select
                value={styleGuide.tense || ''}
                onChange={e => updateStyleGuide('tense', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none cursor-pointer"
                style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white' }}
              >
                <option value="">Select...</option>
                <option value="Present">Present</option>
                <option value="Past">Past</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Total word count target</label>
              <input
                type="number"
                value={styleGuide.totalWordCount || ''}
                onChange={e => updateStyleGuide('totalWordCount', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                style={{ border: '1px solid #E5E7EB', color: '#1E2D3D' }}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Chapter word count target</label>
              <input
                type="text"
                value={styleGuide.chapterWordCount || ''}
                onChange={e => updateStyleGuide('chapterWordCount', e.target.value)}
                placeholder="e.g. 1500-2000"
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                style={{ border: '1px solid #E5E7EB', color: '#1E2D3D' }}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Tropes</label>
              <input
                type="text"
                value={styleGuide.tropes || ''}
                onChange={e => updateStyleGuide('tropes', e.target.value)}
                placeholder="enemies to lovers, found family, slow burn, chosen one, unreliable narrator, whodunit..."
                className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
                style={{ border: '1px solid #E5E7EB', color: '#1E2D3D' }}
              />
            </div>
          </div>

          {/* Writing Formula reference card */}
          <div className="p-4 rounded-none" style={{ background: '#FFF8F0', borderLeft: '3px solid #E9A020' }}>
            <div className="text-[13px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>Writing Formula</div>
            <ul className="text-[12px] space-y-1 m-0 pl-4" style={{ color: '#6B7280' }}>
              <li>Hook readers in the first paragraph — start in the middle of the action</li>
              <li>Introduce key tropes within the first 500 words</li>
              <li>Every chapter ends with a cliffhanger or hook</li>
              <li>Short sentences and paragraphs (1–3 sentences max)</li>
              <li>Show don&apos;t tell — minimize dialogue tags</li>
              <li>Balance dialogue, action, and internal thought</li>
            </ul>
          </div>

          <div>
            <label className="text-[12px] font-semibold block mb-1" style={{ color: '#1E2D3D' }}>Personal style preferences</label>
            <textarea
              value={styleGuide.personalStyle || ''}
              onChange={e => updateStyleGuide('personalStyle', e.target.value)}
              placeholder="Your personal rules — what to avoid, sentence style, dialogue rules."
              className="w-full p-4 rounded-lg text-[14px] outline-none resize-y"
              style={{ minHeight: 120, border: '1px solid #E5E7EB', color: '#1E2D3D', lineHeight: 1.7 }}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ── WRITING PHASE ──────────────────────────────────
function WritingPhase({ getValue, setValue, getSaveState, onSendToChat }: Pick<WorkbookProps, 'getValue' | 'setValue' | 'getSaveState' | 'onSendToChat'>) {
  const [section, setSection] = useState('Story So Far')
  const [activeChapter, setActiveChapter] = useState(0)
  const [showFullManuscript, setShowFullManuscript] = useState(false)

  // Chapter metadata
  const chapterMetaRaw = getValue('writing', 'chapterMeta')
  const chapterMeta = useMemo(() => {
    try { return JSON.parse(chapterMetaRaw || '{"count":1,"titles":[]}') }
    catch { return { count: 1, titles: [] } }
  }, [chapterMetaRaw])

  const chapterCount = chapterMeta.count || 1
  const chapterTitles: string[] = chapterMeta.titles || []

  const updateChapterMeta = (updates: Partial<typeof chapterMeta>) => {
    const updated = { ...chapterMeta, ...updates }
    setValue('writing', 'chapterMeta', null, JSON.stringify(updated))
  }

  const addChapter = () => {
    const newCount = chapterCount + 1
    updateChapterMeta({ count: newCount })
    setActiveChapter(newCount - 1)
  }

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0

  const handleSendToAI = (chIdx: number) => {
    const content = getValue('writing', 'drafts', chIdx)
    if (!content.trim()) return
    onSendToChat(`Here is Chapter ${chIdx + 1}: ${content}. Please review and suggest improvements.`)
  }

  // Full manuscript concatenation
  const fullManuscript = useMemo(() => {
    const chapters: string[] = []
    for (let i = 0; i < chapterCount; i++) {
      const content = getValue('writing', 'drafts', i)
      if (content.trim()) chapters.push(`— Chapter ${i + 1}${chapterTitles[i] ? ': ' + chapterTitles[i] : ''} —\n\n${content}`)
    }
    return chapters.join('\n\n')
  }, [chapterCount, getValue, chapterTitles])

  return (
    <>
      <SectionTabs tabs={['Story So Far', 'Drafts']} active={section} onChange={setSection} />

      {section === 'Story So Far' && (
        <AutoSaveTextarea
          value={getValue('writing', 'storySoFar')}
          onChange={v => setValue('writing', 'storySoFar', null, v)}
          saveState={getSaveState('writing', 'storySoFar')}
          placeholder="Running summary of what's happened. Update after each chapter."
          helper="Aim for 1-2 paragraphs per completed chapter."
        />
      )}

      {section === 'Drafts' && !showFullManuscript && (
        <div>
          {/* Chapter pills */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {Array.from({ length: chapterCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setActiveChapter(i)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0"
                style={{
                  background: activeChapter === i ? '#E9A020' : 'transparent',
                  color: activeChapter === i ? 'white' : '#1E2D3D',
                  border: activeChapter === i ? 'none' : '1px solid #1E2D3D',
                }}
              >
                Ch {i + 1}
              </button>
            ))}
            <button
              onClick={addChapter}
              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ border: '1px solid #E9A020', background: 'transparent', color: '#E9A020' }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Chapter title */}
          <input
            type="text"
            value={chapterTitles[activeChapter] || ''}
            onChange={e => {
              const titles = [...chapterTitles]
              titles[activeChapter] = e.target.value
              updateChapterMeta({ titles })
            }}
            placeholder="Chapter title (optional)"
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none mb-3"
            style={{ border: '1px solid #E5E7EB', color: '#1E2D3D' }}
          />

          {/* Chapter textarea */}
          <AutoSaveTextarea
            value={getValue('writing', 'drafts', activeChapter)}
            onChange={v => setValue('writing', 'drafts', activeChapter, v)}
            saveState={getSaveState('writing', 'drafts', activeChapter)}
            placeholder={`Write Chapter ${activeChapter + 1} here...`}
            minHeight={600}
          />

          {/* Word count + actions */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
              {wordCount(getValue('writing', 'drafts', activeChapter)).toLocaleString()} words
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(getValue('writing', 'drafts', activeChapter))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer"
                style={{ background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280' }}
              >
                <Copy size={12} /> Copy
              </button>
              <button
                onClick={() => handleSendToAI(activeChapter)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer"
                style={{ background: 'transparent', border: '1px solid #E9A020', color: '#E9A020' }}
              >
                <Sparkles size={12} /> Send to AI
              </button>
            </div>
          </div>

          {/* View Full Manuscript toggle */}
          <button
            onClick={() => setShowFullManuscript(true)}
            className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg text-[13px] cursor-pointer"
            style={{ background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280' }}
          >
            <BookOpen size={14} /> View Full Manuscript
          </button>
        </div>
      )}

      {section === 'Drafts' && showFullManuscript && (
        <div>
          <button
            onClick={() => setShowFullManuscript(false)}
            className="text-[12px] mb-3 cursor-pointer bg-transparent border-none"
            style={{ color: '#E9A020' }}
          >
            ← Back to chapters
          </button>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold" style={{ color: '#1E2D3D' }}>Full Manuscript</span>
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{wordCount(fullManuscript).toLocaleString()} words total</span>
          </div>
          <div
            className="p-6 rounded-lg whitespace-pre-wrap text-[15px]"
            style={{ background: '#FFF8F0', color: '#1E2D3D', lineHeight: 1.7, maxWidth: 800, margin: '0 auto' }}
          >
            {fullManuscript || 'No chapters written yet.'}
          </div>
        </div>
      )}
    </>
  )
}

// ── EDIT PHASE ─────────────────────────────────────
function EditPhase({ getValue, setValue, getSaveState }: Pick<WorkbookProps, 'getValue' | 'setValue' | 'getSaveState'>) {
  const [section, setSection] = useState('Diagnose')

  return (
    <>
      <SectionTabs tabs={['Diagnose', 'Plan']} active={section} onChange={setSection} />

      {section === 'Diagnose' && (
        <AutoSaveTextarea
          value={getValue('edit', 'diagnose')}
          onChange={v => setValue('edit', 'diagnose', null, v)}
          saveState={getSaveState('edit', 'diagnose')}
          placeholder="Paste AI diagnostic feedback here — what issues were identified, what's working, what needs fixing."
        />
      )}

      {section === 'Plan' && (
        <AutoSaveTextarea
          value={getValue('edit', 'plan')}
          onChange={v => setValue('edit', 'plan', null, v)}
          saveState={getSaveState('edit', 'plan')}
          placeholder="Your edit plan — the specific changes you'll make."
        />
      )}
    </>
  )
}

// ── POLISH PHASE ───────────────────────────────────
function PolishPhase({ getValue, setValue, getSaveState }: Pick<WorkbookProps, 'getValue' | 'setValue' | 'getSaveState'>) {
  const [section, setSection] = useState('Verify')
  const [activeChapter, setActiveChapter] = useState(0)
  const [copied, setCopied] = useState(false)

  // Reuse chapter meta from writing phase
  const chapterMetaRaw = getValue('writing', 'chapterMeta')
  const chapterMeta = useMemo(() => {
    try { return JSON.parse(chapterMetaRaw || '{"count":1,"titles":[]}') }
    catch { return { count: 1, titles: [] } }
  }, [chapterMetaRaw])

  const chapterCount = chapterMeta.count || 1
  const chapterTitles: string[] = chapterMeta.titles || []

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0

  // Complete manuscript
  const completeManuscript = useMemo(() => {
    const chapters: string[] = []
    for (let i = 0; i < chapterCount; i++) {
      const content = getValue('polish', 'finalDrafts', i)
      if (content.trim()) chapters.push(`— Chapter ${i + 1}${chapterTitles[i] ? ': ' + chapterTitles[i] : ''} —\n\n${content}`)
    }
    return chapters.join('\n\n')
  }, [chapterCount, getValue, chapterTitles])

  const handleCopyAll = () => {
    navigator.clipboard.writeText(completeManuscript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <SectionTabs tabs={['Verify', 'Final Drafts', 'Complete Manuscript']} active={section} onChange={setSection} />

      {section === 'Verify' && (
        <AutoSaveTextarea
          value={getValue('polish', 'verify')}
          onChange={v => setValue('polish', 'verify', null, v)}
          saveState={getSaveState('polish', 'verify')}
          placeholder="Paste AI verification notes — consistency checks, continuity issues, final polish."
        />
      )}

      {section === 'Final Drafts' && (
        <div>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {Array.from({ length: chapterCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setActiveChapter(i)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0"
                style={{
                  background: activeChapter === i ? '#E9A020' : 'transparent',
                  color: activeChapter === i ? 'white' : '#1E2D3D',
                  border: activeChapter === i ? 'none' : '1px solid #1E2D3D',
                }}
              >
                Final — Ch {i + 1}
              </button>
            ))}
          </div>

          <AutoSaveTextarea
            value={getValue('polish', 'finalDrafts', activeChapter)}
            onChange={v => setValue('polish', 'finalDrafts', activeChapter, v)}
            saveState={getSaveState('polish', 'finalDrafts', activeChapter)}
            placeholder={`Final draft of Chapter ${activeChapter + 1}...`}
            minHeight={600}
          />
          <div className="flex justify-end mt-2">
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
              {wordCount(getValue('polish', 'finalDrafts', activeChapter)).toLocaleString()} words
            </span>
          </div>
        </div>
      )}

      {section === 'Complete Manuscript' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{wordCount(completeManuscript).toLocaleString()} words total</span>
          </div>
          <div
            className="p-6 rounded-lg whitespace-pre-wrap text-[15px] mb-4"
            style={{ background: '#FFF8F0', color: '#1E2D3D', lineHeight: 1.7, maxWidth: 800, margin: '0 auto' }}
          >
            {completeManuscript || 'No final drafts written yet.'}
          </div>
          <button
            onClick={handleCopyAll}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-[14px] font-semibold cursor-pointer"
            style={{ background: '#E9A020', color: 'white', border: 'none' }}
          >
            {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Full Manuscript</>}
          </button>
          <p className="text-[12px] text-center mt-2" style={{ color: '#9CA3AF' }}>
            Your complete manuscript. Ready to copy into Vellum.
          </p>
        </div>
      )}
    </>
  )
}

// ── MAIN WORKBOOK ──────────────────────────────────
export function Workbook(props: WorkbookProps) {
  const { activePhase, setActivePhase } = props

  return (
    <div className="flex flex-col h-full">
      {/* Phase tabs */}
      <div className="flex gap-1 p-2 sticky top-0 z-10" style={{ background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        {PHASES.map(p => (
          <button
            key={p.key}
            onClick={() => setActivePhase(p.key)}
            className="px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer"
            style={{
              background: activePhase === p.key ? '#E9A020' : 'transparent',
              color: activePhase === p.key ? 'white' : '#1E2D3D',
              border: activePhase === p.key ? 'none' : '1px solid #1E2D3D',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Phase content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activePhase === 'setup' && <SetupPhase {...props} />}
        {activePhase === 'writing' && <WritingPhase {...props} />}
        {activePhase === 'edit' && <EditPhase {...props} />}
        {activePhase === 'polish' && <PolishPhase {...props} />}
      </div>
    </div>
  )
}
