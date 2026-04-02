// app/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="max-w-2xl mx-auto">

        <Link href="/dashboard" className="text-[14px] font-medium no-underline hover:underline mb-8 inline-flex items-center gap-1"
          style={{ color: '#4A7290', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
          Author<span style={{ color: '#E9A020' }}>Dash</span>
        </Link>

        <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-3" style={{ color: '#1E2D3D' }}>
          Privacy Policy
        </h1>
        <p className="text-[13px] mb-10" style={{ color: '#6B7280' }}>
          Last updated: April 1, 2026 · Plain English, no legal jargon
        </p>

        <div className="space-y-8" style={{ color: '#374151' }}>
          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>What We Collect</h2>
            <p className="text-[14px] leading-relaxed">
              We collect: your name and email (via Google sign-in), pen name and genre (you provide this),
              KDP sales data (from files you upload), MailerLite email stats (via API), Meta ad performance
              (via API), Stripe billing information (for subscription management), and basic usage analytics
              (pages visited, features used). We only collect what we need to run the service.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>How We Use Your Data</h2>
            <p className="text-[14px] leading-relaxed">
              Your data is used solely to provide the AuthorDash service — analyzing your publishing performance
              and generating personalized coaching insights. We do not sell your data. We do not share your data
              with other users. We do not use your data for advertising. Your publishing data is yours.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>Data Storage</h2>
            <p className="text-[14px] leading-relaxed">
              Your data is stored in a Neon PostgreSQL database hosted in the United States. API keys are
              encrypted at rest. Data is retained while your account is active. When you delete your account,
              all your data is permanently removed from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>Third-Party Services</h2>
            <p className="text-[14px] leading-relaxed mb-3">
              AuthorDash integrates with third-party services, each with their own privacy policies:
            </p>
            <ul className="space-y-1.5 text-[14px] list-none p-0">
              {['Google (authentication)', 'MailerLite (email marketing data)', 'Meta / Facebook (ad performance)', 'Stripe (payment processing)', 'Anthropic / Claude (AI coaching insights)', 'Vercel (hosting and infrastructure)'].map(s => (
                <li key={s} className="flex items-start gap-2">
                  <span style={{ color: '#E9A020' }}>&#x2022;</span> {s}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>Your Rights</h2>
            <p className="text-[14px] leading-relaxed">
              You have the right to: access your data, correct inaccurate data, delete your account and all
              associated data, export your data, and disconnect any integration at any time. Visit your{' '}
              <Link href="/data" style={{ color: '#E9A020' }}>Data &amp; Privacy</Link> page
              or email <a href="mailto:support@authordash.io" style={{ color: '#E9A020' }}>support@authordash.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>Cookies</h2>
            <p className="text-[14px] leading-relaxed">
              We use essential cookies only — for authentication and session management. We do not use
              tracking cookies, advertising cookies, or third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>Changes</h2>
            <p className="text-[14px] leading-relaxed">
              We will notify you of significant changes to this policy via email or a notice in your dashboard.
              Continued use of AuthorDash after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>Contact</h2>
            <p className="text-[14px] leading-relaxed">
              Questions about privacy? Email us at{' '}
              <a href="mailto:support@authordash.io" style={{ color: '#E9A020' }}>support@authordash.io</a>.
              We are a small team and we actually read every email.
            </p>
          </section>
        </div>

        <div className="mt-14 pt-8 flex gap-6 text-[12px]" style={{ borderTop: '1px solid #EEEBE6' }}>
          <Link href="/terms" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Terms of Service</Link>
          <Link href="/data" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Your Data</Link>
          <Link href="/dashboard" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
