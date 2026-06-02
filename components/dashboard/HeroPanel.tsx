'use client'
// components/dashboard/HeroPanel.tsx
import Link from 'next/link'
import { fmtPct, fmtCurrency } from '@/lib/utils'
import type { DashboardState } from './useDashboardData'

function buildStorySentence(analysis: any, kdpTotals: { totalUnits: number; totalRoyalties: number; totalKENP: number; estRevenue?: number }): string | null {
  if (!analysis) return null
  if (analysis.storySentence) return analysis.storySentence
  const meta = analysis.meta
  const units = kdpTotals.totalUnits || undefined
  const kenp  = kdpTotals.totalKENP  || undefined
  const royalties = kdpTotals.totalRoyalties
  const estRevenue = (units || kenp) ? Math.round((kdpTotals.estRevenue ?? (royalties + (kenp ?? 0) * 0.0045)) * 100) / 100 : null
  const ctr:   number | undefined = meta?.bestAd?.ctr ?? meta?.avgCTR
  const spend: number | undefined = meta?.totalSpend
  if (units && kenp) {
    if (kenp > units * 20) return `${units.toLocaleString()} readers chose your books — and kept reading for ${kenp.toLocaleString()} pages.`
    if (units >= 50) return `${units.toLocaleString()} readers and ${kenp.toLocaleString()} pages read — your books are pulling people in and keeping them there.`
    return `${units.toLocaleString()} readers showed up this month, reading ${kenp.toLocaleString()} pages between them.`
  }
  if (units && estRevenue != null) return `${units.toLocaleString()} readers, ${fmtCurrency(estRevenue)} earned — your books are working.`
  if (units) return `${units.toLocaleString()} readers chose your books this month — keep that momentum going.`
  if (ctr != null && spend) return `${fmtCurrency(spend)} spent, ${ctr}% of people clicked — your ads are cutting through the noise.`
  return null
}

function BoutiqueDeltaChip({ curr, prev }: { curr?: number | null; prev?: number | null }) {
  if (curr == null || prev == null || prev === 0) return null
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const flat = Math.abs(pct) < 2
  const up = pct > 0
  return (
    <div style={{
      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
      fontSize: 10, letterSpacing: '0.08em',
      color: flat ? 'var(--ink4, #8a8076)' : up ? 'var(--green-text, #245c3f)' : '#dc2626',
      marginTop: 4,
    }}>
      {flat ? '— flat' : up ? `▲ ${pct.toFixed(1)}%` : `▼ ${Math.abs(pct).toFixed(1)}%`}
    </div>
  )
}

