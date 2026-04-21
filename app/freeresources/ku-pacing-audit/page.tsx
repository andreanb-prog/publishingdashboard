import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KU Pacing Audit · AuthorDash',
  description: 'Pick your genre, pick your mode. Copy and paste into any AI.',
}

export default function KUPacingAuditPage() {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <iframe
        src="/ku-pacing-audit.html"
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
        title="KU Pacing Audit"
      />
    </div>
  )
}
