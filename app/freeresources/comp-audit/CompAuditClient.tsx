'use client'

import { useState } from 'react'

const PROMPT_TEXT = `You are an expert indie romance craft consultant helping me audit my Chapter 1 against the Chapter 1 of authors I'm studying. Use the 8-dimension framework and matrix template below. Don't rush ahead. Wait for me at each step.

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

For Tense and Opening POV specifically: quote an actual verb or pronoun from the first three sentences of each book as evidence. Do not infer from genre conventions or author reputation — verify from the actual text. "I am" vs "I was" settles tense. "He rolled" vs "she rolled" settles POV. If you're uncertain, mark the cell uncertain and ask me.

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
Wait for my "go." Then deliver plainly. If my opening is fragmented and my comps are dense-block, say so. If my heat register is sweet and my comps are explicit, say so.

Step 6 — One revision question.
Restate: "Step 6: one specific revision question for you to sit with before rewriting a single word of Chapter 1. Ready?"
Wait for my "go." Then deliver ONE question. Not a list. Not a plan. One question.

Start with Step 1 now.`

const INTRO = 'I want to run a Chapter 1 comp audit on my romance novel. Here is the full prompt — please read it, confirm you understand the 8 dimensions, the matrix template, the verification rule, and all 6 steps, then start with Step 1.\n\n'

const CLAUDE_URL = `https://claude.ai/new?q=${encodeURIComponent(INTRO + PROMPT_TEXT)}`

function CopyButton() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(PROMPT_TEXT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#6EBF8B' : '#E9A020',
        color: '#1E2D3D',
        border: 'none',
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'background 0.2s',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 11V3a1 1 0 0 1 1-1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Copy prompt
        </>
      )}
    </button>
  )
}

const TIPS = [
  'Pick real comps, not wishlist comps. The authors your ideal reader reads in the same week as your book — not your favorites.',
  "The AI will restate each step before executing it. That's intentional — when it previews, say 'go' or redirect before it proceeds.",
  "Don't argue with Step 5. When the AI names your two weakest dimensions, sit with it for 24 hours before deciding whether it's right.",
  'The revision question in Step 6 is the whole point. That one question, answered honestly, is what gives you the next draft.',
  "If the matrix feels vague, paste this: 'Go back to the quoted excerpts. Every cell needs actual text as evidence. Where you inferred instead of quoted, redo it.'",
]

export default function CompAuditClient() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", background: '#FFF8F0', minHeight: '100vh', color: '#1E2D3D' }}>

      {/* Header */}
      <div style={{ background: '#1E2D3D', padding: '20px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, background: '#E9A020', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#1E2D3D', letterSpacing: '-0.02em',
            }}>A</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>AuthorDash</span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#E9A020', border: '1px solid #E9A020', borderRadius: 20, padding: '3px 10px',
          }}>Free Resource</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Chapter Comp Audit
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 14 }}>
          Find out exactly where your Chapter 1 stands against the authors writing in your lane.
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['8 craft dimensions', 'Any AI', 'Claude + ChatGPT'].map(pill => (
            <span key={pill} style={{
              fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
            }}>{pill}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 0' }}>

        {/* Intro card */}
        <div style={{
          background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
          padding: 16, marginBottom: 12,
        }}>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7, marginBottom: 10 }}>
            Want to improve your craft? This is how Claude or ChatGPT can help you study the authors writing in your exact lane — and identify precisely where your Chapter 1 is aligned with them and where it isn&apos;t.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7, marginBottom: 10 }}>
            Use this prompt as a starting point, then make it yours. Add dimensions that matter for your genre. Remove ones that don&apos;t. The more you customize it, the sharper the diagnostic gets.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7 }}>
            Once you run it and get output you like, save the customized prompt in the Claude Project or chat thread for that book. That way you can run it on your next draft without starting over — and without coming back here (though you&apos;re always welcome).
          </p>
        </div>

        {/* Legal note card */}
        <div style={{
          background: 'rgba(233,160,32,0.08)', borderLeft: '3px solid #E9A020', borderRadius: 8,
          padding: '12px 14px', marginBottom: 12,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E9A020', marginBottom: 6 }}>
            A NOTE ON PASTING COMP EXCERPTS
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65 }}>
            Pasting a few pages of a published book into a private AI chat is the same as highlighting those pages and typing passages into your notebook to study them. Copyright law covers reproduction and distribution — not private craft study. Three ground rules: keep the output private, use it to strengthen your own book only, and if it still feels wrong, describe the comp opening from memory instead of pasting. The analysis still works.
          </p>
        </div>

        {/* Prompt container */}
        <div style={{
          background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            background: '#FFF8F0', borderBottom: '1px solid rgba(30,45,61,0.07)',
            padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(30,45,61,0.4)' }}>
              CHAPTER COMP AUDIT · 8 DIMENSIONS · CLAUDE + CHATGPT
            </span>
            <CopyButton />
          </div>
          <div style={{
            padding: 16, fontSize: 12, lineHeight: 1.8, color: 'rgba(30,45,61,0.85)',
            whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 420, overflowY: 'auto',
          }}>
            {PROMPT_TEXT}
          </div>
        </div>

        {/* Tips card */}
        <div style={{
          background: 'rgba(110,191,139,0.08)', borderLeft: '3px solid #6EBF8B', borderRadius: 8,
          padding: '12px 14px', marginTop: 12,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6EBF8B', marginBottom: 10 }}>
            TIPS
          </p>
          {TIPS.map((tip, i) => (
            <p key={i} style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.65, marginBottom: i < TIPS.length - 1 ? 8 : 0 }}>
              <span style={{ color: '#6EBF8B', marginRight: 6 }}>→</span>
              {tip}
            </p>
          ))}
        </div>

        {/* Save your output card */}
        <div style={{
          background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
          padding: 16, marginTop: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1E2D3D', marginBottom: 8 }}>
            Saving your output
          </p>
          <p style={{ fontSize: 13, color: 'rgba(30,45,61,0.65)', lineHeight: 1.7 }}>
            When the matrix is built, copy it into a private document and save it. Run the same audit on your next draft and compare. After Step 6, save the revision question somewhere visible — a sticky note, the top of your manuscript file, a phone reminder. If you want a single clean document combining the matrix, honest read, and revision question, ask the AI at the end: &ldquo;Compile Steps 4, 5, and 6 into a single markdown document I can save.&rdquo;
          </p>
        </div>

        {/* Open in Claude button */}
        <a
          href={CLAUDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', background: '#E9A020', color: '#1E2D3D',
            borderRadius: 8, fontWeight: 700, padding: 14, fontSize: 14,
            marginTop: 16, textAlign: 'center', textDecoration: 'none',
          }}
        >
          ✦ Open in Claude — prompt pre-loaded
        </a>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 20px 40px', fontSize: 11, color: 'rgba(30,45,61,0.3)', lineHeight: 1.9 }}>
        <p>A free resource from AuthorDash · Made for indie authors by Andrea Bonilla</p>
        <p>
          Have questions?{' '}
          <a href="mailto:info@ellewilderbooks.com" style={{ color: '#E9A020', textDecoration: 'none' }}>
            info@ellewilderbooks.com
          </a>
        </p>
        <p style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: 18, color: '#1E2D3D', marginTop: 8 }}>
          Andrea Bonilla
        </p>
        <p style={{ marginTop: 4 }}>
          <a href="https://authordash.io" style={{ color: '#E9A020', textDecoration: 'none' }}>
            authordash.io
          </a>
        </p>
      </footer>

    </div>
  )
}
