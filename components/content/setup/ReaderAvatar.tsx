'use client'

interface Props {
  avatar: string
  aesthetic: string
  onAvatarChange: (v: string) => void
  onAestheticChange: (v: string) => void
  onBlur: (field: 'avatar' | 'aesthetic', value: string) => void
}

export default function ReaderAvatar({ avatar, aesthetic, onAvatarChange, onAestheticChange, onBlur }: Props) {
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
        margin: '0 0 20px',
      }}>
        <em style={{ fontStyle: 'italic', fontWeight: 400 }}>Your</em> reader
      </h3>

      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          Who she is, what she reads for
        </label>
        <textarea
          value={avatar}
          placeholder="She's 28–45, reads romance as her escape. She loves slow-burn tension, possessive heroes, and emotionally devastating moments she doesn't see coming."
          onChange={e => onAvatarChange(e.target.value)}
          onBlur={e => onBlur('avatar', e.target.value)}
          rows={5}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'var(--ink)',
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 4,
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.6,
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--amber)' }}
          onBlurCapture={e => { e.target.style.borderColor = 'var(--rule)' }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          Brand aesthetic keywords
        </label>
        <input
          type="text"
          value={aesthetic}
          placeholder="warm golden light, vineyard, farmhouse, intimate, cozy"
          onChange={e => onAestheticChange(e.target.value)}
          onBlur={e => onBlur('aesthetic', e.target.value)}
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
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: 12,
          color: 'var(--ink-4)',
          margin: '8px 0 0',
          lineHeight: 1.5,
        }}>
          Keywords that describe your visual world — used in image direction for every post
        </p>
      </div>
    </div>
  )
}
