import { redirect } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'

export default async function StoryPostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  return (
    <>
      <style>{`
        .sp-root {
          --paper:   #F1E8D4;
          --paper-2: #F7F0DC;
          --paper-3: #ECE2C9;
          --ink:     #14213D;
          --ink-2:   #2E3B5A;
          --ink-3:   #4A5673;
          --ink-4:   rgba(20,33,61,0.55);
          --rule:    rgba(20,33,61,0.14);
          --amber:   #B07A2A;
          --rose:    #A86E5E;
          --sage:    #7B8466;
          --phase-empathy:     #C9C9A8;
          --phase-anticipation:#D6B5A8;
          --phase-origin:      #DDB987;
          --phase-launch:      #1F3258;
          --phase-proof:       #9AAEB8;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100vh;
        }
        .sp-sidebar {
          width: 260px;
          min-width: 260px;
          background: var(--paper-3);
          border-right: 1px solid var(--rule);
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .sp-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          height: 100vh;
        }
        @media (max-width: 768px) {
          .sp-sidebar { display: none; }
        }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      <div className="sp-root" style={{ display: 'flex' }}>
        <aside className="sp-sidebar">
          <div style={{ padding: '28px 20px 20px' }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              StoryPost
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-4)',
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Content Calendar
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--rule)', margin: '0 20px' }} />

          <div style={{ padding: '20px 20px 0', flex: 1 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}>
              Your Projects
            </div>
            <a
              href="/content"
              style={{
                display: 'block',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink)',
                textDecoration: 'none',
                background: 'rgba(20,33,61,0.06)',
              }}
            >
              All projects
            </a>
          </div>

          <div style={{ padding: '20px', marginTop: 'auto' }}>
            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                The Engine
              </div>
              <a
                href="/dashboard"
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--ink-3)',
                  textDecoration: 'none',
                  padding: '4px 0',
                }}
              >
                Back to AuthorDash
              </a>
            </div>
          </div>
        </aside>

        <main className="sp-main">
          {children}
        </main>
      </div>
    </>
  )
}
