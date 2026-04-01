// components/icons/index.tsx
// Custom SVG channel icons for AuthorDash

interface IconProps {
  size?: number
  color?: string
  className?: string
}

export function IconKDP({ size = 24, color = '#E9A020', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="3" width="10" height="14" rx="1.5" stroke={color} strokeWidth="1.8" />
      <rect x="7" y="6" width="10" height="14" rx="1.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.8" />
      <rect x="10" y="9" width="10" height="14" rx="1.5" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.8" />
      <line x1="13" y1="13" x2="17" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="16" x2="16" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconMeta({ size = 24, color = '#38bdf8', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="3,16 7,10 11,14 15,6 21,12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="18" cy="17" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      <text x="18" y="19.5" fontSize="6" fontWeight="bold" fill={color} textAnchor="middle">$</text>
    </svg>
  )
}

export function IconMailerLite({ size = 24, color = '#34d399', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.8" />
      <polyline points="3,5 12,13 21,5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="16" r="3.5" fill={color} />
      <polyline points="16.5,16 17.5,17 19.5,15" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPinterest({ size = 24, color = '#fb7185', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.1" />
      <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="1" opacity="0.3" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1" opacity="0.3" />
      <circle cx="12" cy="10" r="2" fill={color} />
      <line x1="12" y1="12" x2="12" y2="17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconSwaps({ size = 24, color = '#E9A020', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
      <path d="M6 12 L30 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 6 L30 12 L24 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M30 24 L6 24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 18 L6 24 L12 30" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function IconMetrics({ size = 24, color = '#E9A020', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="12" width="4" height="9" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
      <rect x="10" y="8" width="4" height="13" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
      <rect x="17" y="4" width="4" height="17" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
      <polyline points="3,10 10,6 17,3" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconRank({ size = 24, color = '#34d399', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="3,18 8,12 13,14 21,5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,5 21,5 21,9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconROAS({ size = 24, color = '#E9A020', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.1" />
      <text x="12" y="16" fontSize="11" fontWeight="bold" fill={color} textAnchor="middle">$</text>
    </svg>
  )
}

export function IconListBuilding({ size = 24, color = '#34d399', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.8" />
      <circle cx="16" cy="8" r="3" stroke={color} strokeWidth="1.8" />
      <path d="M2,20 C2,16 5,14 8,14 C9.5,14 10.5,14.5 12,14.5 C13.5,14.5 14.5,14 16,14 C19,14 22,16 22,20"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" fill={color} fillOpacity="0.1" />
    </svg>
  )
}

export function IconMyData({ size = 24, color = '#fb7185', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.08" />
      <circle cx="14" cy="16" r="3" fill={color} />
      <polyline points="12.8,16 13.5,16.8 15.2,15.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="10" x2="13" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
