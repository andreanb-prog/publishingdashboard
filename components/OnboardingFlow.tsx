'use client'
// components/OnboardingFlow.tsx — Grandparent-proof guided setup for first-time users
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'welcome' | 'kdp' | 'meta' | 'done'

interface FileResult {
  filename: string
  summary: string
  type: string
}

export function OnboardingFlow({ onSkip }: { onSkip: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [kdpFile, setKdpFile] = useState<FileResult | null>(null)
  const [metaFile, setMetaFile] = useState<FileResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)
  const kdpRef = useRef<HTMLInputElement>(null)
  const metaRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File, type: 'kdp' | 'meta') => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const endpoint = type === 'kdp' ? '/api/parse-kdp' : '/api/parse-meta'
      const res = await fetch(endpoint, { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        const result: FileResult = {
          filename: file.name,
          summary: type === 'kdp'
            ? `${data.data?.totalUnits ?? 0} units, $${data.data?.totalRoyaltiesUSD?.toFixed(2) ?? '0'} royalties`
            : `${data.data?.ads?.length ?? 0} ads, $${data.data?.totalSpend ?? 0} spend`,
          type,
        }
        if (type === 'kdp') setKdpFile(result)
        else setMetaFile(result)
      }
    } catch { /* ignore */ }
    setUploading(false)
  }, [])

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const month = new Date().toISOString().substring(0, 7)
      // Fetch MailerLite data if connected
      const mlRes = await fetch('/api/mailerlite').catch(() => null)
      const mlData = mlRes?.ok ? (await mlRes.json()).data : null

      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, mailerLite: mlData }),
      })
      setAnalysisDone(true)
    } catch { /* ignore */ }
    setAnalyzing(false)
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* ── Step 1: Welcome ──────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="text-5xl mb-6">👋</div>
            <h1 className="text-[28px] font-semibold tracking-tight mb-3" style={{ color: '#1E2D3D' }}>
              Let&apos;s get your dashboard set up
            </h1>
            <p className="text-[15px] leading-relaxed mb-8 max-w-sm mx-auto" style={{ color: '#6B7280' }}>
              We need a couple of files from you. We&apos;ll show you exactly where to find them — it takes about 2 minutes.
            </p>
            <button
              onClick={() => setStep('kdp')}
              className="px-8 py-3.5 rounded-xl text-[16px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              Let&apos;s go →
            </button>
            <div className="mt-4">
              <button onClick={onSkip}
                className="text-[13px] bg-transparent border-none cursor-pointer"
                style={{ color: '#9CA3AF' }}>
                I&apos;ll do this later
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: KDP File Guide ──────────────────────────────────── */}
        {step === 'kdp' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: '#e9a020', color: '#0d1f35' }}>1</span>
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#9CA3AF' }}>
                Step 1 of 3
              </span>
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
              Get your KDP sales report
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              This is where your book sales and royalties live. Here&apos;s exactly how to get it:
            </p>

            {/* Visual numbered guide */}
            <div className="rounded-xl p-5 mb-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              {[
                { num: '1', text: 'Go to kdp.amazon.com and sign in' },
                { num: '2', text: 'Click "Reports" in the top menu bar' },
                { num: '3', text: 'Click "Month-End Sales Report"' },
                { num: '4', text: 'Click "Generate Report" for the most recent month' },
                { num: '5', text: 'Download the Excel file when it\'s ready' },
              ].map(s => (
                <div key={s.num} className="flex items-start gap-3 mb-3 last:mb-0">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(233,160,32,0.12)', color: '#e9a020' }}>
                    {s.num}
                  </span>
                  <span className="text-[13.5px]" style={{ color: '#374151' }}>{s.text}</span>
                </div>
              ))}
            </div>

            <a href="https://kdp.amazon.com/en_US/reports" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-semibold no-underline mb-5 transition-all hover:opacity-90"
              style={{ background: '#FAF8F5', border: '1px solid #EEEBE6', color: '#1E2D3D' }}>
              Open KDP Reports in new tab →
            </a>

            {/* Drop zone */}
            {kdpFile ? (
              <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(52,211,153,0.06)', border: '1.5px solid rgba(52,211,153,0.3)' }}>
                <div className="text-3xl mb-2">✅</div>
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#34d399' }}>
                  Got it! KDP file ready
                </div>
                <div className="text-[12px]" style={{ color: '#6B7280' }}>{kdpFile.summary}</div>
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-amber-400"
                style={{ borderColor: '#EEEBE6', background: '#FAFAFA' }}
                onClick={() => kdpRef.current?.click()}
              >
                <input ref={kdpRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0], 'kdp') }} />
                <div className="text-3xl mb-3">📂</div>
                <div className="text-[15px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                  {uploading ? 'Reading your file...' : 'Drop your KDP file here'}
                </div>
                <div className="text-[12px] mb-4" style={{ color: '#9CA3AF' }}>
                  or click anywhere in this box to browse
                </div>
                <button className="px-5 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer"
                  style={{ background: '#e9a020', color: '#0d1f35' }}>
                  Browse for file
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-5">
              <button onClick={() => setStep('welcome')}
                className="text-[13px] bg-transparent border-none cursor-pointer" style={{ color: '#9CA3AF' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep('meta')}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-all"
                style={{ background: kdpFile ? '#e9a020' : '#F5F5F4', color: kdpFile ? '#0d1f35' : '#9CA3AF' }}
              >
                {kdpFile ? 'Next →' : 'Skip this step →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Meta Ads (optional) ─────────────────────────────── */}
        {step === 'meta' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: '#38bdf8', color: 'white' }}>2</span>
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#9CA3AF' }}>
                Step 2 of 3
              </span>
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
              Do you run Facebook or Instagram ads?
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              If you use Meta Ads Manager, we can analyze your ad performance too.
            </p>

            {metaFile ? (
              <div className="rounded-xl p-5 text-center mb-5" style={{ background: 'rgba(52,211,153,0.06)', border: '1.5px solid rgba(52,211,153,0.3)' }}>
                <div className="text-3xl mb-2">✅</div>
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#34d399' }}>Meta Ads file ready</div>
                <div className="text-[12px]" style={{ color: '#6B7280' }}>{metaFile.summary}</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  className="rounded-xl p-5 text-center cursor-pointer transition-all hover:border-blue-300"
                  style={{ background: 'white', border: '1.5px solid #EEEBE6' }}
                  onClick={() => metaRef.current?.click()}
                >
                  <input ref={metaRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0], 'meta') }} />
                  <div className="text-2xl mb-2">📣</div>
                  <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
                    {uploading ? 'Reading...' : 'Yes, upload my ads'}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                    Export CSV from Ads Manager
                  </div>
                </div>
                <div
                  className="rounded-xl p-5 text-center cursor-pointer transition-all hover:border-stone-300"
                  style={{ background: '#FAFAFA', border: '1.5px solid #EEEBE6' }}
                  onClick={() => setStep('done')}
                >
                  <div className="text-2xl mb-2">⏭️</div>
                  <div className="text-[13px] font-semibold" style={{ color: '#6B7280' }}>
                    Skip for now
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                    I don&apos;t run ads yet
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <button onClick={() => setStep('kdp')}
                className="text-[13px] bg-transparent border-none cursor-pointer" style={{ color: '#9CA3AF' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep('done')}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer"
                style={{ background: '#e9a020', color: '#0d1f35' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: All set ─────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center">
            {analysisDone ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl"
                  style={{ background: 'rgba(52,211,153,0.1)' }}>
                  ✅
                </div>
                <h2 className="text-[24px] font-semibold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
                  Your dashboard is ready!
                </h2>
                <p className="text-[14px] mb-6" style={{ color: '#6B7280' }}>
                  Everything&apos;s been analyzed. Let&apos;s take a look.
                </p>
                <button
                  onClick={() => router.push('/dashboard?fresh=1')}
                  className="px-8 py-3.5 rounded-xl text-[16px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
                  style={{ background: '#e9a020', color: '#0d1f35' }}
                >
                  View my dashboard →
                </button>
              </>
            ) : analyzing ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl animate-pulse"
                  style={{ background: 'rgba(233,160,32,0.1)' }}>
                  ⚡
                </div>
                <h2 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
                  Building your dashboard...
                </h2>
                <p className="text-[14px]" style={{ color: '#6B7280' }}>
                  This takes about 15 seconds. Hang tight!
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6 justify-center">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: '#34d399', color: 'white' }}>3</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#9CA3AF' }}>
                    Step 3 of 3
                  </span>
                </div>
                <h2 className="text-[24px] font-semibold tracking-tight mb-4" style={{ color: '#1E2D3D' }}>
                  All set! Here&apos;s what we found:
                </h2>

                <div className="space-y-2 mb-6 text-left max-w-sm mx-auto">
                  {kdpFile && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)' }}>
                      <span style={{ color: '#34d399' }}>✅</span>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>KDP Report</div>
                        <div className="text-[11px]" style={{ color: '#6B7280' }}>{kdpFile.summary}</div>
                      </div>
                    </div>
                  )}
                  {metaFile && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)' }}>
                      <span style={{ color: '#34d399' }}>✅</span>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Meta Ads</div>
                        <div className="text-[11px]" style={{ color: '#6B7280' }}>{metaFile.summary}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(56,189,248,0.06)' }}>
                    <span style={{ color: '#38bdf8' }}>⚡</span>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>MailerLite</div>
                      <div className="text-[11px]" style={{ color: '#6B7280' }}>Connected automatically (if API key set)</div>
                    </div>
                  </div>
                  {!kdpFile && !metaFile && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.06)' }}>
                      <span style={{ color: '#fbbf24' }}>📂</span>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>No files uploaded</div>
                        <div className="text-[11px]" style={{ color: '#6B7280' }}>You can upload files anytime from the Upload page</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={kdpFile || metaFile ? runAnalysis : () => router.push('/dashboard/upload')}
                  className="px-8 py-3.5 rounded-xl text-[16px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
                  style={{ background: '#e9a020', color: '#0d1f35' }}
                >
                  {kdpFile || metaFile ? 'Show me my dashboard →' : 'Go to Upload page →'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
