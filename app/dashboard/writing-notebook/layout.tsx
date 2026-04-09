'use client'

export default function WritingNotebookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#FFFFFF' }}
    >
      {children}
    </div>
  )
}
