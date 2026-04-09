'use client'
import { useRef, useEffect, useCallback } from 'react'
import { Bold, Italic, Underline, Heading1, Heading2, Quote, List, Undo, Redo } from 'lucide-react'
import type { SidebarSection } from './WritingSidebar'

const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA', '#F472B6']

interface Props {
  section: SidebarSection
  chapterIndex: number | null
  chapterTitle: string
  chapterStatus: string
  content: string
  onContentChange: (content: string) => void
  onTitleChange: (title: string) => void
  onWordCountChange: (count: number) => void
  sectionLabel: string
  sectionPlaceholder: string
}

function ToolButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="w-8 h-8 rounded flex items-center justify-center bg-transparent border-none cursor-pointer transition-colors"
      style={{ color: '#6B7280' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F4')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <Icon size={15} />
    </button>
  )
}

export function WritingEditor({
  section, chapterIndex, chapterTitle, chapterStatus, content,
  onContentChange, onTitleChange, onWordCountChange, sectionLabel, sectionPlaceholder,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isChapter = typeof section === 'object' && 'type' in section && section.type === 'chapter'

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { autoResize() }, [content, autoResize])

  // Word count
  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    onWordCountChange(words)
  }, [content, onWordCountChange])

  // Formatting helpers — wrap selected text in textarea
  const wrapSelection = (before: string, after: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = el.value
    const selected = text.substring(start, end)
    const newText = text.substring(0, start) + before + selected + after + text.substring(end)
    onContentChange(newText)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    Draft: { bg: '#FFF3DC', text: '#633806' },
    Done:  { bg: '#D6F0E0', text: '#1A6B3A' },
    Empty: { bg: '#F5F5F4', text: '#9CA3AF' },
  }
  const sc = statusColors[chapterStatus] || statusColors.Empty

  return (
    <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: '#FFFFFF' }}>
      {/* Formatting toolbar */}
      <div className="flex items-center gap-0.5 px-5 py-1.5 flex-shrink-0" style={{ borderBottom: '0.5px solid #EEEBE6' }}>
        <ToolButton icon={Bold} label="Bold" onClick={() => wrapSelection('**', '**')} />
        <ToolButton icon={Italic} label="Italic" onClick={() => wrapSelection('*', '*')} />
        <ToolButton icon={Underline} label="Underline" onClick={() => wrapSelection('<u>', '</u>')} />
        <span className="w-px h-5 mx-1" style={{ background: '#EEEBE6' }} />
        <ToolButton icon={Heading1} label="Heading 1" onClick={() => wrapSelection('# ', '')} />
        <ToolButton icon={Heading2} label="Heading 2" onClick={() => wrapSelection('## ', '')} />
        <ToolButton icon={Quote} label="Blockquote" onClick={() => wrapSelection('> ', '')} />
        <ToolButton icon={List} label="List" onClick={() => wrapSelection('- ', '')} />
        <span className="w-px h-5 mx-1" style={{ background: '#EEEBE6' }} />
        <ToolButton icon={Undo} label="Undo" onClick={() => document.execCommand('undo')} />
        <ToolButton icon={Redo} label="Redo" onClick={() => document.execCommand('redo')} />
      </div>

      {/* Editor content */}
      <div className="flex-1 px-8 py-6 max-w-[720px] mx-auto w-full">
        {/* Chapter pills */}
        {isChapter && chapterIndex != null && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full text-white"
              style={{ background: BOOK_COLORS[chapterIndex % BOOK_COLORS.length] }}
            >
              Ch {chapterIndex + 1}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: sc.bg, color: sc.text }}
            >
              {chapterStatus}
            </span>
          </div>
        )}

        {/* Editable title */}
        {isChapter ? (
          <input
            value={chapterTitle}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="Chapter title..."
            className="w-full text-[24px] font-medium border-none outline-none mb-4 bg-transparent"
            style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        ) : (
          <h2 className="text-[20px] font-medium mb-4" style={{ color: '#1E2D3D' }}>
            {sectionLabel}
          </h2>
        )}

        {/* Prose textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => {
            onContentChange(e.target.value)
            autoResize()
          }}
          placeholder={sectionPlaceholder}
          className="w-full border-none outline-none resize-none"
          style={{
            fontSize: 15,
            lineHeight: 1.95,
            color: '#1E2D3D',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            minHeight: 400,
          }}
        />
      </div>
    </div>
  )
}
