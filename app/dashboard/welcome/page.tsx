'use client'
// app/dashboard/welcome/page.tsx — Post-signup profile + integrations onboarding
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GENRES: { category: string; subs: string[] }[] = [
  { category: 'Romance — Steamy', subs: ['Contemporary', 'Dark Romance', 'Billionaire', 'Sports', 'Mafia', 'Second Chance', 'Age Gap', 'Reverse Harem', 'Enemies to Lovers', 'Small Town'] },
  { category: 'Romance — Clean & Wholesome', subs: ['Sweet Romance', 'Inspirational', 'Amish', 'Wholesome Contemporary', 'Christian Romance'] },
  { category: 'Mystery / Thriller / Suspense', subs: ['Cozy Mystery', 'Psychological Thriller', 'Crime Fiction', 'Suspense', 'Legal Thriller', 'Domestic Thriller'] },
  { category: 'Fantasy & Paranormal', subs: ['Urban Fantasy', 'Paranormal Romance', 'Epic Fantasy', 'Fairy Tale Retelling', 'Shifter Romance', 'Romantasy'] },
  { category: 'Sci-Fi', subs: ['Space Opera', 'Dystopian', 'Alien Romance', 'Time Travel', 'Cyberpunk'] },
  { category: 'Nonfiction', subs: ['Self-Help', 'Memoir', 'Business', 'Craft / Writing', 'Health & Wellness'] },
  { category: 'Other', subs: [] },
]

