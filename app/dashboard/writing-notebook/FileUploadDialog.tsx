'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'

export type ImportTarget =
  | { type: 'storyOutline' }
  | { type: 'characterBible' }
  | { type: 'singleChapter' }
  | { type: 'splitChapters' }

interface Props {
  isOpen: boolean
  onClose: () => void
  onImport: (target: ImportTarget, content: string) => void
}

const CHAPTER_RE = /^#{1,3}\s+Chapter\s+/gim

export function FileUploadDialog({ isOpen, onClose, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedContent, setParsedContent] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<ImportTarget['type']>('storyOutline')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setParsedContent('')
    setParseError('')
    setSelectedTarget('storyOutline')
    setIsParsing(false)
    setIsDragOver(false)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const parseFile = useCallback(async (f: File) => {
    if (f.size > 50 * 1024 * 1024) {
      setParseError('File too large (max 50 MB)')
      return
    }
    setFile(f)
    setIsParsing(true)
    setParseError('')

    try {
      const name = f.name.toLowerCase()
      if (name.endsWith('.txt') || name.endsWith('.md')) {
        const text = await f.text()
        if (!text.trim()) { setParseError('File appears to be empty'); setIsParsing(false); return }
        setParsedContent(text)
      } else if (name.endsWith('.docx')) {
        const arrayBuffer = await f.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        if (!result.value.trim()) { setParseError('No text found in this .docx file'); setIsParsing(false); return }
        setParsedContent(result.value)
      } else {
        setParseError('Unsupported file type. Please use .txt, .md, or .docx')
      }
    } catch {
      setParseError('Could not read this file. Try a different format.')
    }
    setIsParsing(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) parseFile(f)
  }, [parseFile])

  const handleImport = useCallback(() => {
    if (!parsedContent.trim()) return
    onImport({ type: selectedTarget } as ImportTarget, parsedContent)
    handleClose()
  }, [parsedContent, selectedTarget, onImport, handleClose])

  if (!isOpen) return null

  const wordCount = parsedContent.trim().split(/\s+/).filter(Boolean).length
  const chapterMatches = parsedContent.match(CHAPTER_RE)
  const hasChapters = chapterMatches && chapterMatches.length > 1

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
      <div className="w-full max-w-lg mx-4 rounded-xl p-5" style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: '#1E2D3D' }}>Import File</h3>
          <button onClick={handleClose} className="w-6 h-6 rounded flex items-center justify-center border-none cursor-pointer" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            <X size={14} />
          </button>
        </div>

        {/* Drop zone */}
        {!parsedContent && !isParsing && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-lg py-10 cursor-pointer transition-colors"
            style={{
              border: `2px dashed ${isDragOver ? '#E9A020' : '#E5E7EB'}`,
              background: isDragOver ? '#FFF8F0' : '#FAFAF9',
            }}
          >
            <Upload size={28} style={{ color: '#9CA3AF' }} className="mb-2" />
            <p className="text-sm font-medium" style={{ color: '#1E2D3D' }}>Drop a file here or click to browse</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>.docx, .txt, or .md files</p>
            <input
              ref={inputRef}
              type="file"
              accept=".docx,.txt,.md"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) parseFile(f)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {/* Parsing spinner */}
        {isParsing && (
          <div className="flex items-center justify-center py-10">
            <div className="text-sm" style={{ color: '#9CA3AF' }}>Reading file...</div>
          </div>
        )}

        {/* Error */}
        {parseError && (
          <div className="rounded-lg p-3 mt-3" style={{ background: '#FFF8F0', borderLeft: '4px solid #F97B6B' }}>
            <p className="text-xs" style={{ color: '#F97B6B' }}>{parseError}</p>
          </div>
        )}

        {/* Preview + target */}
        {parsedContent && (
          <>
            {/* File info */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <FileText size={14} style={{ color: '#E9A020' }} />
              <span className="text-xs font-medium truncate" style={{ color: '#1E2D3D' }}>{file?.name}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{wordCount.toLocaleString()} words</span>
              {hasChapters && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF8F0', color: '#E9A020' }}>
                  {chapterMatches.length} chapters detected
                </span>
              )}
              <button
                onClick={reset}
                className="ml-auto text-xs bg-transparent border-none cursor-pointer"
                style={{ color: '#9CA3AF' }}
              >
                Change file
              </button>
            </div>

            {/* Preview */}
            <div
              className="rounded-lg p-3 mb-4 text-xs leading-relaxed overflow-y-auto"
              style={{ background: '#FAFAF9', maxHeight: 160, color: '#6B7280', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
            >
              {parsedContent.slice(0, 800)}{parsedContent.length > 800 ? '...' : ''}
            </div>

            {/* Target selector */}
            <p className="text-xs font-semibold mb-2 px-1" style={{ color: '#1E2D3D' }}>Import to:</p>
            <div className="flex flex-col gap-1.5 mb-4">
              {[
                { key: 'storyOutline' as const, label: 'Story Outline', desc: 'Append to your outline' },
                { key: 'characterBible' as const, label: 'Character Bible', desc: 'Append to character notes' },
                { key: 'singleChapter' as const, label: 'New Chapter Draft', desc: 'Import as a single chapter' },
                ...(hasChapters ? [{ key: 'splitChapters' as const, label: `Split into ${chapterMatches.length} Chapters`, desc: 'Auto-split by chapter headings' }] : []),
              ].map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: selectedTarget === opt.key ? '#FFF8F0' : 'transparent',
                    border: selectedTarget === opt.key ? '1.5px solid #E9A020' : '1.5px solid #E5E7EB',
                  }}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={selectedTarget === opt.key}
                    onChange={() => setSelectedTarget(opt.key)}
                    className="accent-amber-500"
                  />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: '#1E2D3D' }}>{opt.label}</div>
                    <div className="text-[11px]" style={{ color: '#9CA3AF' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Import button */}
            <button
              onClick={handleImport}
              className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer"
              style={{ background: '#E9A020', color: '#FFFFFF' }}
            >
              Import
            </button>
          </>
        )}
      </div>
    </div>
  )
}
