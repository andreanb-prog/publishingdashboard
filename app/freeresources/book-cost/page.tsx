import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'How Much Did That Book Cost? · AuthorDash',
  description: 'Scan your Gmail receipts and find out exactly what each book is costing you — ads, covers, editing, promos, and every subscription you forgot about.',
}

const CLAUDE_PROMPT = 'I want to set up the publishing expense auditor skill called How Much Did That Book Cost. Here is the full skill — please read it carefully, confirm you understand all 8 steps, and then walk me through the first-run setup so I can start my expense audit. The skill covers: Gmail scanning for receipts, categorizing spend by book, a subscriptions watchlist, per-book P&L, and CSV export.'

const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(CLAUDE_PROMPT)}`

export default function BookCostPage() {
  return (
    <div
      className={playfair.variable}
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", background: '#FFF8F0', minHeight: '100vh', color: '#1E2D3D' }}
    >

      {/* Navy header */}
      <div style={{ background: '#1E2D3D', padding: '20px 24px 24px' }}>
        {/* Logo row + badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, background: '#E9A020', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#1E2D3D', letterSpacing: '-0.02em', flexShrink: 0,
            }}>A</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>AuthorDash</span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em',
            color: '#E9A020', border: '1px solid rgba(233,160,32,0.5)', borderRadius: 20,
            padding: '3px 10px',
          }}>Free Resource</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.3 }}>
          How Much Did That Book Cost?
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 8 }}>
          Scan your inbox. Find out exactly what each book is costing you.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
          A Claude skill by Andrea Bonilla · AuthorDash · Requires Gmail + Claude Pro
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 0' }}>

        {/* Intro card */}
        <div style={{
          background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
          padding: 16, marginBottom: 12,
        }}>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7, marginBottom: 10 }}>
            I kept launching books without ever adding up what I&apos;d actually spent. Ads, covers, editing, promo swaps, that course I bought in a panic — it all adds up fast and most of us have no idea what the real number is.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7, marginBottom: 10 }}>
            This skill scans your Gmail receipts, sorts everything by book, surfaces every subscription you&apos;re still paying for, and gives you a CSV you can drop into a spreadsheet.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7 }}>
            Run it once and you&apos;ll finally know.
          </p>
        </div>

        {/* What it does */}
        <div style={{
          background: '#1E2D3D', borderRadius: 12, padding: 16, marginBottom: 12,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#E9A020', marginBottom: 10 }}>
            What it does
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              'Scans Gmail for every publishing receipt',
              'Sorts spend by book — ads, covers, promos',
              'Subscriptions watchlist on every run',
              'Exports CSV for Excel or Google Sheets',
            ].map(item => (
              <div key={item} style={{
                background: '#FFF8F0', borderRadius: 10, padding: '10px 12px',
                fontSize: 12, fontWeight: 600, color: '#1E2D3D', lineHeight: 1.4,
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Setup warning */}
        <div style={{
          background: 'rgba(233,160,32,0.08)', borderLeft: '3px solid #E9A020',
          borderRadius: 8, padding: '12px 14px', marginBottom: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1E2D3D', marginBottom: 8 }}>
            Before you run this — two things
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                background: '#E9A020', color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>1</span>
              <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, margin: 0 }}>
                Connect Gmail in <strong>Claude Settings → Integrations</strong>. Use the email address where your publishing receipts arrive. If receipts are scattered across inboxes, forward them to your connected Gmail first. Claude can read receipts in the email body but cannot open PDF attachments.
              </p>
            </li>
            <li style={{ display: 'flex', gap: 8 }}>
              <span style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                background: '#E9A020', color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>2</span>
              <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, margin: 0 }}>
                Create a <strong>Claude Project</strong> first. Name it <em>Budget</em>, <em>Publishing Expenses</em>, or <em>Operations</em>. Paste the skill into the Project Instructions. Always run this skill from that Project so Claude remembers your books and history between sessions.
              </p>
            </li>
          </ol>
        </div>

        {/* Get started steps */}
        <div style={{
          background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
          padding: 16, marginBottom: 12,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: 'rgba(30,45,61,0.4)', marginBottom: 10 }}>
            Get started
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {[
              {
                n: '1',
                text: 'Create a Claude Project — Budget, Publishing Expenses, or Operations. Paste the skill into Project Instructions.',
              },
              {
                n: '2',
                text: 'Connect Gmail in Claude Settings → Integrations if you haven\'t already.',
              },
              {
                n: '3',
                text: 'Open your Project and type: "How much did that book cost?" or "Run my publishing expense audit" or "What am I still paying for?"',
              },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                  background: '#1E2D3D', color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{step.n}</span>
                <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.6, margin: 0 }}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Customization note */}
        <div style={{
          background: 'rgba(110,191,139,0.08)', borderLeft: '3px solid #6EBF8B',
          borderRadius: 8, padding: '12px 14px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, margin: 0 }}>
            This skill is yours to customize. After your first run, if something is missing or not working the way you want — just tell Claude what you wish it had done differently. It adjusts going forward. The skill gets smarter the more specific you are.
          </p>
        </div>

        {/* CTA buttons */}
        <a
          href="https://PLACEHOLDER_GOOGLE_DRIVE_LINK"
          style={{
            display: 'block', width: '100%', background: '#1E2D3D', color: '#fff',
            borderRadius: 8, fontWeight: 700, padding: '14px 0', fontSize: 14,
            textAlign: 'center' as const, textDecoration: 'none', marginBottom: 8,
            boxSizing: 'border-box' as const,
          }}
        >
          Get the skill from Google Drive →
        </a>

        <a
          href={claudeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', background: '#E9A020', color: '#1E2D3D',
            borderRadius: 8, fontWeight: 700, padding: '14px 0', fontSize: 14,
            textAlign: 'center' as const, textDecoration: 'none', marginBottom: 8,
            boxSizing: 'border-box' as const,
          }}
        >
          ✦ Open in Claude — skill pre-loaded
        </a>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 20px 40px', fontSize: 11, color: 'rgba(30,45,61,0.3)' }}>
        <p style={{ margin: '0 0 6px' }}>
          Made with love for your publishing journey. Have questions? Email me —{' '}
          <a href="mailto:info@ellewilderbooks.com" style={{ color: 'rgba(30,45,61,0.5)', textDecoration: 'underline' }}>
            info@ellewilderbooks.com
          </a>
        </p>
        <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: 18, color: '#1E2D3D' }}>
          Andrea Bonilla
        </p>
        <p style={{ margin: 0 }}>
          <a href="https://authordash.io" style={{ color: '#E9A020', textDecoration: 'none', fontSize: 11 }}>
            authordash.io
          </a>
        </p>
      </footer>

    </div>
  )
}
