'use client'
// components/HelpDrawer.tsx — persistent "?" help button + side drawer
import { useState } from 'react'
import { Question, X } from '@phosphor-icons/react'

const HELP_ITEMS = [
  {
    title: 'How to find your KDP report',
    steps: [
      'Go to kdp.amazon.com and sign in',
      'Click "Reports" in the top menu',
      'Select "Month-End Sales Report"',
      'Click "Generate Report" for the latest month',
      'Download the Excel file and upload it here',
    ],
  },
  {
    title: 'How to export Meta ads data',
    steps: [
      'Open Facebook Ads Manager',
      'Set your date range (usually last 30 days)',
      'Click "Export" in the top right',
      'Choose CSV format',
      'Upload the downloaded file here',
    ],
  },
  {
    title: 'What is KENP?',
    steps: [
      'KENP = Kindle Edition Normalized Pages',
      'It\'s how Amazon counts Kindle Unlimited reads',
      'Each page read by a KU subscriber = 1 KENP',
      'You earn roughly $0.0045 per KENP read',
      'More KENP = more KU readers actively in your books',
    ],
  },
]

export function HelpDrawer() {
  const [open, setOpen] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <>
      {/* Floating ? button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 w-10 h-10 rounded-full flex items-center justify-center
                   shadow-lg z-40 border-none cursor-pointer transition-all hover:scale-105"
        style={{ background: 'white', color: '#1E2D3D', border: '1px solid #EEEBE6' }}
        aria-label="Help"
      >
        <Question size={20} weight="bold" />
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div
            className="absolute top-0 right-0 bottom-0 w-[340px] overflow-y-auto shadow-2xl"
            style={{ background: '#FFFFFF' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #EEEBE6' }}>
              <h3 className="text-[16px] font-semibold" style={{ color: '#1E2D3D' }}>Help</h3>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer"
                style={{ color: '#6B7280' }}>
                <X size={18} />
              </button>
            </div>

            {/* Help items */}
            <div className="p-4 space-y-2">
              {HELP_ITEMS.map((item, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left bg-transparent border-none cursor-pointer"
                  >
                    <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>{item.title}</span>
                    <span className="text-[12px]" style={{ color: '#9CA3AF', transform: expandedIdx === i ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  {expandedIdx === i && (
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid #EEEBE6' }}>
                      <div className="space-y-2 mt-3">
                        {item.steps.map((step, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                              style={{ background: 'rgba(233,160,32,0.12)', color: '#e9a020' }}>{j + 1}</span>
                            <span className="text-[12.5px]" style={{ color: '#374151' }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Something not working */}
              <div className="rounded-xl px-4 py-3 mt-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="text-[13px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>Something not working?</div>
                <p className="text-[12px]" style={{ color: '#6B7280' }}>
                  Use the feedback button at the bottom right of any page to let us know. We read every message.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
