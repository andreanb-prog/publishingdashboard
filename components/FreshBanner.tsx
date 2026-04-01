'use client'
// components/FreshBanner.tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export function FreshBanner() {
  const params   = useSearchParams()
  const [mounted, setMounted]  = useState(false)
  const [visible, setVisible]  = useState(false)

  useEffect(() => {
    if (params.get('fresh') !== '1') return
    setMounted(true)
    // Next frame so the opacity transition fires
    const raf = requestAnimationFrame(() => setVisible(true))
    const fade = setTimeout(() => setVisible(false), 4500)
    const hide = setTimeout(() => setMounted(false), 5200)
    return () => { cancelAnimationFrame(raf); clearTimeout(fade); clearTimeout(hide) }
  }, [params])

  if (!mounted) return null

  return (
    <div
      className="mb-5 rounded-xl px-5 py-3.5 flex items-center gap-3"
      style={{
        opacity:    visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
        background: 'rgba(52,211,153,0.1)',
        border:     '1px solid rgba(52,211,153,0.3)',
      }}
    >
      <span className="text-[17px]">✓</span>
      <span className="text-[13px] font-semibold" style={{ color: '#34d399' }}>
        Your coach just reviewed your data. Here&apos;s what it found.
      </span>
    </div>
  )
}
