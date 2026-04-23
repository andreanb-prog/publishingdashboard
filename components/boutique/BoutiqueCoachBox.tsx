'use client'

function boldNumbers(text: string): string {
  return text.replace(
    /(\$[\d,.]+|\d[\d,.]*%|\d[\d,.]+)/g,
    '<strong style="color:#1E2D3D;font-weight:700">$1</strong>',
  )
}

function parseInsightSections(text: string): { label: string; text: string }[] | null {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim())
  if (sentences.length < 2) return null

  if (sentences.length === 2) {
    return [
      { label: "What's happening", text: sentences[0] },
      { label: 'What to do next', text: sentences[1] },
    ]
  }

  const mid = sentences.slice(1, -1).join(' ')
  return [
    { label: "What's happening", text: sentences[0] },
    { label: 'Why it matters', text: mid },
    { label: 'What to do next', text: sentences[sentences.length - 1] },
  ]
}

interface BoutiqueCoachBoxProps {
  children: React.ReactNode
  color?: string
  title?: string
}

export function BoutiqueCoachBox({ children }: BoutiqueCoachBoxProps) {
  const content = typeof children === 'string' ? children : null
  const sections = content ? parseInsightSections(content) : null

  return (
    <div style={{
      borderLeft: '3px solid #D97706',
      paddingLeft: 16,
      marginBottom: 24,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: '#D97706',
        marginBottom: 10,
      }}>
        What This Means For You
      </div>

      {sections ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map((s, i) => (
            <div key={i}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#D97706',
                marginBottom: 4,
              }}>
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: '#1E2D3D',
                }}
                dangerouslySetInnerHTML={{ __html: boldNumbers(s.text) }}
              />
            </div>
          ))}
        </div>
      ) : content ? (
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            lineHeight: 1.65,
            color: '#1E2D3D',
          }}
          dangerouslySetInnerHTML={{ __html: boldNumbers(content) }}
        />
      ) : (
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          lineHeight: 1.65,
          color: '#1E2D3D',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
