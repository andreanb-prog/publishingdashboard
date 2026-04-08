'use client'
// components/writing-notebook/MobileBottomBar.tsx
import { BookOpen, FileText, Sparkles } from 'lucide-react'

type Tab = 'notebook' | 'chapters' | 'chat'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'notebook', label: 'Notebook', Icon: BookOpen },
  { id: 'chapters', label: 'Chapters', Icon: FileText },
  { id: 'chat', label: 'AI Chat', Icon: Sparkles },
]

export function MobileBottomBar({ activeTab, onTabChange }: Props) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-around md:hidden z-40"
      style={{ background: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center gap-0.5 py-1 px-4"
          >
            <Icon size={20} style={{ color: isActive ? '#E9A020' : '#9CA3AF' }} />
            <span
              className="text-[11px] font-medium"
              style={{ color: isActive ? '#E9A020' : '#9CA3AF' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
