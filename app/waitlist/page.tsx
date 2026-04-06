'use client'

import { useState } from 'react'
import Link from 'next/link'

const PAIN_POINTS = [
  { emoji: '📥', text: 'Downloading your KDP report into a spreadsheet you never quite finish building' },
  { emoji: '🔀', text: 'Jumping between Meta Ads Manager, MailerLite, and KDP just to understand one week' },
  { emoji: '🔄', text: "Running newsletter swaps with no idea if they're actually growing your list" },
  { emoji: '💸', text: 'Spending on ads without knowing your real return on investment' },
  { emoji: '🌫️', text: 'Getting insights that are vibes — not your actual numbers' },
  { emoji: '🔇', text: 'Making decisions blind because none of your tools talk to each other' },
]

const FEATURES = [
  {
    emoji: '📊',
    title: 'KDP Integration',
    desc: 'Upload your sales report and instantly see units sold, KENP reads, estimated KU revenue, and reader depth — broken out by title.',
  },
  {
    emoji: '📣',
    title: 'Ad Performance',
    desc: 'Connect your ad account and see CTR, CPC, spend, and ROAS with benchmarks built for authors and publishers.',
  },
  {
    emoji: '📧',
    title: 'Email List Health',
    desc: 'List size, open rate, click rate, and automation health — without logging into another platform.',
  },
  {
    emoji: '🔄',
    title: 'Swap Tracking',
    desc: 'See how your newsletter swap activity connects to list growth and sales over time.',
  },
  {
    emoji: '🤖',
    title: 'AI Daily Action Plan',
    desc: "Every morning: what to Scale, Fix, Cut, and Test Next — based on your actual data, not someone else's best practices.",
  },
]

