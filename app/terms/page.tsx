// app/terms/page.tsx
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="max-w-2xl mx-auto">

        <Link href="/login"
          className="text-[12px] font-semibold no-underline hover:underline mb-10 inline-block"
          style={{ color: '#9CA3AF' }}>
          ← Back to login
        </Link>

        <h1 className="font-serif text-[32px] text-[#1E2D3D] leading-tight mb-3">
          Terms of Service
        </h1>
        <p className="text-[13px] mb-10" style={{ color: '#9CA3AF' }}>
          Last updated: March 2025 · Plain English, no legal jargon
        </p>

        <div className="space-y-8" style={{ color: '#374151' }}>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">This is a beta product</h2>
            <p className="text-[14px] leading-relaxed">
              AuthorDash is currently in beta. That means things might break, change, or
              disappear. We're building this in public and improving it constantly based on
              feedback from real authors. We'll always give you a heads-up before making
              major changes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">No guarantees of results</h2>
            <p className="text-[14px] leading-relaxed">
              AuthorDash provides coaching and analysis based on your data. We do our best
              to make it accurate and useful, but we can't guarantee specific results —
              sales, KENP reads, CTR improvements, or anything else. The AI coaching is a
              tool, not a promise. Your results depend on your books, your readers, and a
              lot of other things outside our control.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">You own your data</h2>
            <p className="text-[14px] leading-relaxed">
              Everything you upload — your KDP reports, your ad exports, your email
              stats — belongs to you. We don't claim any ownership over your business data.
              We just help you make sense of it.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">Pricing</h2>
            <p className="text-[14px] leading-relaxed">
              AuthorDash will be a paid subscription product. Pricing will be announced
              before the beta period ends. Beta users will receive advance notice before
              any billing begins — you'll never be charged without warning.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">Cancel anytime</h2>
            <p className="text-[14px] leading-relaxed">
              When paid plans launch, you can cancel at any time. No lock-ins, no
              cancellation fees. If you cancel, you keep access until the end of your
              billing period.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">Acceptable use</h2>
            <p className="text-[14px] leading-relaxed">
              Use AuthorDash for your own publishing business. Don't use it to upload
              other people's data without permission, attempt to reverse-engineer the
              product, or do anything illegal. That's it — pretty simple.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[20px] text-[#1E2D3D] mb-3">Questions?</h2>
            <p className="text-[14px] leading-relaxed">
              Email us at{' '}
              <span style={{ color: '#e9a020' }}>support@authordash.com</span>.
              We're a small team and we actually read every email.
            </p>
          </section>

        </div>

        <div className="mt-14 pt-8 flex gap-6 text-[12px]"
          style={{ borderTop: '1px solid #EEEBE6', color: '#D4D0CB' }}>
          <Link href="/login" className="no-underline hover:underline" style={{ color: '#9CA3AF' }}>
            ← Back to login
          </Link>
          <Link href="/privacy" className="no-underline hover:underline" style={{ color: '#9CA3AF' }}>
            Privacy Policy
          </Link>
        </div>

      </div>
    </div>
  )
}
