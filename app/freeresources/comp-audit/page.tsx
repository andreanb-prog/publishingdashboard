import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chapter Comp Audit · AuthorDash',
  description: 'Paste your Chapter 1 alongside your comp authors. Get a scored matrix showing exactly where your craft dimensions align — and where they don\'t.',
}

export default function CompAuditPage() {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <iframe
        src="/comp-audit.html"
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
        title="Chapter Comp Audit"
      />
    </div>
  )
}
