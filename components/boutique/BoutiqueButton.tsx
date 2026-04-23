'use client'

interface BoutiqueButtonProps {
  variant?: 'primary' | 'amber' | 'ghost'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  style?: React.CSSProperties
}

export function BoutiqueButton({
  variant = 'primary',
  children,
  onClick,
  disabled,
  type = 'button',
  className = '',
  style,
}: BoutiqueButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 2,
    padding: '8px 16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 0.15s ease',
    letterSpacing: '0.01em',
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: '#1E2D3D',
      color: '#FFFFFF',
      border: 'none',
    },
    amber: {
      background: '#D97706',
      color: '#FFFFFF',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: '#1E2D3D',
      border: '1px solid #E8E1D3',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...variantStyles[variant], ...style }}
    >
      {children}
    </button>
  )
}
