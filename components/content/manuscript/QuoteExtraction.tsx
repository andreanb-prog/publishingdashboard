'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = [
  'Reading your manuscript…',
  'Finding the lines that ache…',
  'Surfacing the ones worth keeping…',
  'Almost there…',
]

interface Props {
  projectId: string
  manuscriptExcerpt: string
  onComplete: (quotes: { id: string; text: string; selected: boolean }[]) => void
  onError: () => void
}

export default function QuoteExtraction({ projectId, manuscriptExcerpt, onComplete, onError }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    let p = 0
    const tick = setInterval(() => {
      p = Math.min(p + 2, 88)
      setProgress(p)
      setStepIdx(Math.floor((p / 88) * (STEPS.length - 1)))
    }, 400)

    const run = async () => {
      try {
        const res = await fetch(`/api/content/projects/${projectId}/quotes/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manuscriptExcerpt }),
        })

        clearInterval(tick)

        if (!res.ok) throw new Error('extraction failed')

        const data = await res.json()
        setProgress(100)
        setStepIdx(STEPS.length - 1)

        setTimeout(() => onComplete(data?.quotes ?? []), 400)
      } catch {
        clearInterval(tick)
        onError()
      }
    }

    run()

    return () => clearInterval(tick)
  }, [projectId, manuscriptExcerpt, onComplete, onError])

  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        color: 'var(--ink-3)',
        fontStyle: 'italic',
        marginBottom: 20,
      }}>
        {STEPS[stepIdx]}
      </div>

      <div style={{
        height: 3,
        background: 'var(--rule)',
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: 480,
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--amber)',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: 10,
      }}>
        {progress < 100 ? `${progress}%` : 'DONE'}
      </div>
    </div>
  )
}
