'use client'
// components/dashboard/DashboardBanners.tsx
import Link from 'next/link'
import type { DashboardState } from './useDashboardData'

export function DashboardBanners({ dashboard }: { dashboard: DashboardState }) {
  const { generating, metaErrorBanner, setMetaErrorBanner, isKdpStale } = dashboard
  return (
    <>
      {metaErrorBanner && (
        <div className="mb-4 rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M8 2L14.5 13H1.5L8 2Z" stroke="#E9A020" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 6.5V9.5" stroke="#E9A020" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11.5" r="0.75" fill="#E9A020" /></svg>
          <p className="flex-1 text-[13px]" style={{ color: '#92610a', margin: 0 }}>Facebook hit a snag — skip it for now and come back later. Everything else works great!{' '}<a href="/dashboard/settings" className="font-semibold underline" style={{ color: '#E9A020' }}>Try again from Settings →</a></p>
          <button onClick={() => setMetaErrorBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B07E1A', fontSize: 18, lineHeight: 1, padding: '0 2px' }} aria-label="Dismiss">×</button>
        </div>
      )}
      {generating && (
        <div className="mb-4 rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#E9A020' }}><circle cx="8" cy="8" r="6.5" stroke="#F0EDEA" strokeWidth="1.8" /><path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <span className="text-[13px]" style={{ color: '#92400E' }}><strong>Generating your coaching session</strong> — your numbers are showing below. Insights will appear shortly.</span>
        </div>
      )}
      {isKdpStale && (
        <div className="mb-4 rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: 'rgba(233,160,32,0.1)', border: '1px solid rgba(233,160,32,0.3)' }}>
          <span className="text-[16px]">⚠️</span>
          <span className="text-[13px] font-semibold" style={{ color: '#D97706' }}>Data may be outdated —{' '}<Link href="/dashboard?upload=1" className="underline hover:no-underline" style={{ color: '#E9A020' }}>upload your latest KDP report</Link></span>
        </div>
      )}
    </>
  )
}
