// components/icons/index.tsx
// One import source for all icons used in AuthorDash.
// Lucide icons — used throughout sidebar, channel cards, and settings.
export {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Mail,
  Repeat2,
  ArrowLeftRight,
  Pin,
  BarChart2,
  ArrowUpRight,
  DollarSign,
  Users,
  GraduationCap,
  Settings2,
  Database,
  Bot,
  Megaphone,
  LogOut,
  Rocket,
  Palette,
  LayoutGrid,
  Columns,
  PenLine,
  PenTool,
  Lock,
  CreditCard,
  User,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Check,
  Pencil,
  Save,
  Sparkles,
  ArrowRight,
  Square,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'

// Custom SVG icons (kept for legacy use)

interface IconProps {
  size?: number
  color?: string
  className?: string
}

export function IconKDP({ size = 24, color = '#E9A020', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="5" y="14" width="18" height="20" rx="2" fill="#FFF8F0" stroke={color} strokeWidth="1.5" />
      <rect x="9" y="10" width="18" height="20" rx="2" fill="#FFF4E0" stroke={color} strokeWidth="1.5" />
      <rect x="13" y="6" width="18" height="20" rx="2" fill="#FFEBC0" stroke={color} strokeWidth="1.5" />
      <line x1="16" y1="13" x2="28" y2="13" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="16" y1="17" x2="28" y2="17" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="16" y1="21" x2="24" y2="21" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

export function IconMeta({ size = 24, color = '#60A5FA', className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <polyline points="6,30 14,18 20,24 28,12 34,16" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="30" r="2.5" fill={color} />
      <circle cx="14" cy="18" r="2.5" fill={color} />
      <circle cx="20" cy="24" r="2.5" fill={color} />
      <circle cx="28" cy="12" r="2.5" fill={color} />
      <circle cx="34" cy="16" r="2.5" fill={color} />
      <path d="M6,30 L34,16 L34,30 Z" fill={color} opacity="0.08" />
      <circle cx="32" cy="32" r="7" fill={color} />
      <text x="32" y="35.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="sans-serif">$</text>
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

export function IconStar({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className}>
      <polygon points="40,5 55,30 82,30 60,48 69,74 40,57 11,74 20,48 -2,30 25,30" fill="none" stroke="#1E2D3D" strokeWidth="5" strokeLinejoin="round"/>
      <polygon points="40,18 51,38 74,38 56,50 63,70 40,57 17,70 24,50 6,38 29,38" fill="#E9A020" stroke="none"/>
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
