interface BoutiqueCardProps {
  children: React.ReactNode
  accentLeft?: boolean
  className?: string
  style?: React.CSSProperties
  as?: 'div' | 'section' | 'article'
}

export function BoutiqueCard({
  children,
  accentLeft = false,
  className = '',
  style,
  as: Tag = 'div',
}: BoutiqueCardProps) {
  return (
    <Tag
      className={className}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E1D3',
        borderRadius: 0,
        borderLeft: accentLeft ? '3px solid #D97706' : '1px solid #E8E1D3',
        boxShadow: 'none',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
