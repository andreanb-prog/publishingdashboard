// components/FormatBadge.tsx
import { BookOpen, BookMarked, Book, Headphones, Globe } from 'lucide-react'

const FORMAT_CONFIG: Record<string, { label: string; Icon: React.ElementType }> = {
  ebook:       { label: 'Ebook',       Icon: BookOpen },
  paperback:   { label: 'Paperback',   Icon: BookMarked },
  hardcover:   { label: 'Hardcover',   Icon: Book },
  audiobook:   { label: 'Audiobook',   Icon: Headphones },
  translation: { label: 'Translation', Icon: Globe },
}

export function FormatBadge({ format }: { format: string }) {
  const config = FORMAT_CONFIG[format.toLowerCase()]
  if (!config) return null
  const { label, Icon } = config
  return (
    <span
      className="inline-flex items-center gap-1 shrink-0"
      style={{
        background: '#FFF8F0',
        border: '0.5px solid rgba(30,45,61,0.12)',
        color: '#1E2D3D',
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 10,
        fontWeight: 500,
        lineHeight: 1.4,
      }}
    >
      <Icon size={10} strokeWidth={1.75} />
      {label}
    </span>
  )
}
