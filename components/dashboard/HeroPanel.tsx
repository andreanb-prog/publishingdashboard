'use client'
// components/dashboard/HeroPanel.tsx
import Link from 'next/link'
import { fmtPct, fmtCurrency } from '@/lib/utils'
import type { DashboardState } from './useDashboardData'

function buildStorySentence(analysis: any): string | null {
  if (!analysis) return null
  if (analysis.storySentence) return analysis.storySentence
  const kdp  = analysis.kdp
  const meta = analysis.meta
  const units: number | undefined = kdp?.totalUnits
  const kenp:  number | undefined = kdp?.totalKENP
  const royalties: number | undefined = kdp?.totalRoyaltiesUSD
  const estRevenue = kdp ? Math.round(((royalties ?? 0) + (kenp ?? 0) * 0.0045) * 100) / 100 : null
  const ctr:   number | undefined = meta?.bestAd?.ctr ?? meta?.avgCTR
  const spend: number | undefined = meta?.totalSpend
  if (units && kenp) {
    if (kenp > units * 20) return `${units.toLocaleString()} readers chose your books this month — and ${kenp.toLocaleString()} of them didn't stop reading.`
    if (units >= 50) return `${units.toLocaleString()} readers and ${kenp.toLocaleString()} pages read — your books are pulling people in and keeping them there.`
    return `${units.toLocaleString()} readers showed up this month, reading ${kenp.toLocaleString()} pages between them.`
  }
  if (units && estRevenue != null) return `${units.toLocaleString()} readers, $${estRevenue.toFixed(2)} earned — your books are working.`
  if (units) return `${units.toLocaleString()} readers chose your books this month — keep that momentum going.`
  if (ctr != null && spend) return `$${spend.toFixed(2)} spent, ${ctr}% of people clicked — your ads are cutting through the noise.`
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
  analysis, liveML, analyses,
}: {
  analysis: any
  liveML: import('@/types').MailerLiteData | null
  analyses: any[]
}) {
  const prev = analyses[1] ?? null
  const kdpVal     = analysis?.kdp?.totalRoyaltiesUSD ?? null
  const prevKdpVal = prev?.kdp?.totalRoyaltiesUSD ?? null
  const metaSpend    = analysis?.meta?.totalSpend ?? 0
  const kdpKuRev     = analysis?.kdp ? ((analysis.kdp.totalKENP ?? 0) * 0.0045) : 0
  const totalRev     = (analysis?.kdp?.totalRoyaltiesUSD ?? 0) + kdpKuRev
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
      display: kdpVal != null ? `$${kdpVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
      curr: kdpVal, prev: prevKdpVal,
      velocity: analysis?.kdp?.totalUnits ? `${(analysis.kdp.totalUnits as number).toLocaleString()} units` : null },
    { label: 'Meta ROAS', dot: '#F4A261', href: '/dashboard/meta',
      display: metaRoas != null ? `${metaRoas.toFixed(2)}×` : null,
      curr: metaRoas, prev: prevMetaRoas,
      velocity: metaSpend > 0 ? `$${(metaSpend as number).toLocaleString(undefined, { maximumFractionDigits: 2 })} spend` : null },
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

export function HeroPanel({ dashboard, userName }: { dashboard: DashboardState; userName?: string | null }) {
  const { analysis, analyses, liveML, animRev, animUnits, animKenp, animCtr, _netVal, greeting } = dashboard

  return (
    <>
      {/* Boutique v2.3 greeting line */}
      {!dashboard.loading && analysis && (
        <div className="mb-5">
          <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 500, lineHeight: 1.3, color: 'var(--ink, #14110f)', margin: 0 }}>
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            {buildStorySentence(analysis) && (
              <>
                {' — '}
                <em style={{ fontStyle: 'italic', color: 'var(--amber-text, #a56b13)' }}>
                  {buildStorySentence(analysis)}
                </em>
              </>
            )}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!analysis && (
        <div className="mb-7">
          <div className="mb-1" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 500, lineHeight: 1.3, color: 'var(--ink, #1E2D3D)' }}>
            {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}. Your dashboard is ready — it just needs your data.
          </div>
          <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
            Connect your channels below to unlock your personalised coaching.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📊', title: 'KDP',        desc: 'Upload your sales report',   cta: 'Upload →',  href: '/dashboard?upload=1',            border: '#F97B6B' },
              { icon: '✉',  title: 'MailerLite', desc: 'Add your API key',           cta: 'Connect →', href: '/dashboard/settings#mailerlite', border: '#6EBF8B' },
              { icon: '📘', title: 'Meta Ads',   desc: 'Connect your ad account',    cta: 'Connect →', href: '/dashboard/settings#meta',       border: '#60A5FA' },
            ].map(card => (
              <div key={card.title} className="p-5 flex flex-col gap-3"
                style={{ background: 'white', border: '1px solid #EEEBE6', borderLeft: `3px solid ${card.border}` }}>
                <div className="text-2xl">{card.icon}</div>
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
          Est. Revenue · MTD · Live
        </div>

        {analysis?.kdp ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 500, color: 'var(--ink3, #564e46)', lineHeight: 1 }}>$</span>
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(64px, 9vw, 104px)', fontWeight: 500, color: 'var(--ink, #14110f)', lineHeight: 1 }}>{Math.floor(animRev).toLocaleString()}</span>
            <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 500, color: 'var(--ink3, #564e46)', lineHeight: 1 }}>.{String(Math.round((animRev % 1) * 100)).padStart(2, '0')}</span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 80, fontWeight: 300, color: 'var(--ink4, #8a8076)', lineHeight: 1 }}>—</div>
        )}

        {analysis?.kdp && (
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line, #d8cfbd)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, color: 'var(--ink3, #564e46)' }}>
            <span>${animRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gross</span>
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
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--ink, #14110f)' }}>{stat.value}</div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--ink4, #8a8076)', marginBottom: 2 }}>No data</div>
                  <Link href="/dashboard?upload=1" style={{ fontSize: 10, color: '#D97706', textDecoration: 'none', fontWeight: 600 }}>Upload →</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* What's Working metric tiles */}
      {analysis && (
        <div className="mb-7">
          <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-[#EEEBE6]">
            {(() => {
              const kdp = analysis.kdp
              const meta = analysis.meta
              const ml = analysis.mailerLite
              const estRevenue = kdp ? Math.round(((kdp.totalRoyaltiesUSD ?? 0) + kdp.totalKENP * 0.0045) * 100) / 100 : null
              const royaltiesZero = kdp && (kdp.totalRoyaltiesUSD ?? 0) === 0
              const tiles = [
                { stat: estRevenue != null ? `$${estRevenue.toFixed(2)}` : '—', label: 'EST. REVENUE', estimate: royaltiesZero, sub: kdp?.totalUnits ? `${kdp.totalUnits} units sold` : 'No data yet' },
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