function WaitlistForm({ shared }: { shared: { submitted: boolean; setSubmitted: (v: boolean) => void } }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        shared.setSubmitted(true)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (shared.submitted) {
    return (
      <p className="text-base font-medium text-center py-4" style={{ color: '#6EBF8B' }}>
        You&apos;re on the list. We&apos;ll be in touch when beta opens. 🎉
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto mt-8">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        required
        className="w-full rounded-lg py-3 px-4 text-sm outline-none mb-3"
        style={{
          background: '#FFF8F0',
          border: '1.5px solid #1E2D3D',
          color: '#1E2D3D',
        }}
      />
      {error && (
        <p className="text-xs mb-2" style={{ color: '#F97B6B' }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg py-3 font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: '#E9A020', color: '#1E2D3D' }}
      >
        {loading ? 'Adding you...' : 'Join the Waitlist →'}
      </button>
      <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
        No pricing. No commitment. Just your spot in line.
      </p>
    </form>
  )
}

export default function WaitlistPage() {
  const [submitted, setSubmitted] = useState(false)
  const sharedState = { submitted, setSubmitted }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#FFF8F0' }}>

      {/* Rainbow top band */}
      <div style={{
        height: '5px',
        background: 'linear-gradient(to right, #F97B6B, #F4A261, #E9A020, #6EBF8B, #5BBFB5)',
      }} />

      {/* SECTION 1 — HERO */}
      <section style={{ background: '#ffffff' }}>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <span
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-6"
            style={{ color: '#E9A020', border: '1px solid #E9A020' }}
          >
            Coming Soon
          </span>

          <h1
            className="font-bold leading-tight mb-5"
            style={{
              color: '#1E2D3D',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(32px, 5vw, 56px)',
            }}
          >
            Finally see how everything plays together.
          </h1>

          <p
            className="font-light max-w-xl mx-auto mb-4"
            style={{ color: '#6B7280', fontSize: '18px', lineHeight: '1.7' }}
          >
            Your KDP sales. Your ad performance. Your email list. Your swaps. One dashboard. One daily action plan.
          </p>

          <p
            className="max-w-lg mx-auto"
            style={{ color: '#9CA3AF', fontSize: '15px', lineHeight: '1.7' }}
          >
            AuthorDash is built for indie authors and publishers who want to run a real business — not just publish and pray.
          </p>

          <WaitlistForm shared={sharedState} />
        </div>
      </section>

      {/* SECTION 2 — IDENTITY */}
      <section style={{ background: '#FFF8F0' }}>
        <div className="max-w-2xl mx-auto px-6 py-16">
          <p className="text-xs font-bold tracking-widest uppercase mb-8" style={{ color: '#E9A020' }}>
            Sound familiar?
          </p>
          <div className="space-y-5" style={{ color: '#1E2D3D', fontSize: '17px', lineHeight: '1.8' }}>
            <p>I&apos;ve noticed there are two kinds of indie authors and publishers.</p>
            <p>
              Those who publish a book, run some promotions, and check the numbers across four different tabs —
              stitching together something in Claude or ChatGPT, a spreadsheet here, a dashboard there — doing their
              best to make a Frankenstein system work. And honestly? That resourcefulness is real. That&apos;s what
              building something from scratch looks like.
            </p>
            <p>
              And then there are those who actually know their business. They know what&apos;s driving sales. They know
              which channels are working. They make decisions from data, not gut feelings.
            </p>
            <p className="font-medium" style={{ color: '#E9A020' }}>
              Most of us start in the first camp. AuthorDash is built to move you into the second.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — PAIN POINTS */}
      <section style={{ background: '#ffffff' }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-semibold text-center mb-10" style={{ color: '#1E2D3D' }}>
            Everything lives somewhere different.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAIN_POINTS.map(({ emoji, text }) => (
              <div
                key={text}
                className="flex gap-4 items-start rounded-xl p-6"
                style={{
                  background: '#ffffff',
                  border: '0.5px solid #E5E7EB',
                  borderLeft: '3px solid #F97B6B',
                }}
              >
                <span className="text-xl flex-shrink-0">{emoji}</span>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — FEATURES */}
      <section style={{ background: '#FFF8F0' }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-semibold text-center mb-2" style={{ color: '#1E2D3D' }}>
            One dashboard. Total clarity.
          </h2>
          <p className="text-center mb-10" style={{ color: '#6B7280', fontSize: '15px' }}>
            Everything connected. Every morning, a plan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-6"
                style={{ background: '#ffffff', border: '0.5px solid #E5E7EB' }}
              >
                <span className="text-2xl block mb-3">{emoji}</span>
                <p className="font-semibold mb-2 text-sm" style={{ color: '#1E2D3D' }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — FOUNDER QUOTE */}
      <section style={{ background: '#1E2D3D' }}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <blockquote
            className="text-2xl leading-relaxed mb-6"
            style={{
              color: '#ffffff',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
            }}
          >
            &ldquo;I built this for myself first. Then I showed it to a few other authors and publishers — and the
            response was always the same: &lsquo;I need this.&rsquo;&rdquo;
          </blockquote>
          <p className="text-sm font-medium" style={{ color: '#E9A020' }}>
            — Andrea Bonilla, indie author and publisher
          </p>
        </div>
      </section>

      {/* SECTION 6 — WAITLIST CTA */}
      <section style={{ background: '#E9A020' }}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-8" style={{ color: '#1E2D3D' }}>
            Be one of the first in.
          </h2>
          <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
            {[
              'First access before public launch',
              'Founding member pricing locked in for life',
              'Direct input on features before they\'re built',
            ].map(benefit => (
              <p key={benefit} className="font-medium text-base flex items-start gap-2" style={{ color: '#1E2D3D' }}>
                <span className="flex-shrink-0">✓</span>
                {benefit}
              </p>
            ))}
          </div>
          <WaitlistForm shared={sharedState} />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #E5E7EB' }}>
        <div className="max-w-2xl mx-auto px-6 py-8 text-center">
          <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>
            Built by an indie author and publisher, for indie authors and publishers.
          </p>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            Made with love for your publishing journey. — Andrea Bonilla
          </p>
          <div className="flex items-center justify-center gap-4 text-sm" style={{ color: '#9CA3AF' }}>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
