'use client'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function NoBooksEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      style={{
        background: '#F7F1E6',
        border: '0.5px dashed #e0d8d0',
        borderRadius: 12,
      }}
    >
      <BookOpen size={28} style={{ color: '#D97706' }} strokeWidth={1.5} />
      <div className="text-[14px] font-medium" style={{ color: '#1E2D3D' }}>
        Add your books to get started
      </div>
      <div className="text-[13px] max-w-xs" style={{ color: '#9CA3AF' }}>
        Go to Settings to add your first book. Once added, it will appear here automatically.
      </div>
      <Link
        href="/dashboard/settings#my-books"
        className="text-[13px] font-medium hover:underline"
        style={{ color: '#D97706' }}
      >
        + Add a book →
      </Link>
    </div>
  )
}
