import type { Metadata } from 'next'
import { CopyButton } from './CopyButton'

export const metadata: Metadata = {
  title: 'Chapter 1 Craft Audit · AuthorDash',
  description: 'Audit your opening chapter against your comp authors across 8 craft dimensions.',
}

const PROMPT = `You are an expert indie romance craft consultant helping me audit my Chapter 1 against the Chapter 1 of authors I'm studying. Use the 8-dimension framework and matrix template below. Don't rush ahead. Wait for me at each step.

IMPORTANT: Before executing any step, restate in one plain sentence what that step is and what you're about to do, then wait for my confirmation. I will have forgotten the step definitions by the time we get there.

## THE 8 DIMENSIONS

1. Tense — past or present
2. Opening POV — hero or heroine; who the reader meets first
3. Opening hook — action word / declaration / complaint / observation / dialogue
4. Paragraph density — dense (60-120 words per paragraph) / moderate (40-80) / compact (15-40) / fragmented (3-15)
5. Heat register — explicit (on-page sexual content) / charged-clothed (mutual gaze, body awareness, no explicit language) / brief notice ("he was handsome" and plot moves on) / sweet (blush, flutter, heart skip only)
6. Humor register — dry+swagger / cozy embarrassment / situational comedy / dry observational / absent
7. Opening engine — contained scene (one location, one beat) / stacked chaos (multiple plot engines)
8. Trope clarity — explicit (trope named or clearly flagged by end of chapter) / subtle (implied only)

## THE MATRIX TEMPLATE (for Step 4)

In Step 4, output the matrix in this exact markdown table format. Every cell must include a short label AND a quoted excerpt from the actual text as evidence. Replace "Comp 1" and "Comp 2" with the real book titles.

| Dimension | My Book | Comp 1 | Comp 2 |
|---|---|---|---|
| 1. Tense |  |  |  |
| 2. Opening POV |  |  |  |
| 3. Opening hook |  |  |  |
| 4. Paragraph density |  |  |  |
| 5. Heat register |  |  |  |
| 6. Humor register |  |  |  |
| 7. Opening engine |  |  |  |
| 8. Trope clarity |  |  |  |

## VERIFICATION RULE

For Tense and Opening POV specifically: quote an actual verb or pronoun from the first three sentences of each book as evidence. Do not infer from genre conventions or author reputation — verify from the actual text.

## THE STEPS

Step 1 — My opening.
Restate: "Step 1: you paste your Chapter 1. I'll confirm receipt — no analysis yet."
Then wait. When I paste it, confirm receipt and preview Step 2.

Step 2 — My comps.
Restate: "Step 2: name 2–3 authors actually writing in your lane — not wishlist comps."
Wait for my answer.

Step 3 — Their openings.
Restate: "Step 3: paste the Chapter 1 of each comp, one at a time. I'll confirm after each."
Accept them one at a time. Confirm receipt after each. Ask for the next.

Step 4 — The matrix.
Restate: "Step 4: I'll build the matrix using the template above — markdown table, 8 dimensions × all books, every cell with a quoted excerpt as evidence."
Then build the matrix in the exact template format. No cell may be filled without a quoted excerpt. Apply the verification rule for Tense and POV.

Step 5 — The honest read.
Restate: "Step 5 is the honest read. I'll name the 2 dimensions where your book is most off from your comps — without softening. Ready?"
Wait for my "go." Then deliver plainly.

Step 6 — One revision question.
Restate: "Step 6: one specific revision question for you to sit with before rewriting a single word of Chapter 1. Ready?"
Wait for my "go." Then deliver ONE question. Not a list. Not a plan. One question.

Start with Step 1 now.`

const claudeHref = `https://claude.ai/new?q=${encodeURIComponent(PROMPT)}`

const STEPS = [
  'Paste your Chapter 1',
  'Name your comp authors',
  'Paste each comp chapter',
  'Build the 8-dimension matrix',
  'Get the honest read',
  'Receive one revision question',
]

export default function CraftAuditPage() {
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
          Chapter 1 Craft Audit
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
          Know exactly where your opening stands — before you rewrite a single word.
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
            This prompt walks you through a 6-step audit of your Chapter 1 against the authors you&apos;re actually studying. You&apos;ll get an 8-dimension matrix with quoted evidence, an honest read of where you&apos;re most off from your comps, and one revision question to sit with.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7, marginBottom: 10 }}>
            Works with Claude, ChatGPT, or any AI.
          </p>
        </div>

        {/* Legal note */}
        <div style={{
          background: 'rgba(233,160,32,0.08)', borderLeft: '3px solid #E9A020',
          borderRadius: 8, padding: '12px 14px', marginBottom: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1E2D3D', marginBottom: 6 }}>
            Is pasting comp chapters okay?
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65 }}>
            Yes — this is the same as studying a book at your desk and taking craft notes. Copyright law covers reproduction and distribution, not a private AI session. Keep the chat private, don&apos;t post the output publicly, and you&apos;re in the clear.
          </p>
        </div>

        {/* CTA buttons */}
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
          ✦ Open in Claude
        </a>
        <CopyButton text={PROMPT} />

        {/* Tip text */}
        <p style={{ fontSize: 11, color: 'rgba(30,45,61,0.35)', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
          Start a fresh chat each time you run this on a new book or draft.
        </p>

        {/* What you'll work through */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#E9A020', marginBottom: 10 }}>
            What you&apos;ll work through
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {STEPS.map((step, i) => (
              <div key={step} style={{
                background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 8,
                padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#1E2D3D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: '#1E2D3D', fontWeight: 600 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips — collapsible */}
        <details style={{
          background: 'rgba(110,191,139,0.08)', border: '0.5px solid rgba(110,191,139,0.3)',
          borderRadius: 8, marginBottom: 16, overflow: 'hidden',
        }}>
          <summary style={{
            padding: '12px 14px', cursor: 'pointer', listStyle: 'none',
            fontSize: 13, fontWeight: 700, color: '#1E2D3D',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Tips for best results</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6EBF8B' }}>tap to expand</span>
          </summary>
          <div style={{ padding: '0 14px 14px', borderTop: '0.5px solid rgba(110,191,139,0.3)' }}>
            <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
              {[
                'Use authors you\'ve read recently — not wishlist comps. The closer the lane, the sharper the matrix.',
                'Paste the actual first chapter, not a summary. Claude verifies with quotes from the real text.',
                'When you get to Step 5, resist the urge to defend your choices. The honest read only works if you let it land.',
                'Save the matrix from Step 4 somewhere. It\'s a reference you\'ll return to on every future draft.',
              ].map((tip, i) => (
                <li key={i} style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, marginBottom: 8 }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </details>

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
        <div>
          <a href="https://authordash.io" style={{ color: '#E9A020', textDecoration: 'none', fontSize: 11 }}>
            authordash.io
          </a>
        </div>
      </footer>

    </div>
  )
}
