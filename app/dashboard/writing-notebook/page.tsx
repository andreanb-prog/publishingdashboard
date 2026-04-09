'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the standalone writing notebook — the Google Docs layout lives at /writing-notebook
export default function WritingNotebookRedirect() {
  const router = useRouter()

  useEffect(() => {
    const bookId = typeof window !== 'undefined'
      ? localStorage.getItem('wn_selected_book')
      : null
    router.replace(bookId ? `/writing-notebook?bookId=${bookId}` : '/writing-notebook')
  }, [router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
    </div>
  )
}
