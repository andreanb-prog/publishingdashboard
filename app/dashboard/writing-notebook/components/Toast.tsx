'use client'
import { useEffect, useState } from 'react'

interface Props {
  message: string
  dotColor?: string
  visible: boolean
  onDone: () => void
}

export function Toast({ message, dotColor = '#8B5CF6', visible, onDone }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(onDone, 300) // wait for fade-out
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onDone])

  if (!visible && !show) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg z-50 transition-opacity duration-300"
      style={{
        background: '#1E2D3D',
        color: '#FFFFFF',
        opacity: show ? 1 : 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
      <span className="text-[13px] font-medium">{message}</span>
    </div>
  )
}
