export default function ReviewsPage({ params }: { params: { projectId: string } }) {
  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 12,
      }}>
        STEP 03 · REVIEW BANK
      </div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--ink)',
        lineHeight: 1.15,
        letterSpacing: '-0.02em',
        margin: '0 0 16px',
      }}>
        The words <em style={{ fontStyle: 'italic', fontWeight: 400 }}>readers left behind.</em>
      </h1>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        color: 'var(--ink-4)',
        fontStyle: 'italic',
        lineHeight: 1.6,
        margin: 0,
      }}>
        Coming in Session 4.
      </p>
    </div>
  )
}
