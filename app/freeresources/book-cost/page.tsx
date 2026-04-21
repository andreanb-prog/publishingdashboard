import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], style: ['italic'], weight: ['400'] })

export const metadata: Metadata = {
  title: 'How Much Did That Book Cost? · AuthorDash',
  description: 'Scan your inbox. Find out exactly what each book is costing you.',
}

const claudeHref = `https://claude.ai/new?q=${encodeURIComponent('I want to set up the publishing expense auditor skill called How Much Did That Book Cost. Here is the full skill — please read it carefully, confirm you understand all 8 steps, and then walk me through the first-run setup so I can start my expense audit. The skill covers: Gmail scanning for receipts, categorizing spend by book, a subscriptions watchlist, per-book P&L, and CSV export.')}`

export default function BookCostPage() {
  return (
    <div style={{ fontFamily: 'var(--font-plus-jakarta), "Plus Jakarta Sans", -apple-system, sans-serif', background: '#FFF8F0', minHeight: '100vh', color: '#1E2D3D' }}>

      {/* Header */}
      <div style={{ background: '#1E2D3D', padding: '20px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, background: '#E9A020', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#1E2D3D', letterSpacing: '-0.02em', flexShrink: 0,
            }}>A</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>AuthorDash</span>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
            color: '#E9A020', border: '1px solid rgba(233,160,32,0.5)', borderRadius: 20,
            padding: '3px 10px',
          }}>Free Resource</div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
          How Much Did That Book Cost?
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 8 }}>
          Scan your inbox. Find out exactly what each book is costing you.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
          A Claude skill by Andrea Bonilla · AuthorDash · Requires Gmail + Claude Pro
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 60px' }}>

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
        <div style={{ background: '#1E2D3D', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#E9A020', marginBottom: 10 }}>
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
                background: '#FFF8F0', color: '#1E2D3D', borderRadius: 10,
                padding: '10px 12px', fontSize: 12, fontWeight: 600, lineHeight: 1.45,
              }}>{item}</div>
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
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, marginBottom: 8 }}>
              Connect Gmail in Claude Settings → Integrations. Use the email address where your publishing receipts arrive. If receipts are scattered across inboxes, forward them to your connected Gmail first. Claude can read receipts in the email body but cannot open PDF attachments.
            </li>
            <li style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65 }}>
              Create a Claude Project first. Name it Budget, Publishing Expenses, or Operations. Paste the skill into the Project Instructions. Always run this skill from that Project so Claude remembers your books and history between sessions.
            </li>
          </ol>
        </div>

        {/* Get started */}
        <div style={{
          background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
          padding: 16, marginBottom: 12,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#E9A020', marginBottom: 10 }}>
            Get started
          </p>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {[
              { num: 1, text: 'Create a Claude Project — Budget, Publishing Expenses, or Operations. Paste the skill into Project Instructions.' },
              { num: 2, text: 'Connect Gmail in Claude Settings → Integrations if you haven\'t already.' },
              { num: 3, text: 'Open your Project and type: \'How much did that book cost?\' or \'Run my publishing expense audit\' or \'What am I still paying for?\'' },
            ].map(({ num, text }) => (
              <li key={num} style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, marginBottom: num < 3 ? 8 : 0 }}>
                <span style={{ color: '#E9A020', fontWeight: 700 }}></span>{text}
              </li>
            ))}
          </ol>
        </div>

        {/* Customization note */}
        <div style={{
          background: 'rgba(110,191,139,0.08)', borderLeft: '3px solid #6EBF8B',
          borderRadius: 8, padding: '12px 14px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65 }}>
            This skill is yours to customize. After your first run, if something is missing or not working the way you want — just tell Claude what you wish it had done differently. It adjusts going forward. The skill gets smarter the more specific you are.
          </p>
        </div>

        {/* CTA buttons */}
        <a
          href="https://docs.google.com/document/d/1wRq0x1Upf2st0mNGNfpJ64Q2kHiuWrqC51HWmtwU1IE/copy"
          style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: '#1E2D3D', color: '#fff', borderRadius: 8,
            padding: 14, fontSize: 14, fontWeight: 700, marginBottom: 8,
          }}
        >
          Get the skill from Google Drive →
        </a>
        <a
          href={claudeHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center', textDecoration: 'none',
            background: '#E9A020', color: '#1E2D3D', borderRadius: 8,
            padding: 14, fontSize: 14, fontWeight: 700, marginBottom: 8,
          }}
        >
          ✦ Open in Claude — skill pre-loaded
        </a>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 20px 40px', fontSize: 11, color: 'rgba(30,45,61,0.3)', lineHeight: 1.9 }}>
        <div>A free resource from AuthorDash · Made for indie authors by Andrea Bonilla</div>
        <div>
          Have questions?{' '}
          <a href="mailto:info@ellewilderbooks.com" style={{ color: '#E9A020', textDecoration: 'none' }}>
            info@ellewilderbooks.com
          </a>
        </div>
        <div className={playfair.className} style={{ fontSize: 18, fontStyle: 'italic', color: '#1E2D3D', marginTop: 8 }}>
          Andrea Bonilla
        </div>
        <div>
          <a href="https://authordash.io" style={{ color: '#E9A020', textDecoration: 'none', fontSize: 11 }}>
            authordash.io
          </a>
        </div>
      </footer>

    </div>
  )
}
