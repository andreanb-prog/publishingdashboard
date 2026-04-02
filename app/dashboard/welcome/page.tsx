'use client'
// app/dashboard/welcome/page.tsx — Post-signup profile collection
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GENRES: { category: string; subs: string[] }[] = [
  { category: 'Romance — Steamy', subs: ['Contemporary', 'Dark Romance', 'Billionaire', 'Sports', 'Mafia', 'Second Chance', 'Age Gap', 'Reverse Harem'] },
  { category: 'Romance — Clean', subs: ['Sweet Romance', 'Inspirational', 'Amish', 'Wholesome Contemporary'] },
  { category: 'Mystery / Thriller', subs: ['Cozy Mystery', 'Psychological Thriller', 'Crime Fiction', 'Suspense', 'Legal Thriller'] },
  { category: 'Fantasy / Paranormal', subs: ['Urban Fantasy', 'Paranormal Romance', 'Epic Fantasy', 'Fairy Tale Retelling', 'Shifter Romance'] },
  { category: 'Sci-Fi', subs: ['Space Opera', 'Dystopian', 'Alien Romance', 'Time Travel'] },
  { category: 'Other', subs: ['Literary Fiction', 'Horror', 'Historical Fiction', 'Non-Fiction', 'Other'] },
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
  const [penName, setPenName] = useState('')
  const [category, setCategory] = useState('')
  const [subgenre, setSubgenre] = useState('')
  const [referral, setReferral] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedGenre = GENRES.find(g => g.category === category)
  const canSubmit = penName.trim().length > 0 && category

  async function handleSubmit() {
    if (!canSubmit) return
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
      router.push('/dashboard')
    } catch {
      setSaving(false)
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

          <h1 className="text-[24px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
            Tell us a little about you
          </h1>
          <p className="text-[14px] mb-8" style={{ color: '#6B7280' }}>
            This helps us personalize your dashboard and coaching insights to your genre and goals.
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
              placeholder="Your pen name or author name"
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
          {selectedGenre && (
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

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold transition-all disabled:opacity-40"
            style={{
              background: canSubmit ? '#E9A020' : '#EEEBE6',
              color: canSubmit ? '#0d1f35' : '#6B7280',
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Setting up your dashboard...' : "Let's go →"}
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full mt-3 text-[12px] font-medium bg-transparent border-none cursor-pointer"
            style={{ color: '#6B7280' }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
