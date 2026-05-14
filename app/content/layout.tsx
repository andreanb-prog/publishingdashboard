import { redirect } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StoryPost · Content Studio',
  description: '30 intentional days. Build your author content calendar with AI.',
}

export default async function StoryPostRootLayout({
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
          --coral:   #C0555A;
          --phase-empathy:      #C9C9A8;
          --phase-anticipation: #D6B5A8;
          --phase-origin:       #DDB987;
          --phase-launch:       #1F3258;
          --phase-proof:        #9AAEB8;
          background: var(--paper);
          color: var(--ink);
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
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
          flex-shrink: 0;
        }
        .sp-main {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          height: 100vh;
        }
        .sp-mobile-bar {
          display: none !important;
        }
        @media (max-width: 768px) {
          .sp-sidebar { display: none !important; }
          .sp-main { height: auto; min-height: 100vh; padding-top: 56px; }
          .sp-mobile-bar { display: flex !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      <div className="sp-root">
        {children}
      </div>
    </>
  )
}
