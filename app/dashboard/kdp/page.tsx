'use client'
// app/(dashboard)/kdp/page.tsx
import { useEffect, useState } from 'react'
import { DarkPage, DarkKPIStrip, DarkSectionHeader, DarkCoachBox } from '@/components/DarkPage'
import { Sparkline, BarChart } from '@/components/ui'
import type { Analysis } from '@/types'

export default function KDPPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.json())
      .then(d => { if (d.analyses?.[0]) setAnalysis(d.analyses[0].data || d.analyses[0]) })
  }, [])

  const kdp = analysis?.kdp
  const coach = (analysis as any)?.kdpCoach

  return (
    <DarkPage title="📚 KDP — Sales & Royalties" subtitle="Kindle Direct Publishing · Units sold, KENP reads, royalties">
      {!kdp ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📚</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>No KDP data yet</div>
          <p className="text-sm mb-4">Upload your KDP Excel report to see your analysis</p>
          <a href="/dashboard/upload" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>
            Upload Files →
          </a>
        </div>
      ) : (
        <>
          <DarkKPIStrip cols={5} items={[
            { label: 'Total Royalties', value: `$${kdp.totalRoyaltiesUSD}`, sub: 'USD this month', color: '#fb7185' },
            { label: 'Total Units', value: kdp.totalUnits, sub: 'eBooks + paperback', color: '#38bdf8' },
            { label: 'KENP Reads', value: kdp.totalKENP?.toLocaleString(), sub: `~$${Math.round(kdp.totalKENP * 0.0045)} est. KU earnings`, color: '#fbbf24' },
            { label: 'MOLR Units', value: kdp.books.find(b => b.asin === 'B0GSC2RTF8')?.units || 0, sub: 'My Off-Limits Roommate', color: '#34d399' },
            { label: 'FDMBP Units', value: kdp.books.find(b => b.asin === 'B0GQD4J6VT')?.units || 0, sub: 'Fake Dating Billionaire', color: '#a78bfa' },
          ]} />

          {coach && <DarkCoachBox color="#fbbf24">{coach}</DarkCoachBox>}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>Units by Book</h3>
              <BarChart
                items={kdp.books.map(b => ({ label: b.shortTitle, value: b.units, formatted: `${b.units}` }))}
                color="#fb7185"
              />
            </div>
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>KENP by Book</h3>
              <BarChart
                items={kdp.books.map(b => ({ label: b.shortTitle, value: b.kenp, formatted: b.kenp.toLocaleString() }))}
                color="#fbbf24"
              />
            </div>
          </div>

          <div className="rounded-xl p-5 mb-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
            <h3 className="text-[13.5px] font-semibold mb-1" style={{ color: '#d6d3d1' }}>Daily Units Sold</h3>
            <p className="text-[11px] mb-4" style={{ color: '#a8a29e' }}>
              Peak day: {kdp.dailyUnits.sort((a, b) => b.value - a.value)[0]?.date} —{' '}
              {kdp.dailyUnits.sort((a, b) => b.value - a.value)[0]?.value} units
            </p>
            <Sparkline data={kdp.dailyUnits.map(d => d.value)} color="#fb7185" height={64} />
            <div className="flex justify-between mt-2 text-[10.5px]" style={{ color: '#a8a29e' }}>
              <span>{kdp.dailyUnits[0]?.date}</span>
              <span>↑ Peaks = promo days</span>
              <span>{kdp.dailyUnits[kdp.dailyUnits.length - 1]?.date}</span>
            </div>
          </div>
        </>
      )}
    </DarkPage>
  )
}