export function BoutiqueChannelCardsRow({
  analysis, liveML, analyses, kdpTotals,
}: {
  analysis: any
  liveML: import('@/types').MailerLiteData | null
  analyses: any[]
  kdpTotals: { totalUnits: number; totalRoyalties: number; totalKENP: number; estRevenue?: number }
}) {
  const prev = analyses[1] ?? null
  const kdpVal     = kdpTotals.totalRoyalties > 0 || kdpTotals.totalUnits > 0 ? kdpTotals.totalRoyalties : null
  const prevKdpVal = prev?.kdp?.totalRoyaltiesUSD ?? null
  const metaSpend    = analysis?.meta?.totalSpend ?? 0
  const totalRev     = kdpTotals.estRevenue ?? (kdpTotals.totalRoyalties + kdpTotals.totalKENP * 0.0045)
  const metaRoas     = metaSpend > 0 ? totalRev / metaSpend : null
  const prevMetaSpd  = prev?.meta?.totalSpend ?? 0
  const prevKuRev    = prev?.kdp ? ((prev.kdp.totalKENP ?? 0) * 0.0045) : 0
  const prevTotalRev = (prev?.kdp?.totalRoyaltiesUSD ?? 0) + prevKuRev
  const prevMetaRoas = prevMetaSpd > 0 ? prevTotalRev / prevMetaSpd : null
  const mlList     = liveML?.listSize ?? analysis?.mailerLite?.listSize ?? null
  const prevMlList = prev?.mailerLite?.listSize ?? null
  const mlOpenRate = liveML?.openRate ?? analysis?.mailerLite?.openRate ?? null
  const pinSaves     = analysis?.pinterest?.totalSaves ?? null
  const prevPinSaves = prev?.pinterest?.totalSaves ?? null

  const cards = [
    { label: 'KDP Royalties', dot: '#F97B6B', href: '/dashboard/kdp',
      display: kdpVal != null ? fmtCurrency(kdpVal) : null,
      curr: kdpVal, prev: prevKdpVal,
      velocity: kdpTotals.totalUnits > 0 ? `${kdpTotals.totalUnits.toLocaleString()} units` : null },
    { label: 'Meta ROAS', dot: '#F4A261', href: '/dashboard/meta',
      display: metaRoas != null ? `${metaRoas.toFixed(2)}×` : null,
      curr: metaRoas, prev: prevMetaRoas,
      velocity: metaSpend > 0 ? `${fmtCurrency(metaSpend as number)} spend` : null },
    { label: 'MailerLite List', dot: '#5BBFB5', href: '/dashboard/mailerlite',
      display: mlList != null ? (mlList as number).toLocaleString() : null,
      curr: mlList, prev: prevMlList,
      velocity: mlOpenRate != null ? `${mlOpenRate}% open` : null },
    { label: 'Pinterest Saves', dot: '#60A5FA', href: '/dashboard/pinterest',
      display: pinSaves != null ? (pinSaves as number).toLocaleString() : null,
      curr: pinSaves, prev: prevPinSaves,
      velocity: analysis?.pinterest?.saveRate != null ? `${analysis.pinterest.saveRate}% save rate` : null },
  ]

  return (
    <div className="boutique-channel-row" style={{ border: '1px solid var(--line, #d8cfbd)', background: 'var(--card, white)', marginBottom: 24, overflow: 'hidden' }}>
      {cards.map((card, i) => (
        <Link key={card.label} href={card.href} style={{
          display: 'block', textDecoration: 'none', background: 'var(--card, white)',
          padding: '20px 22px', borderRight: i < cards.length - 1 ? '1px solid var(--line, #d8cfbd)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: card.dot, flexShrink: 0, display: 'inline-block' }} />
            {card.label}
          </div>
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 32, fontWeight: 500, lineHeight: 1, color: card.display ? 'var(--ink, #14110f)' : 'var(--ink4, #8a8076)', marginBottom: 4 }}>
            {card.display ?? '—'}
          </div>
          <BoutiqueDeltaChip curr={card.curr} prev={card.prev} />
          {card.velocity && (
            <div style={{ marginTop: 6, display: 'inline-block', border: '1px solid var(--line, #d8cfbd)', padding: '2px 6px', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)' }}>
              {card.velocity}
            </div>
          )}
          {!card.display && (
            <div style={{ marginTop: 8, display: 'inline-block', border: '1px solid var(--line, #d8cfbd)', padding: '2px 8px', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink4, #8a8076)' }}>
              Connect to unlock
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

function formatRangeBadge(range: { from: string; to: string } | null): string {
  if (!range) return 'All Time'
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const today = now.toISOString().slice(0, 10)
  if (range.from === `${thisMonth}-01` && (range.to === today || range.to >= `${thisMonth}-28`)) return 'MTD'
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return `${fmt(range.from)} – ${fmt(range.to)}`
}

export function HeroPanel({ dashboard, userName }: { dashboard: DashboardState; userName?: string | null }) {
  const { analysis, analyses, liveML, animRev, animRoyalties, animUnits, animKenp, animCtr, _netVal, greeting, initialData, kdpLastUploadedAt, kdpTotals, kdpReady, selectedRange, hasMonthGranularData } = dashboard
  const kdpTotalsOrEmpty = kdpTotals ?? { totalUnits: 0, totalRoyalties: 0, totalKENP: 0 }

  const hasMailerLiteKey = initialData?.hasMailerLiteKey ?? !!liveML
  const hasKdpData = !!analysis?.kdp || !!kdpLastUploadedAt
  const allRequiredConnected = hasKdpData && hasMailerLiteKey

  return (
    <>
      {/* Boutique v2.3 greeting line */}
      {!dashboard.loading && analysis && (
        <div className="mb-5">
          <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 500, lineHeight: 1.3, color: 'var(--ink, #14110f)', margin: 0 }}>
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            {buildStorySentence(analysis, kdpTotalsOrEmpty) && (
              <>
                {' — '}
                <em style={{ fontStyle: 'italic', color: 'var(--amber-text, #a56b13)' }}>
                  {buildStorySentence(analysis, kdpTotalsOrEmpty)}
                </em>
              </>
            )}
          </p>
        </div>
      )}

      {/* Empty state — hidden when both required channels (KDP + MailerLite) are connected */}
      {!analysis && !allRequiredConnected && (
        <div className="mb-7">
          <div className="mb-1" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 500, lineHeight: 1.3, color: 'var(--ink, #1E2D3D)' }}>
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}. Your dashboard is ready — it just needs your data.
          </div>
          <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
            Connect your channels below to unlock your personalised coaching.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: '📊', title: 'KDP', border: '#F97B6B',
                desc: hasKdpData ? 'Sales report uploaded' : 'Upload your sales report',
                cta: hasKdpData ? 'Upload again →' : 'Upload →',
                href: '/dashboard?upload=1',
                connected: hasKdpData,
              },
              {
                icon: '✉', title: 'MailerLite', border: '#6EBF8B',
                desc: hasMailerLiteKey ? 'API key connected' : 'Add your API key',
                cta: hasMailerLiteKey ? 'View stats →' : 'Connect →',
                href: hasMailerLiteKey ? '/dashboard/mailerlite' : '/dashboard/settings#mailerlite',
                connected: hasMailerLiteKey,
              },
              {
                icon: '📘', title: 'Meta Ads', border: '#60A5FA',
                desc: 'Connect your ad account',
                cta: 'Connect →',
                href: '/dashboard/settings#meta',
                connected: false,
              },
            ].map(card => (
              <div key={card.title} className="p-5 flex flex-col gap-3"
                style={{ background: 'white', border: '1px solid #EEEBE6', borderLeft: `3px solid ${card.border}` }}>
                <div className="flex items-center justify-between">
                  <div className="text-2xl">{card.icon}</div>
                  {card.connected && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6EBF8B' }}>✓ Connected</span>
                  )}
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>{card.title}</div>
                  <div className="text-[12.5px]" style={{ color: '#6B7280' }}>{card.desc}</div>
                </div>
                <Link href={card.href} className="inline-block text-[12.5px] font-semibold no-underline hover:opacity-80 mt-auto" style={{ color: '#D97706' }}>
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero number card */}
      <div className="mb-4" style={{ background: 'white', border: '1px solid var(--line, #d8cfbd)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '28px 28px 22px' }}>
        <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--green-text, #245c3f)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-text, #245c3f)', display: 'inline-block', flexShrink: 0 }} />
          Royalties · {formatRangeBadge(selectedRange ?? null)}
        </div>
        {selectedRange && hasMonthGranularData && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', border: '1px solid #E9A020', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: '#92400E', marginBottom: 8, fontFamily: 'var(--font-mono, ui-monospace, monospace)', letterSpacing: '0.06em' }}>
            ⚠ Month snapshot — can't split by day
          </div>
        )}

        {!kdpReady ? (
          <>
            <div className="animate-pulse bg-gray-100 rounded" style={{ height: 'clamp(64px, 9vw, 104px)', width: 220, marginBottom: 14 }} />
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line, #d8cfbd)' }}>
              <div className="animate-pulse bg-gray-100 rounded" style={{ height: 14, width: 260 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line, #d8cfbd)' }}>
              {['Units Sold', 'KENP Reads', 'Best CTR'].map(label => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', marginBottom: 6 }}>{label}</div>
                  <div className="animate-pulse bg-gray-100 rounded" style={{ height: 20, width: 48, margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {analysis?.kdp ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, lineHeight: 1 }}>
                  <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 500, color: 'var(--ink3, #564e46)', lineHeight: 1 }}>$</span>
                  <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(64px, 9vw, 104px)', fontWeight: 500, color: 'var(--ink, #14110f)', lineHeight: 1 }}>{Math.floor(animRoyalties).toLocaleString()}</span>
                  <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 500, color: 'var(--ink3, #564e46)', lineHeight: 1 }}>.{String(Math.round((animRoyalties % 1) * 100)).padStart(2, '0')}</span>
                </div>
                {(() => {
                  const royalties = kdpTotals?.totalRoyalties ?? 0
                  const estRevenue = kdpTotals?.estRevenue ?? (royalties + (kdpTotals?.totalKENP ?? 0) * 0.0045)
                  if (Math.abs(estRevenue - royalties) <= 1) return null
                  return (
                    <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(30,45,61,0.5)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>
                      Est. Revenue ~${estRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )
                })()}
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 80, fontWeight: 300, color: 'var(--ink4, #8a8076)', lineHeight: 1 }}>—</div>
            )}

            {analysis?.kdp && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line, #d8cfbd)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, color: 'var(--ink3, #564e46)' }}>
                <span>${animRoyalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gross</span>
                {(analysis.meta?.totalSpend ?? 0) > 0 && (
                  <>
                    <span style={{ color: 'var(--ink4, #8a8076)' }}> · minus </span>
                    <span style={{ color: '#dc2626' }}>${(analysis.meta.totalSpend).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span style={{ color: 'var(--ink4, #8a8076)' }}> Meta spend</span>
                  </>
                )}
                <span style={{ color: 'var(--ink4, #8a8076)' }}> · minus $0 returns = </span>
                <span style={{ color: _netVal < 0 ? '#F97B6B' : 'var(--ink, #14110f)', fontWeight: 600 }}>
                  {_netVal < 0 ? `-$${Math.abs(_netVal).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${_netVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} net
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line, #d8cfbd)' }}>
              {[
                { label: 'Units Sold', value: analysis?.kdp ? Math.round(animUnits).toLocaleString() : null },
                { label: 'KENP Reads', value: analysis?.kdp ? Math.round(animKenp).toLocaleString()  : null },
                { label: 'Best CTR',   value: analysis?.meta?.bestAd ? `${animCtr.toFixed(1)}%`       : null },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', marginBottom: 3 }}>{stat.label}</div>
                  {stat.value != null ? (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--ink, #14110f)' }}>{stat.value}</div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--ink4, #8a8076)', marginBottom: 2 }}>No data</div>
                      <Link href="/dashboard?upload=1" style={{ fontSize: 10, color: '#D97706', textDecoration: 'none', fontWeight: 600 }}>Upload →</Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* What's Working metric tiles */}
      {analysis && (
        <div className="mb-7">
          <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-[#EEEBE6]">
            {(() => {
              const meta = analysis.meta
              const ml = liveML ?? analysis?.mailerLite
              const hasKdp = kdpTotalsOrEmpty.totalUnits > 0 || kdpTotalsOrEmpty.totalRoyalties > 0 || kdpTotalsOrEmpty.totalKENP > 0
              const royalties = hasKdp ? Math.round(kdpTotalsOrEmpty.totalRoyalties * 100) / 100 : null
              const tiles = [
                { stat: royalties != null ? fmtCurrency(royalties) : '—', label: 'ROYALTIES', estimate: false, sub: kdpTotalsOrEmpty.totalUnits > 0 ? `${kdpTotalsOrEmpty.totalUnits} units sold` : 'No data yet' },
                { stat: meta?.avgCTR ? fmtPct(meta.avgCTR) : '—', label: 'META ADS CTR', estimate: false, sub: meta?.avgCTR && meta.avgCTR >= 2 ? 'Exceptional performance (top 10%)' : meta?.avgCTR ? 'Room to improve' : 'No data yet' },
                { stat: ml?.openRate ? fmtPct(ml.openRate) : '—', label: 'EMAIL OPEN RATE', estimate: false, sub: ml?.openRate && ml.openRate >= 25 ? 'Well above 20–25% author average' : ml?.openRate ? 'Near author average' : 'No data yet' },
                { stat: ml?.clickRate ? fmtPct(ml.clickRate) : '—', label: 'EMAIL CLICK RATE', estimate: false, sub: ml?.clickRate && ml.clickRate >= 4 ? 'Strong reader engagement' : ml?.clickRate ? 'Room to grow' : 'No data yet' },
              ]
              return tiles.map((t, i) => (
                <div key={i} className="px-4 py-1 first:pl-0 last:pr-0">
                  <div className="text-[28px] font-semibold leading-none mb-1" style={{ color: '#1E2D3D' }}>{t.stat}</div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: '#6EBF8B' }}>{t.label}</div>
                    {t.estimate && <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D97706' }}>Est.</span>}
                  </div>
                  <div className="text-[12px]" style={{ color: '#6B7280' }}>{t.sub}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}
    </>
  )
}
