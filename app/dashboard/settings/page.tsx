'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect } from 'react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TestState = 'idle' | 'testing' | 'ok' | 'error'

function KeyField({
  label, hint, placeholder, value, onChange, saved,
}: {
  label: string; hint: string; placeholder: string
  value: string; onChange: (v: string) => void; saved: boolean
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#0d1f35] mb-1">{label}</label>
      <p className="text-[12px] text-stone-500 mb-2 leading-relaxed">{hint}</p>
      <div className="relative">
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={saved ? '••••••••••••••••••••' : placeholder}
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm font-mono
                     text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                     transition-colors duration-150 pr-24"
        />
        {saved && !value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold
                           px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#16a34a' }}>
            Saved ✓
          </span>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [mailerLiteKey, setMailerLiteKey] = useState('')
  const [claudeKey,     setClaudeKey]     = useState('')
  const [hasSavedML,    setHasSavedML]    = useState(false)
  const [hasSavedClaude,setHasSavedClaude]= useState(false)
  const [saveState,     setSaveState]     = useState<SaveState>('idle')
  const [testState,     setTestState]     = useState<TestState>('idle')
  const [testResult,    setTestResult]    = useState<string>('')

  // Load masked keys on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setHasSavedML(!!d.mailerLiteKey)
        setHasSavedClaude(!!d.claudeKey)
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!mailerLiteKey && !claudeKey) return
    setSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailerLiteKey: mailerLiteKey || undefined, claudeKey: claudeKey || undefined }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      if (mailerLiteKey) { setHasSavedML(true); setMailerLiteKey('') }
      if (claudeKey)     { setHasSavedClaude(true); setClaudeKey('') }
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  async function handleTest() {
    const keyToTest = mailerLiteKey.trim()
    if (!keyToTest) {
      setTestState('error')
      setTestResult('Paste your MailerLite key above first.')
      return
    }
    setTestState('testing')
    setTestResult('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-mailerlite', key: keyToTest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setTestState('ok')
      setTestResult(`Connected! Your list has ${data.listSize?.toLocaleString()} subscribers.`)
    } catch (err: unknown) {
      setTestState('error')
      setTestResult(err instanceof Error ? err.message : 'Could not connect — double-check your API key.')
    }
  }

  const canSave = !!(mailerLiteKey || claudeKey) && saveState !== 'saving'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-7">
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-1.5"
          style={{ color: '#e9a020' }}>
          Settings
        </div>
        <h1 className="font-serif text-[28px] text-[#0d1f35] leading-snug mb-1">
          Connect your accounts
        </h1>
        <p className="text-[13px] text-stone-500 leading-relaxed">
          Your API keys are stored privately and never shared. You only need to set these once.
        </p>
      </div>

      {/* MailerLite */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(52,211,153,0.1)' }}>📧</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">MailerLite</div>
            <div className="text-[11.5px] text-stone-400">Pulls your email stats automatically</div>
          </div>
        </div>

        <KeyField
          label="MailerLite API Key"
          hint="Go to MailerLite → Integrations → API → Create a new token. Paste it here."
          placeholder="ml_••••••••••••••••••••••••••"
          value={mailerLiteKey}
          onChange={setMailerLiteKey}
          saved={hasSavedML}
        />

        {/* Test connection */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleTest}
            disabled={testState === 'testing'}
            className="text-[12.5px] font-semibold px-4 py-2 rounded-lg border border-stone-200
                       text-stone-600 hover:bg-stone-50 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testState === 'testing' ? 'Checking...' : 'Test Connection'}
          </button>
          {testResult && (
            <span className={`text-[12px] font-semibold ${testState === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
              {testState === 'ok' ? '✓ ' : '✕ '}{testResult}
            </span>
          )}
        </div>
      </div>

      {/* Claude */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(233,160,32,0.1)' }}>🤖</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">Claude AI</div>
            <div className="text-[11.5px] text-stone-400">Powers your monthly coaching session</div>
          </div>
        </div>

        <KeyField
          label="Claude API Key"
          hint="Go to console.anthropic.com → API Keys → Create Key. Paste it here. It starts with sk-ant-."
          placeholder="sk-ant-••••••••••••••••••••"
          value={claudeKey}
          onChange={setClaudeKey}
          saved={hasSavedClaude}
        />

        <p className="text-[11.5px] text-stone-400 mt-3 leading-relaxed">
          Each analysis costs roughly $0.05–$0.15 from your Anthropic account.
          You control your own usage — we never charge you directly.
        </p>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="flex items-center gap-2 px-7 py-3 rounded-lg text-[14px] font-bold
                   transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#e9a020', color: '#0d1f35' }}
      >
        {saveState === 'saving' ? 'Saving...'
          : saveState === 'saved' ? '✓ Saved!'
          : saveState === 'error' ? 'Save failed — try again'
          : 'Save settings'}
      </button>

      {/* Help text */}
      <div className="mt-8 card p-5">
        <div className="text-[12.5px] font-bold text-[#0d1f35] mb-3">Need help finding your API keys?</div>
        <div className="space-y-2 text-[12px] text-stone-500 leading-relaxed">
          <div>
            <strong className="text-stone-700">MailerLite:</strong>{' '}
            Log in → click your name in the top right → Integrations → API → Developer API → Create new token
          </div>
          <div>
            <strong className="text-stone-700">Claude:</strong>{' '}
            Go to console.anthropic.com → sign up or log in → click API Keys in the left menu → Create Key
          </div>
        </div>
      </div>
    </div>
  )
}
