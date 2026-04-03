'use client'
// components/OnboardingFlow.tsx — Grandparent-proof guided setup for first-time users
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'welcome' | 'kdp' | 'meta' | 'mailerlite' | 'done'

interface FileResult {
  filename: string
  summary: string
  type: string
}

const MAX_FILES = 10

export function OnboardingFlow({ onSkip }: { onSkip: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [kdpFiles, setKdpFiles] = useState<FileResult[]>([])
  const [metaFiles, setMetaFiles] = useState<FileResult[]>([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisDone, setAnalysisDone] = useState(false)
  const [mlKey, setMlKey] = useState('')
  const [mlStatus, setMlStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
  const [mlMessage, setMlMessage] = useState('')
  const kdpRef = useRef<HTMLInputElement>(null)
  const metaRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: File[], type: 'kdp' | 'meta') => {
    const setter = type === 'kdp' ? setKdpFiles : setMetaFiles
    const current = type === 'kdp' ? kdpFiles : metaFiles
    const remaining = MAX_FILES - current.length
    const batch = files.slice(0, remaining)
    if (batch.length === 0) return

    setUploading(true)
    const endpoint = type === 'kdp' ? '/api/parse-kdp' : '/api/parse-meta'

    for (const file of batch) {
      try {
        const formData = new FormData()
        formData.append('file', file)
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
          setter(prev => [...prev, result])
        }
      } catch { /* ignore */ }
    }
    setUploading(false)
  }, [kdpFiles, metaFiles])

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

  async function testAndSaveMailerLite() {
    if (!mlKey.trim()) return
    setMlStatus('testing')
    setMlMessage('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-mailerlite', key: mlKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      // Save the key
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailerLiteKey: mlKey.trim() }),
      })
      setMlStatus('connected')
      setMlMessage(`Connected! Your list has ${data.listSize?.toLocaleString()} subscribers.`)
    } catch (err: unknown) {
      setMlStatus('error')
      setMlMessage(err instanceof Error ? err.message : 'Could not connect — double-check your API key.')
    }
  }

  const [dragOverKdp, setDragOverKdp] = useState(false)
  const [dragOverMeta, setDragOverMeta] = useState(false)

  const onDrop = useCallback((e: React.DragEvent, type: 'kdp' | 'meta') => {
    e.preventDefault()
    if (type === 'kdp') setDragOverKdp(false)
    else setDragOverMeta(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) handleFiles(files, type)
  }, [handleFiles])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      {/* File inputs always in DOM so refs are never null */}
      <input ref={kdpRef} type="file" accept=".xlsx,.xls,.csv" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(Array.from(e.target.files), 'kdp'); e.target.value = '' }} />
      <input ref={metaRef} type="file" accept=".csv,.xlsx,.xls" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(Array.from(e.target.files), 'meta'); e.target.value = '' }} />

      <div className="w-full max-w-lg">

        {/* ── Step 1: Welcome ──────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="text-center">
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
                style={{ color: '#6B7280' }}>
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
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#6B7280' }}>
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
              style={{ background: '#FFFFFF', border: '1px solid #EEEBE6', color: '#1E2D3D' }}>
              Open KDP Reports in new tab →
            </a>

            {/* Uploaded files list */}
            {kdpFiles.length > 0 && (
              <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(52,211,153,0.06)', border: '1.5px solid rgba(52,211,153,0.3)' }}>
                <div className="text-[13px] font-semibold mb-2" style={{ color: '#34d399' }}>
                  ✅ {kdpFiles.length} file{kdpFiles.length > 1 ? 's' : ''} ready
                </div>
                <div className="space-y-1.5">
                  {kdpFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span style={{ color: '#374151' }}>{f.filename}</span>
                      <span style={{ color: '#6B7280' }}>{f.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drop zone */}
            {kdpFiles.length < MAX_FILES && (
              <div
                className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-amber-400"
                style={{ borderColor: dragOverKdp ? '#e9a020' : '#EEEBE6', background: dragOverKdp ? 'rgba(233,160,32,0.04)' : '#FAFAFA' }}
                onClick={() => kdpRef.current?.click()}
                onDrop={e => onDrop(e, 'kdp')}
                onDragOver={onDragOver}
                onDragEnter={() => setDragOverKdp(true)}
                onDragLeave={() => setDragOverKdp(false)}
              >
                <div className="mb-3 flex justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: '#E9A020' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-[15px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                  {uploading ? 'Reading your files...' : kdpFiles.length > 0 ? 'Add more KDP files' : 'Drop your KDP files here'}
                </div>
                <div className="text-[12px] mb-4" style={{ color: '#6B7280' }}>
                  {kdpFiles.length > 0 ? `${MAX_FILES - kdpFiles.length} more allowed` : 'Up to 10 files — click or drag & drop'}
                </div>
                <button className="px-5 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer"
                  style={{ background: '#e9a020', color: '#0d1f35' }}>
                  Browse for files
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-5">
              <button onClick={() => setStep('welcome')}
                className="text-[13px] bg-transparent border-none cursor-pointer" style={{ color: '#6B7280' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep('meta')}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-all"
                style={{ background: kdpFiles.length > 0 ? '#e9a020' : '#F5F5F4', color: kdpFiles.length > 0 ? '#0d1f35' : '#6B7280' }}
              >
                {kdpFiles.length > 0 ? 'Next →' : 'Skip this step →'}
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
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#6B7280' }}>
                Step 2 of 3
              </span>
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
              Do you run Facebook or Instagram ads?
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              If you use Meta Ads Manager, we can analyze your ad performance too.
            </p>

            {metaFiles.length > 0 && (
              <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(52,211,153,0.06)', border: '1.5px solid rgba(52,211,153,0.3)' }}>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-2" style={{ color: '#34d399' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.75"/>
                    <polyline points="8 12 11 15 16 9" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {metaFiles.length} file{metaFiles.length > 1 ? 's' : ''} ready
                </div>
                <div className="space-y-1.5">
                  {metaFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span style={{ color: '#374151' }}>{f.filename}</span>
                      <span style={{ color: '#6B7280' }}>{f.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div
                className="rounded-xl p-5 text-center cursor-pointer transition-all hover:border-blue-300"
                style={{ background: dragOverMeta ? 'rgba(56,189,248,0.04)' : 'white', border: `1.5px solid ${dragOverMeta ? '#38bdf8' : '#EEEBE6'}` }}
                onClick={() => metaRef.current?.click()}
                onDrop={e => onDrop(e, 'meta')}
                onDragOver={onDragOver}
                onDragEnter={() => setDragOverMeta(true)}
                onDragLeave={() => setDragOverMeta(false)}
              >
                <div className="mb-2 flex justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: '#60A5FA' }}>
                    <path d="M3 11l19-9-9 19-2-8-8-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
                  {uploading ? 'Reading...' : metaFiles.length > 0 ? 'Add more files' : 'Yes, upload my ads'}
                </div>
                <div className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
                  {metaFiles.length > 0 ? `${MAX_FILES - metaFiles.length} more allowed` : 'Export CSV from Ads Manager'}
                </div>
              </div>
              <div
                className="rounded-xl p-5 text-center cursor-pointer transition-all hover:border-stone-300"
                style={{ background: '#FAFAFA', border: '1.5px solid #EEEBE6' }}
                onClick={() => setStep('mailerlite')}
              >
                <div className="mb-2 flex justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: '#9CA3AF' }}>
                    <polyline points="13 17 18 12 13 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="6 17 11 12 6 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-[13px] font-semibold" style={{ color: '#6B7280' }}>
                  {metaFiles.length > 0 ? 'Done' : 'Skip for now'}
                </div>
                <div className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
                  {metaFiles.length > 0 ? 'Continue to next step' : 'I don\'t run ads yet'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <button onClick={() => setStep('kdp')}
                className="text-[13px] bg-transparent border-none cursor-pointer" style={{ color: '#6B7280' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep('mailerlite')}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer"
                style={{ background: '#e9a020', color: '#0d1f35' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: MailerLite API Key ─────────────────────────────── */}
        {step === 'mailerlite' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: '#34d399', color: 'white' }}>3</span>
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#6B7280' }}>
                Step 3 of 4
              </span>
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
              Connect your MailerLite account
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              This lets us pull your email subscriber stats automatically. Here&apos;s how to get your API key:
            </p>

            {/* Visual numbered guide */}
            <div className="rounded-xl p-5 mb-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              {[
                { num: '1', text: 'Go to mailerlite.com and log in to your account' },
                { num: '2', text: 'Click your profile icon in the bottom-left corner' },
                { num: '3', text: 'Select "Integrations" from the menu' },
                { num: '4', text: 'Click "MailerLite API"' },
                { num: '5', text: 'Click "Generate new token"' },
                { num: '6', text: 'Give it a name (e.g. "AuthorDash") and click "Create"' },
                { num: '7', text: 'Copy the token — you won\'t see it again!' },
              ].map(s => (
                <div key={s.num} className="flex items-start gap-3 mb-3 last:mb-0">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                    {s.num}
                  </span>
                  <span className="text-[13.5px]" style={{ color: '#374151' }}>{s.text}</span>
                </div>
              ))}
            </div>

            <a href="https://connect.mailerlite.com/integrations/api" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-semibold no-underline mb-5 transition-all hover:opacity-90"
              style={{ background: '#FFFFFF', border: '1px solid #EEEBE6', color: '#1E2D3D' }}>
              Open MailerLite Integrations in new tab →
            </a>

            {/* API key input */}
            {mlStatus === 'connected' ? (
              <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(52,211,153,0.06)', border: '1.5px solid rgba(52,211,153,0.3)' }}>
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#34d399' }}>
                  ✅ MailerLite connected!
                </div>
                <div className="text-[12px]" style={{ color: '#6B7280' }}>{mlMessage}</div>
              </div>
            ) : (
              <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
                <label className="block text-[12px] font-semibold mb-2" style={{ color: '#374151' }}>
                  Paste your API token here
                </label>
                <input
                  type="text"
                  value={mlKey}
                  onChange={e => { setMlKey(e.target.value); setMlStatus('idle'); setMlMessage('') }}
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOi..."
                  className="w-full px-4 py-3 rounded-lg text-[13px] border outline-none transition-all focus:ring-2 focus:ring-emerald-200"
                  style={{ borderColor: mlStatus === 'error' ? '#fb7185' : '#EEEBE6', background: '#FAFAFA' }}
                />
                {mlStatus === 'error' && (
                  <div className="text-[12px] mt-2" style={{ color: '#fb7185' }}>{mlMessage}</div>
                )}
                <button
                  onClick={testAndSaveMailerLite}
                  disabled={!mlKey.trim() || mlStatus === 'testing'}
                  className="mt-3 px-5 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-all"
                  style={{
                    background: mlKey.trim() ? '#34d399' : '#F5F5F4',
                    color: mlKey.trim() ? 'white' : '#6B7280',
                    opacity: mlStatus === 'testing' ? 0.7 : 1,
                  }}
                >
                  {mlStatus === 'testing' ? 'Testing connection...' : 'Test & Connect'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-5">
              <button onClick={() => setStep('meta')}
                className="text-[13px] bg-transparent border-none cursor-pointer" style={{ color: '#6B7280' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep('done')}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer transition-all"
                style={{ background: mlStatus === 'connected' ? '#e9a020' : '#F5F5F4', color: mlStatus === 'connected' ? '#0d1f35' : '#6B7280' }}
              >
                {mlStatus === 'connected' ? 'Next →' : 'Skip this step →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: All set ─────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center">
            {analysisDone ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(52,211,153,0.1)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.75"/>
                    <polyline points="8 12 11 15 16 9" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse"
                  style={{ background: 'rgba(233,160,32,0.1)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#E9A020" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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
                    style={{ background: '#34d399', color: 'white' }}>4</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#6B7280' }}>
                    Step 4 of 4
                  </span>
                </div>
                <h2 className="text-[24px] font-semibold tracking-tight mb-4" style={{ color: '#1E2D3D' }}>
                  All set! Here&apos;s what we found:
                </h2>

                <div className="space-y-2 mb-6 text-left max-w-sm mx-auto">
                  {kdpFiles.length > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.75"/>
                        <polyline points="8 12 11 15 16 9" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>KDP Reports ({kdpFiles.length})</div>
                        <div className="text-[11px]" style={{ color: '#6B7280' }}>{kdpFiles.map(f => f.filename).join(', ')}</div>
                      </div>
                    </div>
                  )}
                  {metaFiles.length > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.06)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.75"/>
                        <polyline points="8 12 11 15 16 9" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Meta Ads ({metaFiles.length})</div>
                        <div className="text-[11px]" style={{ color: '#6B7280' }}>{metaFiles.map(f => f.filename).join(', ')}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: mlStatus === 'connected' ? 'rgba(52,211,153,0.06)' : 'rgba(56,189,248,0.06)' }}>
                    {mlStatus === 'connected' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.75"/>
                        <polyline points="8 12 11 15 16 9" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="9" stroke="#38bdf8" strokeWidth="1.75"/>
                        <line x1="12" y1="8" x2="12" y2="12" stroke="#38bdf8" strokeWidth="1.75" strokeLinecap="round"/>
                        <circle cx="12" cy="16" r="0.75" fill="#38bdf8"/>
                      </svg>
                    )}
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>MailerLite</div>
                      <div className="text-[11px]" style={{ color: '#6B7280' }}>
                        {mlStatus === 'connected' ? mlMessage : 'Not connected — you can add it later in Settings'}
                      </div>
                    </div>
                  </div>
                  {kdpFiles.length === 0 && metaFiles.length === 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.06)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="#fbbf24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>No files uploaded</div>
                        <div className="text-[11px]" style={{ color: '#6B7280' }}>You can upload files anytime from the Upload page</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={kdpFiles.length > 0 || metaFiles.length > 0 ? runAnalysis : () => router.push('/dashboard?upload=1')}
                  className="px-8 py-3.5 rounded-xl text-[16px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
                  style={{ background: '#e9a020', color: '#0d1f35' }}
                >
                  {kdpFiles.length > 0 || metaFiles.length > 0 ? 'Show me my dashboard →' : 'Go to Upload page →'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
