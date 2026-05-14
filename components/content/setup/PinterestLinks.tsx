'use client'

const LINK_TYPES = [
  {
    key: 'bookPage' as const,
    label: 'Book page',
    desc: 'For book-mention pins · Quote cards, ARC reviews, launch posts',
    placeholder: 'https://amazon.com/dp/…',
    readOnly: false,
  },
  {
    key: 'authorCentral' as const,
    label: 'Author Central',
    desc: 'For brand & awareness · Character pins, author voice posts',
    placeholder: 'https://amazon.com/author/…',
    readOnly: false,
  },
  {
    key: 'website' as const,
    label: 'Website',
    desc: 'For mood + atmosphere · World & mood, quote pins, reader avatar',
    placeholder: 'https://yoursite.com',
    readOnly: false,
  },
  {
    key: 'beaconsUrl' as const,
    label: 'Beacons',
    desc: 'Catch-all · Everything else',
    placeholder: 'https://beacons.ai/…',
    readOnly: false,
  },
]

interface LinkValues {
  bookPage: string
  authorCentral: string
  website: string
  beaconsUrl: string
}

interface Props {
  values: LinkValues
  onChange: (key: keyof LinkValues, value: string) => void
  onBlur: (key: keyof LinkValues, value: string) => void
}

export default function PinterestLinks({ values, onChange, onBlur }: Props) {
  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 4,
      padding: '24px 32px',
    }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--ink)',
        margin: '0 0 4px',
      }}>
        Pinterest{' '}
        <em style={{ fontStyle: 'italic', fontWeight: 400 }}>link strategy</em>
      </h3>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
        color: 'var(--ink-4)',
        margin: '0 0 24px',
      }}>
        Every pin is a destination — assigned by post context
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {LINK_TYPES.map(lt => (
          <div key={lt.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
              }}>
                {lt.label}
              </span>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 12,
                color: 'var(--ink-4)',
              }}>
                {lt.desc}
              </span>
            </div>
            <input
              type="url"
              value={values[lt.key]}
              placeholder={lt.placeholder}
              onChange={e => onChange(lt.key, e.target.value)}
              onBlur={e => onBlur(lt.key, e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: 'var(--ink)',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--amber)' }}
              onBlurCapture={e => { e.target.style.borderColor = 'var(--rule)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
