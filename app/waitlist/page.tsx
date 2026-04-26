'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Shared form component ────────────────────────────────────────────────────

function WaitlistForm({
  submitted,
  onSuccess,
  buttonText = 'Reserve Your Spot →',
  successMsg = "You're on the list. We'll be in touch when beta opens. 🎉",
}: {
  submitted: boolean
  onSuccess: () => void
  buttonText?: string
  successMsg?: string
}) {
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
        onSuccess()
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <p className="text-base font-medium text-center py-4" style={{ color: '#6EBF8B' }}>
        {successMsg}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        required
        className="w-full rounded-lg py-3 px-4 text-sm outline-none mb-1"
        style={{ background: '#FFF8F0', border: '1.5px solid #1E2D3D', color: '#1E2D3D' }}
      />
      {error && (
        <p className="text-xs mb-2" style={{ color: '#F97B6B' }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg py-3 font-bold text-sm mt-2 transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: '#E9A020', color: '#1E2D3D' }}
      >
        {loading ? 'Adding you...' : buttonText}
      </button>
    </form>
  )
}

// ─── Pull quote ───────────────────────────────────────────────────────────────

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-medium text-lg pl-4 my-6"
      style={{ borderLeft: '3px solid #E9A020', color: '#1E2D3D' }}
    >
      {children}
    </p>
  )
}

// ─── Amber divider ────────────────────────────────────────────────────────────

function AmberDivider() {
  return (
    <div className="max-w-xs mx-auto mt-10 mb-10" style={{ height: '1px', background: '#E9A020' }} />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: '📊',
    title: 'KDP Sales and Royalties',
    desc: "Upload your KDP report as often as works for you — daily, weekly, monthly. Unfortunately Amazon doesn't play well with others, so we still have to do a little work to play. Once it's in, AuthorDash breaks it down by title: units sold, KENP reads, estimated KU revenue, and reader depth. You bring the data. AuthorDash does the rest.",
  },
  {
    emoji: '📣',
    title: 'Ad Performance',
    desc: 'Connect your Meta ad account and see CTR, CPC, spend, and ROAS with benchmarks built for authors and publishers. No manual export required.',
  },
  {
    emoji: '📧',
    title: 'Email List Health',
    desc: 'Connect your MailerLite account and see list size, open rate, click rate, and automation health in one view.',
  },
  {
    emoji: '🔄',
    title: 'Swap Intelligence',
    desc: 'Log your newsletter swaps and see how they connect to list growth and sales over time. Know what is actually worth the effort.',
  },
  {
    emoji: '🤖',
    title: 'Your AuthorDash Daily Action Plan',
    desc: 'Every morning, AuthorDash reads your connected data and gives you a plain-English plan. What to Scale. What to Fix. What to Cut. What to Test Next. For your specific business, not a generic best practice list.',
  },
]

const BODY_STYLE = { color: '#1E2D3D', fontSize: '17px', lineHeight: '1.85' }

