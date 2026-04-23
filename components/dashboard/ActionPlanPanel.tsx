'use client'
// components/dashboard/ActionPlanPanel.tsx
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'dompurify'
import { BoutiqueSectionLabel } from '@/components/boutique'
import { ActionItem } from '@/components/ui'
import { SortablePage } from '@/components/SortablePage'
import { BoutiqueChannelCardsRow } from './HeroPanel'
import type { CoachingInsight, CrossChannelPlan, Analysis } from '@/types'
import type { DashboardState } from './useDashboardData'
import { fmtCurrency } from '@/lib/utils'

function SafeMarkdown({ content }: { content: string }) {
  const safe = typeof window !== 'undefined' ? DOMPurify.sanitize(content) : content
  return <ReactMarkdown>{safe}</ReactMarkdown>
}

function fmt(n: number | undefined) {
  if (n == null) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function Trend({ curr, prev }: { curr?: number; prev?: number }) {
  if (curr == null || prev == null || prev === 0) return <span className="text-stone-500">—</span>
  const pct = ((curr - prev) / prev) * 100
  const up  = pct >= 0
  return (
    <span className={`text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export function ActionPlanPanel({ dashboard }: { dashboard: DashboardState }) {
  const { analysis, analyses, liveML, loading, coachTitle, storyMode, toggleStoryMode } = dashboard

  return (
    <>
      {/* ── Channel cards + action plan (sortable) ── */}
      <SortablePage
        page="overview"
        theme="light"
        sections={[
          {
            id: 'channel-cards',
            content: (
              <div>
                <div className="mb-1 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-sans text-[18px] text-[#0d1f35] mb-1">Your channels — click any for the full deep dive</h2>
                    <p className="text-[12px] text-stone-500 mb-4">Each channel has a detailed analysis with your coach&apos;s recommendations</p>
                  </div>
                  <button
                    onClick={toggleStoryMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-all flex-shrink-0 mt-0.5"
                    style={{ background: storyMode ? '#E9A020' : '#F5F5F4', color: storyMode ? 'white' : '#6B7280', border: storyMode ? '1px solid #E9A020' : '1px solid #E5E7EB' }}
                  >
                    📖 Story
                  </button>
                </div>
                <BoutiqueChannelCardsRow analysis={analysis} liveML={liveML} analyses={analyses} />
              </div>
            ),
          },
          {
            id: 'action-plan',
            content: (
              <div>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-sans text-[18px] text-[#0d1f35]">Your action plan — do these in order</h2>
                  <span className="text-[12px] text-stone-500">Based on your real data</span>
                </div>
                {loading ? (
                  <div className="card p-8 text-center">
                    <div className="text-[14px] font-sans text-[#0d1f35] animate-pulse">{coachTitle.replace(' says', '')} is reading everything…</div>
                  </div>
                ) : !analysis?.actionPlan?.length ? (
                  <div className="card p-8 text-center">
                    <div className="mb-3 flex justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#1E2D3D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="font-sans text-lg text-[#0d1f35] mb-2">Upload your files to get your coaching session</div>
                    <p className="text-sm text-stone-500 mb-4">Drop your KDP report, Meta export, and Pinterest CSV to get a personalized action plan.</p>
                    <Link href="/dashboard?upload=1" className="btn-primary no-underline inline-block">Upload Files →</Link>
                  </div>
                ) : (
                  <div className="card overflow-hidden mb-7">
                    <div className="px-5 py-3.5" style={{ background: '#FFF8F0', borderBottom: '1px solid #EEEBE6' }}>
                      <div className="font-sans text-[16px]" style={{ color: '#1E2D3D' }}>{coachTitle.replace(' says', '')} reviewed everything. Here&apos;s what to do next.</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>Ranked by priority · Based on your real numbers</div>
                    </div>
                    <div>
                      {(analysis.actionPlan as CoachingInsight[]).map((item: CoachingInsight, i: number) => (
                        <ActionItem key={i} priority={item.priority} type={item.type} title={item.title} body={item.body} action={item.action} />
                      ))}
                      {analysis.confidenceNote && (
                        <div className="mt-4 px-4 py-2.5 rounded-lg text-[12px]" style={{ background: '#F5F5F4', color: '#6B7280' }}>
                          {analysis.confidenceNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* ── Cross-Channel Action Plan ── */}
      <div className="mb-7">
        <BoutiqueSectionLabel
          label="Cross-Channel Action Plan"
          action={<span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)' }}>AI-generated from your data</span>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--line, #d8cfbd)', background: 'var(--paper, #f7f1e5)' }}>
          {[
            { key: 'scale', label: 'Scale',     color: 'var(--green-text, #245c3f)',  borderColor: 'var(--sage, #6EBF8B)', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.scale },
            { key: 'fix',   label: 'Fix',       color: 'var(--amber-text, #a56b13)', borderColor: 'var(--amber, #E9A020)', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.fix },
            { key: 'cut',   label: 'Cut',       color: '#dc2626',                     borderColor: '#dc2626', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.cut },
            { key: 'test',  label: 'Test Next', color: 'var(--ink3, #564e46)',        borderColor: 'var(--ink3, #564e46)', items: (analysis?.crossChannelPlan as CrossChannelPlan | undefined)?.test },
          ].map((col, colIdx) => (
            <div key={col.key} style={{ borderLeft: colIdx > 0 ? '1px solid var(--line, #d8cfbd)' : 'none', borderTop: `2px solid ${col.borderColor}` }}>
              <div style={{ padding: '12px 16px 10px', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: col.color, borderBottom: '1px solid var(--line, #d8cfbd)' }}>
                {col.label}
              </div>
              <div style={{ padding: '0 16px' }}>
                {col.items?.length ? (
                  col.items.map((item: string, i: number) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: i < col.items!.length - 1 ? '1px solid var(--line, #d8cfbd)' : 'none', fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink2, #2a2520)' }}>
                      <SafeMarkdown content={item} />
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '14px 0', fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink4, #8a8076)' }}>Upload data to unlock</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── History table (2+ months) ── */}
      {analyses.length >= 2 && (
        <>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-sans text-[18px] text-[#0d1f35]">How you&apos;re tracking over time</h2>
            <span className="text-[12px] text-stone-500">Last {analyses.length} months</span>
          </div>
          <div className="card overflow-hidden mb-7">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ background: '#FFF8F0', borderBottom: '1px solid #EEEBE6' }}>
                  {['Month', 'Royalties', 'Units', 'KENP', 'Ad Spend', 'Subscribers'].map((h, i) => (
                    <th key={h} className={`py-3 font-semibold ${i === 0 ? 'text-left px-5' : 'text-right px-4'}`} style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyses.map((a: Analysis, i: number) => {
                  const prev = analyses[i + 1]
                  const label = new Date(a.month + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  const isCurrent = i === 0
                  return (
                    <tr key={a.month} className="border-t border-stone-100" style={{ background: isCurrent ? 'rgba(233,160,32,0.04)' : undefined }}>
                      <td className="px-5 py-3.5 font-semibold text-[#0d1f35]">
                        {label}
                        {isCurrent && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(233,160,32,0.15)', color: '#e9a020' }}>Latest</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{a.kdp ? fmtCurrency(a.kdp.totalRoyaltiesUSD) : '—'}</div>
                        {isCurrent && <Trend curr={a.kdp?.totalRoyaltiesUSD} prev={prev?.kdp?.totalRoyaltiesUSD} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.kdp?.totalUnits)}</div>
                        {isCurrent && <Trend curr={a.kdp?.totalUnits} prev={prev?.kdp?.totalUnits} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.kdp?.totalKENP)}</div>
                        {isCurrent && <Trend curr={a.kdp?.totalKENP} prev={prev?.kdp?.totalKENP} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{a.meta ? fmtCurrency(a.meta.totalSpend) : '—'}</div>
                        {isCurrent && <Trend curr={a.meta?.totalSpend} prev={prev?.meta?.totalSpend} />}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-semibold text-[#0d1f35]">{fmt(a.mailerLite?.listSize)}</div>
                        {isCurrent && <Trend curr={a.mailerLite?.listSize} prev={prev?.mailerLite?.listSize} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
