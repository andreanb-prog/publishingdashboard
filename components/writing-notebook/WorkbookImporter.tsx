'use client'
// components/writing-notebook/WorkbookImporter.tsx
import { useState, useRef, useCallback } from 'react'
import { UploadCloud, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type ImportState = 'collapsed' | 'expanded' | 'loading' | 'success' | 'error'
type FilledResult = { storyOutline: boolean; characterBible: boolean; styleGuide: boolean }

interface Props {
  bookId: string
  onImportComplete: () => void
  onSwitchToOutline: () => void
}

export function WorkbookImporter({ bookId, onImportComplete, onSwitchToOutline }: Props) {
  const [state, setState] = useState<ImportState>('collapsed')
  const [file, setFile] = useState<File | null>(null)
  const [filled, setFilled] = useState<FilledResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [step, setStep] = useState(0) // 0=idle, 1=parsing, 2=extracting, 3=saving
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((f: File | null) => {
    if (f && !f.name.endsWith('.docx')) {
      setErrorMsg('Please upload a .docx file.')
      setState('error')
      return
    }
    setFile(f)
    setErrorMsg('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFileChange(f)
  }, [handleFileChange])

  const handleImport = useCallback(async () => {
    if (!file || !bookId) return
    setState('loading')
    setStep(1)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bookId', bookId)

      setStep(2)
      const res = await fetch('/api/writing-notebook/import', {
        method: 'POST',
        body: formData,
      })

      setStep(3)
      const data = await res.json()

      if (!res.ok) {
        const messages: Record<string, string> = {
          invalid_file: 'Please upload a .docx file.',
          parse_failed: 'Could not read that file. Make sure it\'s a valid .docx.',
          extraction_failed: 'AI extraction failed. Please try again.',
        }
        setErrorMsg(messages[data.error] ?? 'Something went wrong. Try again.')
        setState('error')
        return
      }

      setFilled(data.filled)
      setState('success')
      onImportComplete()

      // Auto-collapse after 4 seconds
      setTimeout(() => {
        setState('collapsed')
        setFile(null)
        setFilled(null)
      }, 4000)
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }, [file, bookId, onImportComplete])

  // Collapsed state — amber pill
  if (state === 'collapsed') {
    return (
      <button
        onClick={() => setState('expanded')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:bg-amber-50 mb-3"
        style={{ border: '1.5px solid #E9A020', color: '#E9A020' }}
      >
        <UploadCloud size={14} />
        Import existing workbook
      </button>
    )
  }

  // Success state
  if (state === 'success' && filled) {
    return (
      <div
        className="rounded-lg p-6 mb-3 text-center"
        style={{ background: '#FFF8F0', border: '1.5px dashed #6EBF8B' }}
      >
        <CheckCircle size={24} style={{ color: '#6EBF8B' }} className="mx-auto mb-2" />
        <p className="text-sm font-medium" style={{ color: '#1E2D3D' }}>Workbook imported successfully</p>
        <div className="mt-2 space-y-0.5 text-[13px]" style={{ color: '#6B7280' }}>
          {filled.storyOutline && <p>&#10003; Story outline added</p>}
          {filled.characterBible && <p>&#10003; Character bible added</p>}
          {filled.styleGuide && <p>&#10003; Style guide filled in</p>}
        </div>
        <button
          onClick={onSwitchToOutline}
          className="mt-3 text-sm font-medium hover:underline"
          style={{ color: '#E9A020' }}
        >
          View your outline &rarr;
        </button>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div
        className="rounded-lg p-6 mb-3 text-center"
        style={{ background: '#FFF8F0', border: '1.5px dashed #F97B6B' }}
      >
        <XCircle size={24} style={{ color: '#F97B6B' }} className="mx-auto mb-2" />
        <p className="text-sm" style={{ color: '#1E2D3D' }}>
          {errorMsg || 'Something went wrong. Make sure it\'s a .docx file and try again.'}
        </p>
        <button
          onClick={() => { setState('expanded'); setFile(null); setErrorMsg('') }}
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{ border: '1.5px solid #E9A020', color: '#E9A020' }}
        >
          Try again
        </button>
      </div>
    )
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div
        className="rounded-lg p-6 mb-3 text-center"
        style={{ background: '#FFF8F0', border: '1.5px dashed #E9A020' }}
      >
        <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: '#E9A020' }} />
        <p className="text-sm" style={{ color: '#6B7280' }}>Reading your workbook...</p>
        <div className="mt-2 space-y-0.5 text-[13px]" style={{ color: '#9CA3AF' }}>
          <p>{step >= 1 ? '\u2713' : '\u25CB'} Parsing document...</p>
          <p>{step >= 2 ? '\u2713' : '\u25CB'} Extracting content...</p>
          <p>{step >= 3 ? '\u2713' : '\u21BB'} Saving to your notebook...</p>
        </div>
      </div>
    )
  }

  // Expanded state — upload zone
  return (
    <div
      className="rounded-lg p-6 mb-3 text-center cursor-pointer"
      style={{ background: '#FFF8F0', border: '1.5px dashed #E9A020' }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Hidden file input — always in DOM */}
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />

      <UploadCloud size={32} style={{ color: '#E9A020' }} className="mx-auto mb-2" />
      <p className="text-sm font-medium" style={{ color: '#1E2D3D' }}>Import your FPA Writing Workbook</p>
      <p className="text-[13px] mt-1" style={{ color: '#9CA3AF' }}>
        Upload your .docx workbook and we&apos;ll fill in your outline, characters, and style guide automatically.
      </p>

      {file && (
        <div className="mt-3">
          <p className="text-[13px]" style={{ color: '#6B7280' }}>
            {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); handleImport() }}
            className="mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#E9A020', color: '#FFFFFF' }}
          >
            Import Workbook
          </button>
        </div>
      )}

      {!file && (
        <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>
          Click or drag a .docx file here
        </p>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); setState('collapsed'); setFile(null) }}
        className="mt-2 text-xs hover:underline"
        style={{ color: '#9CA3AF' }}
      >
        Cancel
      </button>
    </div>
  )
}