export default function WaitlistPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: '#ffffff', fontFamily: "var(--font-sans)" }}>

      {/* Top band */}
      <div style={{
        height: '6px',
        background: 'linear-gradient(to right, #F97B6B, #F4A261, #E9A020, #6EBF8B, #5BBFB5)',
      }} />

      {/* ── SECTION 1 — HERO ─────────────────────────────────────────── */}
      <section style={{ background: '#ffffff' }}>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8"
            style={{ color: '#E9A020', border: '1px solid #E9A020' }}
          >
            Coming Soon
          </span>

          <h1
            className="font-bold leading-tight mb-6 mx-auto"
            style={{
              color: '#1E2D3D',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(32px, 5vw, 54px)',
              maxWidth: '820px',
            }}
          >
            The only dashboard that sees your whole publishing business. Not just one piece of it.
          </h1>

          <p
            className="font-light max-w-xl mx-auto mb-4"
            style={{ color: '#6B7280', fontSize: '18px', lineHeight: '1.75' }}
          >
            KDP. Meta Ads. Your email list. Your newsletter swaps. Finally in one place, with an AuthorDash daily plan that tells you what to do about it.
          </p>

          <p className="text-sm mt-8 mb-4" style={{ color: '#9CA3AF' }}>
            For independent authors and publishers who are serious about their business.
          </p>

          <div className="mt-4">
            <WaitlistForm submitted={submitted} onSuccess={() => setSubmitted(true)} />
            {!submitted && (
              <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
                No pricing. No commitment. Just your spot in line.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION 2 — IDENTITY + STORY ─────────────────────────────── */}
      <section style={{ background: '#FFF8F0' }}>
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="space-y-5" style={BODY_STYLE}>
            <p>
              Most independent authors and publishers are running their business the way I was running mine, scared, resourcefully and scrappy. When you&apos;re starting out and learning how to be a publisher, adding in all of these different elements can feel overwhelming very quickly. So you build what you can. A spreadsheet here. A Claude prompt there. Four tabs open at once. You make it work.
            </p>
            <p>
              But at some point making it work starts to cost you. Not in a dramatic way. Just that quiet background hum of not quite knowing. Is this working? Am I missing something? Where is the growth actually coming from?
            </p>
            <p>
              When I decided to build AuthorDash, I really wanted to scale my business with confidence. And I knew I couldn&apos;t do that without seeing my data and how everything works together clearly first.
            </p>
            <p>
              Maybe you&apos;re in that same place. AuthorDash is for the independent author and publisher who is ready to grow.
            </p>
          </div>

          <AmberDivider />

          <p className="text-sm text-center mb-8" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
            From: Andrea Bonilla — Independent author and publisher. Hilo, Hawaii.
          </p>

          <div className="space-y-5" style={BODY_STYLE}>
            <p>I remember lying in bed one night, unable to sleep.</p>
            <p>
              Not because I hadn&apos;t done the work. I had. I was running Meta ads, doing BookClicker swaps, sending emails to my list, uploading my KDP reports every week. I had the marketing experience from my past life. I had systems. Claude for triage, Notion for tracking, MailerLite for my list. I had built something that worked.
            </p>
            <p>But I still had this low-level fear that wouldn&apos;t go away.</p>
          </div>

          <p className="font-medium text-xl mt-6 mb-2" style={{ color: '#1E2D3D' }}>
            What am I missing?
          </p>

          <div className="space-y-5 mt-4" style={BODY_STYLE}>
            <p>
              Not a dramatic failure. Just the quiet, nagging dread that something was slipping through the cracks. A swap I was supposed to send. An ad I should have paused. A trend I couldn&apos;t see because the data was scattered across five different places that never talked to each other.
            </p>
            <p>
              For me, publishing isn&apos;t just a hobby. It&apos;s a business I&apos;m building and a reputation I care about. When I commit to a swap partner, I want to deliver. When I spend money on ads, I want to know if it&apos;s working. When my list grows, I want to know why. And when I set a publishing date or a pre-order, I want to know I&apos;m going to make it with confidence, not stressing until the last minute.
            </p>
            <p>I couldn&apos;t get any of that from four tabs and a half-built spreadsheet.</p>
            <p>
              So I built AuthorDash. First just for myself. A single place where all of it lived together and an AuthorDash plan that looked at all of it and told me what to do today.
            </p>
            <p>Then I showed it to a few other authors and publishers. The response was immediate.</p>
          </div>

          <PullQuote>I need this. Need this, like yesterday!</PullQuote>
        </div>
      </section>

      {/* ── SECTION 3 — THE PROBLEM ──────────────────────────────────── */}
      <section style={{ background: '#ffffff' }}>
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="space-y-5" style={BODY_STYLE}>
            <p>Right now, every tool you use shows you one thing.</p>
            <p>
              Your KDP dashboard shows you sales. Your ad platform shows you clicks. Your email tool shows you open rates. BookClicker shows you your swap calendar.
            </p>
            <p>
              It&apos;s like having four pictures on your wall. A dog. A bus. A bunch of grapes. A woman sitting at a window.
            </p>
            <p>
              Each one is accurate. Each one is real. But you&apos;re the one who has to hold all four images in your head, carry them to a new spreadsheet, and try to build something useful out of the pieces.
            </p>
          </div>

          <PullQuote>
            What nobody&apos;s showing you is that the dog is chasing the bus while the woman at the window watches it all happen and eats her grapes.
          </PullQuote>

          <div className="space-y-5" style={BODY_STYLE}>
            <p>That&apos;s the picture you&apos;re missing.</p>
            <p>
              Your swap went out Tuesday. Your ad was running the same week. Your list grew 47 people. Which one moved the needle? Without everything in the same frame, you&apos;re not analyzing your business. You&apos;re just remembering pictures.
            </p>
          </div>

          <AmberDivider />

          <div className="space-y-5" style={BODY_STYLE}>
            <p>Every other tool gives you an isolated view. One channel. One metric. One slice.</p>
            <p>
              AuthorDash gives you the full picture with you in the driver&apos;s seat. A cross-channel view that connects your KDP data (the report you export and upload), your ad performance, your email list, and your swap activity, and then shows you the relationships between them. When something moves, you see why. When something isn&apos;t working, you know what to fix.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — FEATURES ─────────────────────────────────────── */}
      <section style={{ background: '#FFF8F0' }}>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-center mb-2" style={{ color: '#E9A020' }}>
            What&apos;s inside
          </p>
          <h2 className="text-2xl font-semibold text-center mb-10" style={{ color: '#1E2D3D' }}>
            One dashboard. Total clarity.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-6"
                style={{ background: '#ffffff', border: '1px solid #E5E7EB' }}
              >
                <span className="text-2xl block mb-3">{emoji}</span>
                <p className="font-bold text-sm mb-2" style={{ color: '#1E2D3D' }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — PROOF ────────────────────────────────────────── */}
      <section style={{ background: '#1E2D3D' }}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#E9A020' }}>
            Founding member
          </p>
          <p
            className="font-light italic text-lg mb-3"
            style={{ color: '#ffffff', lineHeight: '1.8' }}
          >
            &ldquo;I&apos;m an excited camper to go play with this this evening.&rdquo;
          </p>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#E9A020' }}>
            Then after she used it:
          </p>
          <p
            className="font-medium italic text-xl"
            style={{ color: '#ffffff', lineHeight: '1.8' }}
          >
            &ldquo;What you&apos;ve put together is phenomenal.&rdquo;
          </p>
          <p className="text-sm mt-4" style={{ color: '#E9A020' }}>
            — K.M., founding member
          </p>
        </div>
      </section>

      {/* ── SECTION 6 — WAITLIST CTA ─────────────────────────────────── */}
      <section style={{ background: '#E9A020' }}>
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#1E2D3D' }}>
            Be one of the first in.
          </h2>
          <div className="space-y-2 mb-8 text-left max-w-xs mx-auto mt-6">
            {[
              'First access before public launch',
              'Pricing locked in for life',
              "Direct input on features before they're built",
              'Personal onboarding from me',
            ].map(b => (
              <p key={b} className="font-medium flex items-start gap-2 text-base" style={{ color: '#1E2D3D' }}>
                <span className="flex-shrink-0">✓</span>{b}
              </p>
            ))}
          </div>
          <WaitlistForm
            submitted={submitted}
            onSuccess={() => setSubmitted(true)}
            successMsg="You're on the list. We'll be in touch. 🎉"
          />
          {!submitted && (
            <p className="text-xs text-center mt-3" style={{ color: '#1E2D3D', opacity: 0.6 }}>
              No pricing. No commitment. Just your spot in line.
            </p>
          )}
        </div>
      </section>

      {/* ── SECTION 7 — CLOSE ────────────────────────────────────────── */}
      <section style={{ background: '#ffffff' }}>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p style={{ ...BODY_STYLE, maxWidth: '560px', margin: '0 auto' }}>
            I built this because I was tired of the fear that I was missing something. I wanted to wake up and know. Not guess. Not hope. Know that my business was being run the way it deserved to be run. That&apos;s what AuthorDash gives you. One place. The full picture. Every morning.
          </p>
          <p className="font-medium mt-6" style={{ color: '#1E2D3D' }}>Andrea Bonilla</p>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
            Independent author and publisher
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #E5E7EB' }}>
        <div className="max-w-2xl mx-auto px-6 py-8 text-center">
          <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>
            Built by an independent author and publisher, for independent authors and publishers.
          </p>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            Made with love for your publishing journey.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm" style={{ color: '#9CA3AF' }}>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
