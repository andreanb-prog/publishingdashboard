'use client'
// app/(dashboard)/upload/page.tsx
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { KDPData, MetaData, PinterestData } from '@/types'

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface FileState {
  file: File | null
  status: UploadStatus
  data: any
  filename: string
  summary: string
}

const ANALYSIS_STEPS = [
  'Reading your KDP file...',
  'Parsing sales and KENP data...',
  'Analyzing your Facebook ads...',
  'Pulling MailerLite stats...',
  'Reading Pinterest data...',
  'Generating your coaching session...',
  'Almost done...',
]

export default function UploadPage() {
  const router = useRouter()
  const kdpRef = useRef<HTMLInputElement>(null)
  const metaRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  const [kdp, setKdp] = useState<FileState>({ file: null, status: 'idle', data: null, filename: '', summary: '' })
  const [meta, setMeta] = useState<FileState>({ file: null, status: 'idle', data: null, filename: '', summary: '' })
  const [pinterest, setPinterest] = useState<FileState>({ file: null, status: 'idle', data: null, filename: '', summary: '' })
  const [analyzing, setAnalyzing] = useState(false)
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  async function handleFile(
    file: File,
    type: 'kdp' | 'meta' | 'pinterest',
    setter: React.Dispatch<React.SetStateAction<FileState>>
  ) {
    setter(s => ({ ...s, file, filename: file.name, status: 'uploading' }))

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/parse-${type}`, { method: 'POST', body: formData })
      const json = await res.json()

      if (!json.success) throw new Error(json.error)

      let summary = ''
      if (type === 'kdp') {
        const d: KDPData = json.data
        summary = `${d.totalUnits} units · ${d.totalKENP?.toLocaleString()} KENP · $${d.totalRoyaltiesUSD} royalties`
      } else if (type === 'meta') {
        const d: MetaData = json.data
        summary = `${d.ads.length} ads · $${d.totalSpend} spend · ${d.totalClicks} clicks`
      } else {
        const d: any = json.data
        summary = `${d.totalImpressions} impressions · ${d.pinCount} pins`
      }

      setter(s => ({ ...s, status: 'done', data: json.data, summary }))
    } catch (err) {
      console.error(err)
      setter(s => ({ ...s, status: 'error', summary: 'Failed to parse file' }))
    }
  }

  async function runAnalysis() {
    setAnalyzing(true)
    setStep(0)
    setProgress(0)

    // Animate steps
    let stepIdx = 0
    const stepInterval = setInterval(() => {
      stepIdx++
      if (stepIdx < ANALYSIS_STEPS.length) {
        setStep(stepIdx)
        setProgress(Math.round((stepIdx / ANALYSIS_STEPS.length) * 100))
      } else {
        clearInterval(stepInterval)
      }
    }, 900)

    try {
      // Fetch MailerLite in parallel
      const mlRes = await fetch('/api/mailerlite').catch(() => null)
      const mlData = mlRes?.ok ? (await mlRes.json()).data : null

      const month = new Date().toISOString().substring(0, 7)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kdp: kdp.data,
          meta: meta.data,
          mailerLite: mlData,
          pinterest: pinterest.data,
          month,
        }),
      })

      clearInterval(stepInterval)
      setProgress(100)

      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        throw new Error('Analysis failed')
      }
    } catch (err) {
      clearInterval(stepInterval)
      setAnalyzing(false)
      alert('Analysis failed. Please try again.')
    }
  }

  const hasAnyFile = kdp.data || meta.data || pinterest.data
  const canAnalyze = hasAnyFile && !analyzing

  function DropBox({
    icon, title, desc, state, inputRef, type, setter
  }: {
    icon: string; title: string; desc: string
    state: FileState
    inputRef: React.RefObject<HTMLInputElement>
    type: 'kdp' | 'meta' | 'pinterest'
    setter: React.Dispatch<React.SetStateAction<FileState>>
  }) {
    return (
      <div
        className={`border-2 rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${state.status === 'done'
            ? 'bg-emerald-900/10 border-emerald-500'
            : 'border-dashed hover:border-amber-brand hover:bg-amber-brand/5'
          }`}
        style={{ borderColor: state.status === 'done' ? '#34d399' : 'rgba(255,255,255,0.18)' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f, type, setter)
        }}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept={type === 'kdp' ? '.xlsx,.xls' : '.csv'}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f, type, setter)
          }}
        />
        <span className="text-3xl block mb-2">
          {state.status === 'done' ? '✅' : state.status === 'uploading' ? '⏳' : icon}
        </span>
        <div className="text-[13.5px] font-bold mb-1"
          style={{ color: state.status === 'done' ? '#34d399' : 'rgba(255,255,255,0.8)' }}>
          {state.status === 'done' ? state.filename : title}
        </div>
        <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {state.status === 'done' ? state.summary : desc}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div
        className="rounded-xl p-8 mb-6"
        style={{ background: '#0d1f35' }}
      >
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-2.5"
          style={{ color: '#e9a020' }}>
          Monthly Analysis
        </div>
        <h1 className="font-serif text-[30px] text-white leading-snug mb-2">
          Drop your files.<br />Get your coaching session.
        </h1>
        <p className="text-[13.5px] mb-7 leading-relaxed max-w-lg"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          Upload your KDP report, Meta Ads export, and Pinterest CSV.
          Claude reads everything and tells you exactly what to do — in plain English, no jargon.
        </p>

        {!analyzing ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <DropBox
                icon="📚" title="Drop your KDP Report" type="kdp"
                desc="Download from KDP Dashboard → Reports"
                state={kdp} inputRef={kdpRef} setter={setKdp}
              />
              <DropBox
                icon="📣" title="Drop your Meta Ads export" type="meta"
                desc="Export from Ads Manager as CSV"
                state={meta} inputRef={metaRef} setter={setMeta}
              />
              <DropBox
                icon="📌" title="Drop your Pinterest CSV" type="pinterest"
                desc="From Pinterest Analytics → Export"
                state={pinterest} inputRef={pinRef} setter={setPinterest}
              />
            </div>

            {/* MailerLite auto row */}
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3 mb-6"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ background: 'rgba(233,160,32,0.15)' }}>⚡</div>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    MailerLite connected — pulls automatically
                  </div>
                  <div className="text-[11px] font-semibold" style={{ color: '#34d399' }}>
                    ✓ No file needed — syncing in real time
                  </div>
                </div>
              </div>
            </div>

            <button
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-[15px] font-bold
                         transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#e9a020', color: '#0d1f35' }}
              disabled={!canAnalyze}
              onClick={runAnalysis}
            >
              Analyze Everything Now →
            </button>

            {!hasAnyFile && (
              <p className="text-[11.5px] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Drop at least one file to run analysis. MailerLite data is always included automatically.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
              style={{ background: 'rgba(233,160,32,0.15)' }}>
              {done ? '✅' : '⚙️'}
            </div>
            <div className="font-serif text-[22px] text-white mb-2">
              {done ? 'Done! Redirecting...' : 'Claude is reading your data...'}
            </div>
            <div className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {ANALYSIS_STEPS[step]}
            </div>
            <div className="max-w-[300px] mx-auto h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: '#e9a020' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* How to export instructions */}
      <div className="card p-5">
        <div className="text-[13px] font-bold text-[#0d1f35] mb-3">How to export your files</div>
        <div className="space-y-2 text-[12.5px] text-stone-500 leading-relaxed">
          <div><strong className="text-stone-700">KDP:</strong> kdp.amazon.com → Reports → Month-end Report → Download Excel</div>
          <div><strong className="text-stone-700">Meta Ads:</strong> Ads Manager → select date range → Export → CSV</div>
          <div><strong className="text-stone-700">Pinterest:</strong> analytics.pinterest.com → Overview → Export → date range CSV</div>
        </div>
      </div>
    </div>
  )
}
