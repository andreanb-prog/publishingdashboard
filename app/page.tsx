import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AuthorDash — Am I making money?',
  description:
    'AuthorDash answers that question every morning. Net royalties after ad spend, after returns, after everything. Built for indie authors who treat their books like a business.',
}

// TODO: wire to DB count of founding member conversions
const SPOTS_REMAINING = 47
const SPOTS_TOTAL = 100

export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: 'var(--font-plus-jakarta), sans-serif',
        background: 'var(--paper)',
        color: 'var(--ink)',
        minHeight: '100vh',
      }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--card-boutique)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Wordmark */}
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Author
          <em style={{ color: 'var(--amber-boutique)', fontStyle: 'italic' }}>Dash</em>
        </span>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a
            href="#how-it-works"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink3)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            How it works
          </a>
          <a
            href="#pricing"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink3)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            Pricing
          </a>
          <Link
            href="/login"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              background: 'var(--ink)',
              color: 'var(--paper)',
              padding: '8px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            Join beta free →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '80px 24px 64px',
        }}
      >
        {/* Mirror copy */}
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--ink3)',
            borderLeft: '3px solid var(--line)',
            paddingLeft: 20,
            marginBottom: 40,
            lineHeight: 1.65,
          }}
        >
          You downloaded the KDP report. You copied numbers into a spreadsheet. You checked your rank on
          one site, your ads on another, your email stats somewhere else. All to answer one question.
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(48px, 8vw, 72px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: 28,
          }}
        >
          <em style={{ color: 'var(--amber-boutique)', fontStyle: 'italic', display: 'block' }}>
            Am I making
          </em>
          <span style={{ color: 'var(--ink)', fontStyle: 'normal', display: 'block' }}>money?</span>
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontSize: 17,
            color: 'var(--ink2)',
            lineHeight: 1.65,
            marginBottom: 36,
            maxWidth: 560,
          }}
        >
          AuthorDash answers that question every morning. Net royalties after ad spend, after returns,
          after everything. One number. One clear action. No spreadsheets. No tab switching. No guessing.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '16px 28px',
            borderRadius: 8,
            textDecoration: 'none',
            letterSpacing: '0.03em',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          Join beta free → Lock in $7 forever
        </Link>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink4)',
            marginTop: 12,
            letterSpacing: '0.06em',
          }}
        >
          No credit card · cancel anytime · founding member spots limited
        </p>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section
        style={{
          background: '#14110f',
          padding: '24px 28px',
          maxWidth: 720,
          margin: '0 auto 0',
          borderRadius: 12,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Live label */}
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink4)',
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}
          >
            TODAY&apos;S NET ROYALTIES ·{' '}
            <span style={{ color: 'var(--amber-boutique)' }}>●</span> LIVE
          </p>

          {/* Big number */}
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(40px, 8vw, 56px)',
              color: 'var(--paper)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: '0.55em', color: 'var(--ink4)', verticalAlign: 'super' }}>$</span>
            1,762
            <span style={{ fontSize: '0.55em', color: 'var(--ink4)' }}>.40</span>
          </p>

          {/* Trend */}
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--green)',
              marginBottom: 16,
              letterSpacing: '0.03em',
            }}
          >
            ↑ 7.6% vs your 7-day average
          </p>

          {/* Breakdown */}
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink4)',
              borderTop: '1px dashed rgba(138,128,118,0.35)',
              paddingTop: 12,
              marginBottom: 20,
              lineHeight: 1.6,
              letterSpacing: '0.02em',
            }}
          >
            $1,842 gross · minus{' '}
            <span style={{ color: 'var(--red)' }}>$79.60 Meta spend</span> · minus $0 returns = $1,762.40
            net
          </p>

          {/* Metric cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            {[
              { label: 'Meta ROAS', value: '2.14×' },
              { label: 'Email list', value: '8,412' },
              { label: 'Units sold', value: '104' },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  background: 'rgba(247,241,229,0.06)',
                  border: '1px solid rgba(138,128,118,0.2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--ink4)',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {m.label}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    color: 'var(--paper)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF STRIP ── */}
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {[
          { stat: '5 min', label: 'To first insight' },
          { stat: '$0', label: 'Beta is free' },
          { stat: '1', label: 'Clear action every morning' },
        ].map((item, i) => (
          <div
            key={item.stat}
            style={{
              padding: '28px 24px',
              borderRight: i < 2 ? '1px solid var(--line)' : undefined,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 32,
                color: 'var(--amber-boutique)',
                letterSpacing: '-0.03em',
                marginBottom: 4,
              }}
            >
              {item.stat}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink4)',
                letterSpacing: '0.06em',
              }}
            >
              {item.label}
            </p>
          </div>
        ))}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '72px 24px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--amber-text)',
            letterSpacing: '0.1em',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          How it works
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {[
            {
              n: '1',
              title: 'You bring the data',
              body: 'Upload KDP report, connect Meta ads, link MailerLite. 5 minutes the first time.',
            },
            {
              n: '2',
              title: 'AuthorDash makes sense of it',
              body: 'Every morning: net royalties after every expense, ad performance, email health. No tab switching.',
            },
            {
              n: '3',
              title: 'You make the call',
              body: 'AI is only as good as the brain behind it. We keep you in the process — you drive, AuthorDash navigates. You\'re still the one running your business. Now you\'re just not doing it alone.',
            },
          ].map((step) => (
            <div
              key={step.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr',
                gap: 20,
                alignItems: 'start',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink4)',
                  paddingTop: 2,
                }}
              >
                {step.n}.
              </span>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 20,
                    color: 'var(--ink)',
                    marginBottom: 6,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: 15,
                    color: 'var(--ink3)',
                    lineHeight: 1.65,
                  }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BETA AUTHOR QUOTE ── */}
      <section
        style={{
          background: 'var(--card-boutique)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          padding: '48px 24px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <blockquote
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            &ldquo;I finally know if my ads are actually making me money. I used to just hope they
            were.&rdquo;
          </blockquote>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink4)',
              letterSpacing: '0.06em',
            }}
          >
            — Beta author · 4 titles in KU
          </p>
        </div>
      </section>

      {/* ── WHAT WE BELIEVE ── */}
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '72px 24px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--amber-text)',
            letterSpacing: '0.1em',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          What we believe
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 1,
            background: 'var(--line)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {[
            {
              title: 'Done with you, not for you',
              body: "We surface what matters. You decide what to do with it. This isn't a black box — it's a co-pilot.",
            },
            {
              title: 'Your data stays yours',
              body: "We never store your KDP password. Upload a report, we read it, we don't keep it. Full data export anytime.",
            },
            {
              title: 'Built for working authors',
              body: "Not a tool for marketers who write. A tool for authors who also have to run a business.",
            },
            {
              title: 'Every genre, every platform',
              body: "Romance, thriller, fantasy, cozy mystery — if you're publishing indie and running ads, AuthorDash works for you.",
            },
          ].map((belief) => (
            <div
              key={belief.title}
              style={{
                background: 'var(--card-boutique)',
                padding: '28px 28px',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 17,
                  color: 'var(--ink)',
                  marginBottom: 8,
                  letterSpacing: '-0.01em',
                }}
              >
                {belief.title}
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--ink3)',
                  lineHeight: 1.65,
                }}
              >
                {belief.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVING PRODUCT ── */}
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px 72px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink2)',
            lineHeight: 1.65,
            marginBottom: 16,
          }}
        >
          New features ship every week. We&apos;re always testing, always improving — and we&apos;re
          building based on what authors actually need, not what we think they need.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink2)',
            lineHeight: 1.65,
            marginBottom: 16,
          }}
        >
          If there&apos;s something you want to see, tell me directly. I read every message.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--amber-boutique)',
            marginBottom: 20,
          }}
        >
          — Andrea, founder
        </p>
        <a
          href="mailto:andreanbonilla@gmail.com?subject=Feature request"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--amber-text)',
            textDecoration: 'none',
            borderBottom: '1px solid var(--amber-text)',
            paddingBottom: 1,
            letterSpacing: '0.06em',
          }}
        >
          Request a feature →
        </a>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        style={{
          background: 'var(--card-boutique)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          padding: '72px 24px',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--amber-text)',
              letterSpacing: '0.1em',
              marginBottom: 24,
              textTransform: 'uppercase',
            }}
          >
            Pricing
          </p>

          <p
            style={{
              fontSize: 16,
              color: 'var(--ink2)',
              lineHeight: 1.65,
              marginBottom: 40,
              maxWidth: 560,
            }}
          >
            AuthorDash will be $37/month at public launch. Right now, beta is free. The first 100
            members who stay through launch lock in $7/month forever.
          </p>

          {/* Tier grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 1,
              background: 'var(--line)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 32,
            }}
          >
            {/* Beta tier */}
            <div
              style={{
                background: 'var(--paper)',
                padding: '32px 28px',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink4)',
                  letterSpacing: '0.08em',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                }}
              >
                Beta
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 40,
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                $0
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink4)',
                  letterSpacing: '0.04em',
                  marginBottom: 20,
                }}
              >
                during beta
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--ink3)',
                  lineHeight: 1.65,
                }}
              >
                Full access. No credit card. When we launch publicly, you&apos;ll be notified and given
                the choice to stay or go. No auto-charges — ever.
              </p>
            </div>

            {/* Founding member tier */}
            <div
              style={{
                background: '#14110f',
                padding: '32px 28px',
                position: 'relative',
              }}
            >
              {/* Tag */}
              <span
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  background: 'var(--amber-boutique)',
                  color: 'var(--ink)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                First 100 only
              </span>

              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'rgba(138,128,118,0.7)',
                  letterSpacing: '0.08em',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                }}
              >
                Founding member
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 40,
                  color: 'var(--paper)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                $7
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'rgba(138,128,118,0.7)',
                  letterSpacing: '0.04em',
                  marginBottom: 20,
                }}
              >
                per month · locked forever
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: 'rgba(247,241,229,0.6)',
                  lineHeight: 1.65,
                }}
              >
                Stay through launch and this is your price permanently. No matter what we charge everyone
                else. If you leave and come back, this rate is gone.
              </p>
            </div>
          </div>

          {/* Spots counter */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid var(--line)',
              paddingTop: 20,
              marginBottom: 32,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink3)',
                letterSpacing: '0.04em',
              }}
            >
              Founding member spots remaining
            </p>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                color: 'var(--amber-boutique)',
                letterSpacing: '-0.02em',
              }}
            >
              {SPOTS_REMAINING}{' '}
              <span style={{ fontSize: 14, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>
                of {SPOTS_TOTAL}
              </span>
            </p>
          </div>

          {/* Main CTA */}
          <Link
            href="/login"
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              background: 'var(--ink)',
              color: 'var(--paper)',
              padding: '16px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              letterSpacing: '0.03em',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Join beta free → Lock in $7 forever
          </Link>

          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink4)',
              textAlign: 'center',
              letterSpacing: '0.06em',
              marginBottom: 24,
            }}
          >
            No credit card · cancel anytime · you choose at launch
          </p>

          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--ink3)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            If AuthorDash helps you catch one underperforming ad this month, it pays for itself —
            twice.
          </p>
        </div>
      </section>

      {/* ── CONCIERGE CALLOUT ── */}
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '72px 24px',
        }}
      >
        <div
          style={{
            border: '1px solid var(--line)',
            borderLeft: '3px solid var(--amber-boutique)',
            background: 'var(--card-boutique)',
            padding: '28px 32px',
            borderRadius: 10,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--amber-text)',
              letterSpacing: '0.1em',
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            Concierge
          </p>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
              marginBottom: 12,
            }}
          >
            Want a custom setup?
          </p>
          <p
            style={{
              fontSize: 15,
              color: 'var(--ink3)',
              lineHeight: 1.65,
              marginBottom: 20,
              maxWidth: 480,
            }}
          >
            If you want someone to sit with you, configure your dashboard, and make sure it&apos;s
            actually working for your specific publishing situation — that&apos;s available. Concierge
            onboarding is a one-time session with me directly.
          </p>
          <a
            href="mailto:andreanbonilla@gmail.com?subject=Concierge onboarding"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--amber-text)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--amber-text)',
              paddingBottom: 1,
              letterSpacing: '0.06em',
            }}
          >
            Apply for concierge →
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: '1px solid var(--line)',
          padding: '28px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Author
          <em style={{ color: 'var(--amber-boutique)', fontStyle: 'italic' }}>Dash</em>
        </span>

        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
            { label: 'Data', href: '/data' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink4)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