const REFERRALS = [
  'Facebook / Instagram',
  'Fiction Publishing Academy (FPA)',
  'A friend told me',
  'Google search',
  'Other',
]

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 state
  const [penName, setPenName] = useState('')
  const [category, setCategory] = useState('')
  const [subgenre, setSubgenre] = useState('')
  const [referral, setReferral] = useState('')
  const [saving, setSaving] = useState(false)

  // Step 2 state
  const [mailerLiteKey, setMailerLiteKey] = useState('')
  const [mlSaved, setMlSaved] = useState(false)
  const [mlSaving, setMlSaving] = useState(false)
  const [mlError, setMlError] = useState('')

  const selectedGenre = GENRES.find(g => g.category === category)
  const canSubmitStep1 = penName.trim().length > 0 && category

  async function handleStep1() {
    if (!canSubmitStep1) return
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penName: penName.trim(),
          genreCategory: category,
          genreSubgenre: subgenre || null,
          referralSource: referral || null,
        }),
      })
      setStep(2)
    } catch {
      // still advance
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveMailerLite() {
    if (!mailerLiteKey.trim()) return
    setMlSaving(true)
    setMlError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailerLiteKey: mailerLiteKey.trim() }),
      })
      if (!res.ok) throw new Error('Save failed')
      setMlSaved(true)
      setMailerLiteKey('')
    } catch {
      setMlError('Could not save key — try again')
    } finally {
      setMlSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFF8F0' }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-[18px] mb-1" style={{ color: '#4A7290', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            Author<span style={{ color: '#E9A020' }}>Dash</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: 'white', border: '1px solid #EEEBE6', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#EEEBE6' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: step === 1 ? '50%' : '100%', background: '#E9A020' }} />
            </div>
            <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>Step {step} of 2</span>
          </div>

          {/* ─── STEP 1: Profile ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h1 className="text-[24px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
                Tell us a little about you
              </h1>
              <p className="text-[14px] mb-8" style={{ color: '#6B7280' }}>
                This helps us tailor your AI coaching insights to your genre, audience, and publishing goals.
              </p>

              {/* Pen Name */}
              <div className="mb-6">
                <label className="block text-[12px] font-medium uppercase mb-2" style={{ color: '#374151', letterSpacing: '0.5px' }}>
                  What name do you write under?
                </label>
                <input
                  type="text"
                  value={penName}
                  onChange={e => setPenName(e.target.value)}
                  placeholder="e.g. Elle Wilder"
                  className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all focus:ring-2 focus:ring-amber-200"
                  style={{ border: '1px solid #EEEBE6', color: '#1E2D3D' }}
                />
              </div>

              {/* Genre Category */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium uppercase mb-2" style={{ color: '#374151', letterSpacing: '0.5px' }}>
                  Primary genre
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g.category}
                      onClick={() => { setCategory(g.category); setSubgenre('') }}
                      className="px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                      style={{
                        background: category === g.category ? '#E9A020' : 'white',
                        color: category === g.category ? 'white' : '#1E2D3D',
                        border: `1px solid ${category === g.category ? '#E9A020' : '#EEEBE6'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {g.category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-genre */}
              {selectedGenre && selectedGenre.subs.length === 0 && (
                <div className="mb-6">
                  <label className="block text-[12px] font-medium uppercase mb-2" style={{ color: '#374151', letterSpacing: '0.5px' }}>
                    What genre do you write?
                  </label>
                  <input
                    type="text"
                    value={subgenre}
                    onChange={e => setSubgenre(e.target.value)}
                    placeholder="e.g. Historical Fiction, Horror, LitRPG"
                    className="w-full px-4 py-3 rounded-lg text-[14px] outline-none transition-all focus:ring-2 focus:ring-amber-200"
                    style={{ border: '1px solid #EEEBE6', color: '#1E2D3D' }}
                  />
                </div>
              )}
              {selectedGenre && selectedGenre.subs.length > 0 && (
                <div className="mb-6">
                  <label className="block text-[12px] font-medium uppercase mb-2" style={{ color: '#374151', letterSpacing: '0.5px' }}>
                    Sub-genre (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGenre.subs.map(s => (
                      <button
                        key={s}
                        onClick={() => setSubgenre(subgenre === s ? '' : s)}
                        className="px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-all"
                        style={{
                          background: subgenre === s ? '#E9A020' : '#FFF8F0',
                          color: subgenre === s ? 'white' : '#1E2D3D',
                          border: `0.5px solid ${subgenre === s ? '#E9A020' : '#EEEBE6'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral */}
              <div className="mb-8">
                <label className="block text-[12px] font-medium uppercase mb-2" style={{ color: '#374151', letterSpacing: '0.5px' }}>
                  How did you hear about us? <span style={{ color: '#6B7280' }}>(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {REFERRALS.map(r => (
                    <button
                      key={r}
                      onClick={() => setReferral(referral === r ? '' : r)}
                      className="px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-all"
                      style={{
                        background: referral === r ? '#1E2D3D' : '#FFF8F0',
                        color: referral === r ? 'white' : '#1E2D3D',
                        border: `0.5px solid ${referral === r ? '#1E2D3D' : '#EEEBE6'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStep1}
                disabled={!canSubmitStep1 || saving}
                className="w-full py-3.5 rounded-xl text-[15px] font-bold transition-all disabled:opacity-40"
                style={{
                  background: canSubmitStep1 ? '#E9A020' : '#EEEBE6',
                  color: canSubmitStep1 ? '#0d1f35' : '#6B7280',
                  border: 'none',
                  cursor: canSubmitStep1 ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Saving...' : 'Next: Connect your tools →'}
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full mt-3 text-[12px] font-medium bg-transparent border-none cursor-pointer"
                style={{ color: '#6B7280' }}
              >
                I&apos;ll do this later
              </button>
            </>
          )}

          {/* ─── STEP 2: Integrations ─────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h1 className="text-[24px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
                Connect your tools
              </h1>
              <p className="text-[14px] mb-8" style={{ color: '#6B7280' }}>
                Connect your email list and ad account to unlock your full dashboard. You can always do this later in Settings.
              </p>

              {/* MailerLite */}
              <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid #EEEBE6', background: mlSaved ? 'rgba(110,191,139,0.04)' : 'white' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: 'rgba(52,211,153,0.1)' }}>📧</div>
                  <div className="flex-1">
                    <div className="text-[14px] font-bold" style={{ color: '#1E2D3D' }}>MailerLite</div>
                    <div className="text-[11.5px]" style={{ color: '#6B7280' }}>Email list size, open rates, automations</div>
                  </div>
                  {mlSaved && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(110,191,139,0.12)', color: '#6EBF8B' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#6EBF8B' }} />
                      Connected
                    </span>
                  )}
                </div>
                {!mlSaved && (
                  <>
                    <input
                      type="password"
                      value={mailerLiteKey}
                      onChange={e => setMailerLiteKey(e.target.value)}
                      placeholder="Paste your MailerLite API key…"
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] font-mono outline-none mb-2"
                      style={{ border: '1px solid #EEEBE6', color: '#1E2D3D', background: '#FAFAF9' }}
                    />
                    {mlError && <p className="text-[12px] mb-2" style={{ color: '#F97B6B' }}>{mlError}</p>}
                    <p className="text-[11px] mb-3" style={{ color: '#9CA3AF' }}>
                      MailerLite → Integrations → API → Create token
                    </p>
                    <button
                      onClick={handleSaveMailerLite}
                      disabled={!mailerLiteKey.trim() || mlSaving}
                      className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40"
                      style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
                    >
                      {mlSaving ? 'Saving…' : 'Save Key'}
                    </button>
                  </>
                )}
              </div>

              {/* Meta Ads */}
              <div className="rounded-xl p-5 mb-8" style={{ border: '1px solid #EEEBE6', background: 'white' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: 'rgba(96,165,250,0.1)' }}>📣</div>
                  <div className="flex-1">
                    <div className="text-[14px] font-bold" style={{ color: '#1E2D3D' }}>Meta Ads</div>
                    <div className="text-[11.5px]" style={{ color: '#6B7280' }}>CTR, CPC, spend — synced daily automatically</div>
                  </div>
                  <a
                    href="/api/meta/connect"
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold no-underline transition-all hover:opacity-90"
                    style={{ background: '#60A5FA', color: 'white' }}
                  >
                    Connect →
                  </a>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3.5 rounded-xl text-[15px] font-bold transition-all"
                style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
              >
                Go to my dashboard →
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full mt-3 text-[12px] font-medium bg-transparent border-none cursor-pointer"
                style={{ color: '#6B7280' }}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
