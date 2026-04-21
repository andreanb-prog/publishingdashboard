'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'block', width: '100%', textAlign: 'center',
        background: '#fff', color: '#1E2D3D',
        border: '1.5px solid rgba(30,45,61,0.2)', borderRadius: 8,
        padding: 14, fontSize: 14, fontWeight: 700, marginBottom: 8,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'border-color 0.15s',
      }}
    >
      {copied ? '✓ Copied' : 'Copy prompt'}
    </button>
  )
}
