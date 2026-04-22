import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Free Resources — AuthorDash',
  description: 'Free tools and skills for indie romance authors.',
}

const SKILL_INTRO =
  'I want to set up the BookClicker newsletter swap triage skill. Here is the full skill — please read it, confirm you understand it, and walk me through setup so I can start running morning triage.\n\n'

const SKILL_TEXT = `---
name: newsletter-swap-triage
description: Use this skill whenever an indie author says run swap triage, check my BookClicker emails, what swaps do I need to send today, update my swap tracker, morning promo check, or any variation of checking/managing newsletter swap status.
---

# Newsletter Swap Triage Skill

## CORE CONCEPTS
Direction icons:
- Outbound (♥️): YOU are promoting their book. You must send.
- Inbound (📣): They are promoting YOUR book. They send, you receive.
Only outbound rows require action from you.

## STEP 0 — TODAY'S SENDS FIRST
Before touching Gmail, check tracker for outbound sends due today or tomorrow.
If link present and Approved: show full draft send at top. This is #1 priority.
If link MISSING: CRITICAL — draft partner request immediately.
If due tomorrow: confirm everything ready today.
If none due: state "No outbound sends due today or tomorrow." Then proceed.

## STEP 1 — GMAIL SCAN
Search simultaneously:
- from:no-reply@bookclicker.com subject:"Promo Confirmation"
- from:no-reply@bookclicker.com subject:"automatically cancelled"
- from:no-reply@bookclicker.com subject:"new booking"
- from:no-reply@bookclicker.com subject:"swap request has been accepted"
- from:messages@bookclicker.com
- from:bookfunnel.com
Read full email body for confirmations and cancellations.

## STEP 2 — CLASSIFY AND LOG
New booking: create tracker row with Campaign Name, Direction, Platform, Promo Date, List Size, Status Applied, Cost, Payment Type.
Swap accepted: flip status Applied → Approved.
Promo confirmation: update Clicks, Opens, List Size, save promo link.
Cancelled: flip to Cancelled, note date, flag in summary.
Partner message: flag to author with snippet, do not auto-act.

## STEP 5 — AUDIT NEXT 14 DAYS
CRITICAL: outbound due today with link → show draft immediately
CRITICAL: outbound due today, link missing → draft partner request
CRITICAL: outbound due tomorrow, link missing → too close to wait
Warning: outbound no link within 7 days
Warning: inbound still Applied within 3 days of promo date
Overdue: any row Applied with promo date passed

## STEP 7 — TRIAGE SUMMARY
Lead with today/tomorrow sends always. Then counts. Then needs attention. Then next upcoming promo.

## DRAFT TEMPLATES
Missing link: "Hi [Partner], just checking in on our swap for [Date]! Could you send the link for [book title]? Looking forward to it! [Your name]"
Your link: "Hi [Partner], here is my Amazon link for [your book] for our [Date] swap: [link]. [Your name]"
Unconfirmed: "Hi [Partner], I have our swap on [Date] on my calendar but it is still showing pending. Can you confirm? Thanks! [Your name]"

## SETUP
1. Add your pen name, book titles, and Amazon links to your tracker.
2. Set BookClicker inventory under My Lists > Set Your Inventory.
3. Connect Gmail in Claude settings.
4. Customize campaign name format for your setup.`

