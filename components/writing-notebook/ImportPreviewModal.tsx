'use client'
import { X } from 'lucide-react'
import type { ParsedChapter } from '@/lib/parseManuscript'
import type { ChapterDraftMeta } from '@/app/dashboard/writing-notebook/useWorkbook'

interface Props {
  chapters: ParsedChapter[]
  getChapterDraftMeta: (chapterIndex: number) => ChapterDraftMeta
  existingChapterCount: number
  onConfirm: () => void
  onCancel: () => void
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function ImportPreviewModal({
  chapters, getChapterDraftMeta, existingChapterCount, onConfirm, onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(30,45,61,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="relative flex flex-col"
        style={{
          background: '#FFFFFF',
          border: '0.5px solid #e8e0d8',
          borderRadius: 12,
          maxWidth: 480,
          width: '90vw',
          padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          style={{ color: '#9CA3AF' }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <h3 className="text-[16px] font-medium mb-0.5" style={{ color: '#1E2D3D' }}>
          Import manuscript
        </h3>
        <p className="text-[13px] mb-4" style={{ color: '#9CA3AF' }}>
          {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} detected
        </p>

        {/* Chapter list */}
        <div
          className="flex flex-col gap-2 overflow-y-auto mb-5"
          style={{ maxHeight: 260 }}
        >
          {chapters.map(ch => {
            const idx = ch.chapterNumber - 1
            const isNew = idx >= existingChapterCount
            const existingMeta = !isNew ? getChapterDraftMeta(idx) : null
            const draftLabel = isNew
              ? 'New — Draft 1'
              : `Adding as Draft ${(existingMeta?.draftCount ?? 1) + 1}`
            const wc = wordCount(ch.content)

            return (
              <div
                key={ch.chapterNumber}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: '#FAFAF9', border: '0.5px solid #F0EDE8' }}
              >
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                  style={{ background: '#F97B6B', color: '#FFFFFF' }}
                >
                  Ch {ch.chapterNumber}
                </span>
                <span className="text-[13px] flex-1 truncate min-w-0" style={{ color: '#1E2D3D' }}>
                  {ch.title || 'Untitled'}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 whitespace-nowrap"
                  style={isNew
                    ? { background: '#D6F0E0', color: '#1A6B3A' }
                    : { background: '#FFF3E0', color: '#E9A020' }
                  }
                >
                  {draftLabel}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: '#9CA3AF' }}>
                  {wc.toLocaleString()} w
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#6B7280' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: '#E9A020', color: '#FFFFFF' }}
          >
            Import {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
