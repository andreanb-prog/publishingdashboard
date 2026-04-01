// app/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0d1f35] px-6 py-16">
      <div className="max-w-2xl mx-auto">

        <Link href="/login"
          className="text-[12px] font-semibold no-underline hover:underline mb-10 inline-block"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          ← Back to login
        </Link>

        <h1 className="font-serif text-[32px] text-white leading-tight mb-3">
          Privacy Policy
        </h1>
        <p className="text-[13px] mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Last updated: March 2025 · Plain English, no legal jargon
        </p>

        <div className="space-y-8" style={{ color: 'rgba(255,255,255,0.7)' }}>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">Your data is yours</h2>
            <p className="text-[14px] leading-relaxed">
              No one at AuthorDash browses or reviews your business data. Your KDP numbers,
              ad spend, email stats — all of it belongs to you. We only store what you
              upload so we can show it back to you.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">What we collect</h2>
            <ul className="text-[14px] leading-relaxed space-y-2 list-none">
              <li>→ Your email address and name (from Google login — that's it)</li>
              <li>→ The marketing files you upload (KDP reports, Meta exports, Pinterest CSVs)</li>
              <li>→ The coaching sessions we generate from those files</li>
              <li>→ Your API keys if you choose to add them (stored encrypted)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">How your data is stored</h2>
            <p className="text-[14px] leading-relaxed">
              Your files and numbers are stored privately in your account only. We use
              Neon (PostgreSQL) for storage with encryption at rest. No other user can
              see your data.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">Claude AI (Anthropic)</h2>
            <p className="text-[14px] leading-relaxed">
              Your data is processed by Claude AI (Anthropic) to generate your coaching
              session. This means your numbers are sent to Anthropic's API in order to
              produce your analysis.{' '}
              <strong className="text-white">
                Anthropic does not train on API data.
              </strong>{' '}
              Your data is not used to train any AI model. You can read Anthropic's privacy
              policy at anthropic.com/privacy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">Google login</h2>
            <p className="text-[14px] leading-relaxed">
              We use Google login only for authentication — to confirm who you are. We do
              not access your Gmail, Google Drive, Calendar, or any other Google data.
              We only receive your email address and display name.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">We never sell your data</h2>
            <p className="text-[14px] leading-relaxed">
              We never sell your data to anyone, ever. We don't share it with advertisers,
              data brokers, or third parties. Full stop.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">Cookies</h2>
            <p className="text-[14px] leading-relaxed">
              We use cookies for authentication only — to keep you logged in between
              sessions. We don't use tracking cookies or third-party analytics.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">Deleting your data</h2>
            <p className="text-[14px] leading-relaxed">
              You can request deletion of all your data at any time by emailing us at{' '}
              <span style={{ color: '#e9a020' }}>support@authordash.com</span>.
              We'll delete everything within 7 days and confirm when it's done.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-white mb-3">Questions?</h2>
            <p className="text-[14px] leading-relaxed">
              Email us at{' '}
              <span style={{ color: '#e9a020' }}>support@authordash.com</span>.
              We're a small team and we actually read every email.
            </p>
          </section>

        </div>

        <div className="mt-14 pt-8 flex gap-6 text-[12px]"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' }}>
          <Link href="/login" className="no-underline hover:underline" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ← Back to login
          </Link>
          <Link href="/terms" className="no-underline hover:underline" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Terms of Service
          </Link>
        </div>

      </div>
    </div>
  )
}