const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(SKILL_INTRO + SKILL_TEXT)}`

export default function FreeResourcesPage() {
  return (
    <div className={`${playfair.variable} min-h-screen font-sans`} style={{ background: '#FFF8F0' }}>

      {/* Rainbow top band */}
      <div style={{
        height: '5px',
        background: 'linear-gradient(to right, #F97B6B, #F4A261, #E9A020, #6EBF8B, #5BBFB5, #8B5CF6)',
      }} />

      {/* Hero */}
      <section style={{ background: '#ffffff' }}>
        <div className="max-w-2xl mx-auto px-6 py-14 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#E9A020' }}>
            ✦ Free Resource
          </p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5" style={{ color: '#1E2D3D' }}>
            Your BookClicker swap assistant — right inside Claude.
          </h1>
          <p className="text-lg leading-relaxed mb-6" style={{ color: '#374151' }}>
            Every morning, type one sentence. Claude tells you exactly which swaps you need to send today — and drafts them for you.
          </p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Shared by Andrea Bonilla
          </p>
        </div>
      </section>

      {/* Intro card */}
      <section className="max-w-2xl mx-auto px-6 py-8">
        <div className="rounded-2xl p-8 text-base leading-relaxed" style={{
          background: '#ffffff',
          border: '0.5px solid #E5E7EB',
          color: '#374151',
        }}>
          <p className="mb-4">
            Hi, I&apos;m Andrea. I write steamy romances and like a lot of authors and publishers out there, I run a lot of newsletter swaps through BookClicker and BookFunnel.
          </p>
          <p className="mb-4">
            For months I&apos;ve been overwhelmed with the amount of emails tracking what gets approved and what gets rejected — and it takes up way too much real estate in my brain. So I built this Claude skill to handle it every morning.
          </p>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            One PSA though: I still check my swaps manually just to make sure. I&apos;m still learning to use AI and trust it more.
          </p>
        </div>
      </section>

      {/* How to use it card */}
      <section className="max-w-2xl mx-auto px-6 py-2">
        <div className="rounded-2xl p-8 text-base leading-relaxed" style={{
          background: '#ffffff',
          border: '0.5px solid #E5E7EB',
          color: '#374151',
        }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: '#1E2D3D' }}>
            How to use it
          </h2>
          <div className="space-y-4">
            {[
              { n: '1', text: <>Open <strong style={{ color: '#1E2D3D' }}>Claude</strong> (claude.ai) — it&apos;s free to sign up.</> },
              { n: '2', text: <>Connect your Gmail inside Claude settings. This is how Claude reads your BookClicker emails.</> },
              { n: '3', text: <>Click the <strong style={{ color: '#1E2D3D' }}>&ldquo;Open in Claude — skill pre-loaded&rdquo;</strong> button below. It opens Claude with all the instructions already loaded.</> },
              { n: '4', text: <>Every morning, just type <strong style={{ color: '#1E2D3D' }}>&ldquo;Run swap triage&rdquo;</strong> or one of the prompts below, like <strong style={{ color: '#1E2D3D' }}>&ldquo;Check my BookClicker emails&rdquo;</strong> — and Claude does the rest.</> },
            ].map(step => (
              <div key={step.n} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{
                  background: '#1E2D3D',
                  color: '#ffffff',
                }}>{step.n}</span>
                <p className="text-sm leading-relaxed pt-0.5">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6" style={{ color: '#6B7280' }}>
            That&apos;s it. No downloads. No spreadsheets. Just one sentence every morning.
          </p>
        </div>
      </section>

      {/* What happens when you run it card */}
      <section className="max-w-2xl mx-auto px-6 py-2 mt-4">
        <div className="rounded-2xl p-8" style={{ background: '#1E2D3D' }}>
          <h2 className="text-lg font-bold mb-5" style={{ color: '#FFF8F0' }}>
            What happens when you run it
          </h2>
          <div className="rounded-xl p-5 mb-6" style={{ background: '#FFF8F0' }}>
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#9CA3AF' }}>
              Prompts that trigger the skill
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Run swap triage',
                'Check my BookClicker emails',
                'What swaps do I need to send today?',
                'Update my swap tracker',
                'Morning promo check',
                'What needs my attention this week?',
              ].map(pill => (
                <span key={pill} className="px-3 py-1.5 rounded-full text-sm font-medium" style={{
                  background: '#ffffff',
                  border: '0.5px solid #E5E7EB',
                  color: '#1E2D3D',
                }}>
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
            The skill scans your Gmail for BookClicker confirmations, cancellations, and new bookings —
            then cross-references them against your swap tracker to surface exactly what needs action today.
            It drafts missing-link requests and promo emails for you to copy and send.
            Claude processes everything in memory only. Your data is never stored or shared.
          </p>
        </div>
      </section>

      {/* Collapsible warning — Before you begin */}
      <section className="max-w-2xl mx-auto px-6 py-6">
        <details className="rounded-2xl overflow-hidden" style={{
          background: 'rgba(233, 160, 32, 0.08)',
          border: '1px solid rgba(233, 160, 32, 0.3)',
        }}>
          <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none list-none" style={{ color: '#1E2D3D' }}>
            <span className="font-semibold text-sm flex items-center gap-2">
              <span style={{ color: '#E9A020' }}>⚠</span>
              Before you begin — email setup
            </span>
            <span className="text-xs font-medium" style={{ color: '#E9A020' }}>
              tap to expand
            </span>
          </summary>
          <div className="px-6 pb-6">
            <div className="h-px mb-4" style={{ background: 'rgba(233, 160, 32, 0.2)' }} />
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151' }}>
              This skill needs two things connected before it can run triage:
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{
                  background: '#E9A020',
                  color: '#ffffff',
                }}>1</span>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                    Gmail connected to Claude
                  </p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Go to <strong>Claude Settings → Integrations → Gmail</strong> and authorize access.
                    Claude needs read access to scan for BookClicker emails.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{
                  background: '#E9A020',
                  color: '#ffffff',
                }}>2</span>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                    A swap tracker (Google Sheet or Notion)
                  </p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    You need a table Claude can read and update with columns:{' '}
                    <strong>Campaign Name, Direction, Platform, Promo Date, List Size, Status, Cost.</strong>
                    {' '}The walkthrough video shows you how to set this up.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Get started steps */}
      <section className="max-w-2xl mx-auto px-6 pt-2 pb-8">
        <p className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: '#9CA3AF' }}>
          Get started
        </p>
        <div className="space-y-5">
          {[
            {
              n: '1',
              title: 'Watch the walkthrough',
              body: 'A short video showing Gmail setup, tracker structure, and running your first triage.',
            },
            {
              n: '2',
              title: 'Download the skill doc',
              body: 'Open it in Google Docs. This is the full skill text you\'ll paste into Claude.',
            },
            {
              n: '3',
              title: 'Paste it into Claude and follow setup',
              body: 'Use the "Open in Claude" button below — the skill loads automatically. Claude will walk you through the rest.',
            },
          ].map(step => (
            <div key={step.n} className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{
                background: '#1E2D3D',
                color: '#ffffff',
              }}>{step.n}</span>
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: '#1E2D3D' }}>{step.title}</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA buttons */}
      <section className="max-w-2xl mx-auto px-6 pb-12">
        <div className="flex flex-col gap-3">

          {/* Coral — walkthrough video */}
          <a
            href="https://www.awesomescreenshot.com/video/51174180?key=b4b3ee0ca317d2776bc3247852125f91"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: '#F97B6B' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
            </svg>
            Watch the walkthrough video
          </a>

          {/* Navy — Google Drive skill doc */}
          <a
            href="https://docs.google.com/document/d/1f-88j4quL0JUxCvPQAoAFOYYcKhbFhm-dopzjuvRShU/copy?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: '#1E2D3D', color: '#FFF8F0' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Get the skill from Google Drive
          </a>

          {/* White outlined — Download skill file */}
          <a
            href="/downloads/bookclicker-triage.skill"
            download
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-sm transition-colors hover:bg-gray-50"
            style={{ background: '#ffffff', border: '0.5px solid #1E2D3D', color: '#1E2D3D' }}
          >
            Download the skill file →
          </a>

          <p className="text-center text-xs" style={{ color: 'rgba(30,45,61,0.5)' }}>
            First download and install the skill, then open Claude.
          </p>

          {/* Amber — Open in Claude */}
          <a
            href="https://claude.ai/new?q=I%20just%20installed%20the%20BookClicker%20triage%20skill.%20Please%20confirm%20you%20have%20it%20loaded%20and%20walk%20me%20through%20any%20remaining%20setup%20so%20I%20can%20run%20my%20first%20morning%20triage."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: '#E9A020', color: '#1E2D3D' }}
          >
            Open in Claude →
          </a>

        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <div className="h-px mb-8" style={{ background: '#E5E7EB' }} />
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#6B7280' }}>
          Made with love for your publishing journey.{' '}
          Have questions?{' '}
          <a
            href="mailto:info@ellewilderbooks.com"
            className="underline"
            style={{ color: '#1E2D3D' }}
          >
            Email me
          </a>{' '}
          — be detailed about where you got stuck and I&apos;ll do my best to help.

        </p>
        <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
          Want to know when AuthorDash is LIVE?
        </p>
        <a
          href="/waitlist"
          className="inline-block px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: '#E9A020', color: '#1E2D3D' }}
        >
          Join the Waitlist →
        </a>
        <p className="text-sm" style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: '#1E2D3D' }}>
          Andrea Bonilla
        </p>
      </footer>

    </div>
  )
}
