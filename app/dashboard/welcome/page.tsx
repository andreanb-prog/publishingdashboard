'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BoutiqueButton, BoutiqueInput, BoutiqueProgressBar, BoutiqueStatusChip } from '@/components/boutique'

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

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
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')
  const [step, setStep] = useState<1 | 2>(1)

  const [penName, setPenName] = useState('')
  const [category, setCategory] = useState('')
  const [subgenre, setSubgenre] = useState('')
  const [referral, setReferral] = useState('')
  const [saving, setSaving] = useState(false)

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

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#D97706' : 'white',
    color: active ? 'white' : '#1E2D3D',
    border: `1px solid ${active ? '#D97706' : '#E8E1D3'}`,
    borderRadius: 2,
    padding: '6px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    cursor: 'pointer',
  })

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F1E6' }}>
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <div className="text-[18px] mb-1" style={{ color: '#4A7290', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
            Author<span style={{ color: '#D97706' }}>Dash</span>
          </div>
        </div>

        {/* Hero card — 0 radius, no shadow */}
        <div style={{ background: 'white', border: '1px solid #E8E1D3', borderRadius: 0, padding: 32 }}>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <BoutiqueProgressBar
              value={step === 1 ? 50 : 100}
              showLabel={false}
              height={4}
              style={{ flex: 1 }}
            />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
              Step {step} of 2
            </span>
          </div>

          {/* STEP 1: Profile */}
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: '#1E2D3D', marginBottom: 8 }}>
                Tell us a little about you
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
                This helps us tailor your AI coaching insights to your genre, audience, and publishing goals.
              </p>

              <BoutiqueInput
                label="What name do you write under?"
                value={penName}
                onChange={e => setPenName(e.target.value)}
                placeholder="e.g. Elle Wilder"
                style={{ marginBottom: 24 }}
              />

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 8 }}>
                  Primary genre
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g.category}
                      onClick={() => { setCategory(g.category); setSubgenre('') }}
                      style={toggleStyle(category === g.category)}
                    >
                      {g.category}
                    </button>
                  ))}
                </div>
              </div>

              {selectedGenre && selectedGenre.subs.length === 0 && (
                <BoutiqueInput
                  label="What genre do you write?"
                  value={subgenre}
                  onChange={e => setSubgenre(e.target.value)}
                  placeholder="e.g. Historical Fiction, Horror, LitRPG"
                  style={{ marginBottom: 24 }}
                />
              )}
              {selectedGenre && selectedGenre.subs.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 8 }}>
                    Sub-genre (optional)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedGenre.subs.map(s => (
                      <button
                        key={s}
                        onClick={() => setSubgenre(subgenre === s ? '' : s)}
                        style={toggleStyle(subgenre === s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 8 }}>
                  How did you hear about us? <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REFERRALS.map(r => (
                    <button
                      key={r}
                      onClick={() => setReferral(referral === r ? '' : r)}
                      style={toggleStyle(referral === r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <BoutiqueButton
                variant="amber"
                onClick={handleStep1}
                disabled={!canSubmitStep1 || saving}
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
              >
                {saving ? 'Saving...' : 'Next: Connect your tools →'}
              </BoutiqueButton>

              <button
                onClick={() => router.push('/dashboard')}
                style={{ display: 'block', width: '100%', marginTop: 12, fontSize: 12, fontFamily: 'var(--font-sans)', color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                I&apos;ll do this later
              </button>
            </>
          )}

          {/* STEP 2: Integrations */}
          {step === 2 && (
            <>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: '#1E2D3D', marginBottom: 8 }}>
                Connect your tools
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
                Connect your email list and ad account to unlock your full dashboard. You can always do this later in Settings.
              </p>

              {/* MailerLite */}
              <div style={{
                border: mlSaved ? '1px solid rgba(110,191,139,0.3)' : '1px solid #E8E1D3',
                borderRadius: 0,
                background: mlSaved ? 'rgba(110,191,139,0.04)' : 'white',
                padding: 20,
                marginBottom: 16,
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div style={{
                    width: 36, height: 36,
                    border: '1px solid #E8E1D3',
                    borderRadius: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: '#6EBF8B', fontWeight: 600 }}>M</span>
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: '#1E2D3D' }}>MailerLite</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: '#6B7280' }}>Email list size, open rates, automations</div>
                  </div>
                  {mlSaved && <BoutiqueStatusChip tone="green" label="Connected" />}
                </div>
                {!mlSaved && (
                  <>
                    <BoutiqueInput
                      type="password"
                      mono
                      value={mailerLiteKey}
                      onChange={e => setMailerLiteKey(e.target.value)}
                      placeholder="Paste your MailerLite API key…"
                      style={{ marginBottom: 8 }}
                    />
                    {mlError && <p style={{ fontSize: 12, color: '#F97B6B', marginBottom: 8, fontFamily: 'var(--font-sans)' }}>{mlError}</p>}
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                      MailerLite → Integrations → API → Create token
                    </p>
                    <BoutiqueButton
                      variant="amber"
                      onClick={handleSaveMailerLite}
                      disabled={!mailerLiteKey.trim() || mlSaving}
                    >
                      {mlSaving ? 'Saving…' : 'Save Key'}
                    </BoutiqueButton>
                  </>
                )}
              </div>

              {/* Meta Ads */}
              <div style={{
                border: '1px solid #E8E1D3',
                borderRadius: 0,
                background: 'white',
                padding: 20,
                marginBottom: 32,
              }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 36, height: 36,
                    border: '1px solid #E8E1D3',
                    borderRadius: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: '#60A5FA', fontWeight: 600 }}>f</span>
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: '#1E2D3D' }}>Meta Ads</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: '#6B7280' }}>CTR, CPC, spend — synced daily automatically</div>
                  </div>
                  <a href="/api/meta/connect">
                    <BoutiqueButton variant="primary">Connect →</BoutiqueButton>
                  </a>
                </div>
              </div>

              <BoutiqueButton
                variant="amber"
                onClick={() => router.push('/dashboard')}
                style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
              >
                Go to my dashboard →
              </BoutiqueButton>

              <button
                onClick={() => setStep(1)}
                style={{ display: 'block', width: '100%', marginTop: 12, fontSize: 12, fontFamily: 'var(--font-sans)', color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer' }}
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
