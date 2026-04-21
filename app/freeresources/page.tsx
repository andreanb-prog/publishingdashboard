import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Resources · AuthorDash',
  description: 'Tools and guides for indie romance authors — no login required.',
}

export default function FreeResourcesPage() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", background: '#FFF8F0', minHeight: '100vh', color: '#1E2D3D' }}>

      {/* Header */}
      <div style={{ background: '#1E2D3D', padding: '20px 24px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{
            width: 26, height: 26, background: '#E9A020', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#1E2D3D', letterSpacing: '-0.02em', flexShrink: 0,
          }}>A</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>AuthorDash</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Free Resources
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          Tools and guides for indie romance authors — no login required.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 60px' }}>

        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(30,45,61,0.35)', marginBottom: 14 }}>
          4 resources
        </p>

        {/* Card 1 — Swap Assistant */}
        <a href="/freeresources/swap-assistant" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
            padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(249,123,107,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="3" y1="5" x2="17" y2="5" stroke="#F97B6B" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="3" y1="10" x2="17" y2="10" stroke="#F97B6B" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="3" y1="15" x2="11" y2="15" stroke="#F97B6B" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="15" cy="14" r="3" fill="rgba(249,123,107,0.15)" stroke="#F97B6B" strokeWidth="1.4" />
                <line x1="15" y1="12.5" x2="15" y2="15.5" stroke="#F97B6B" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="13.5" y1="14" x2="16.5" y2="14" stroke="#F97B6B" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#F97B6B', marginBottom: 3 }}>
                Claude Skill
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1E2D3D', marginBottom: 4, letterSpacing: '-0.01em' }}>
                BookClicker Swap Assistant
              </p>
              <p style={{ fontSize: 12, color: 'rgba(30,45,61,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
                Every morning, type one sentence. Claude checks your inbox and tells you exactly which swaps to send today.
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['BookClicker', 'Gmail', 'Claude'].map(pill => (
                  <span key={pill} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.45)',
                  }}>{pill}</span>
                ))}
              </div>
            </div>
            {/* Chevron */}
            <span style={{ fontSize: 18, color: 'rgba(30,45,61,0.2)', flexShrink: 0 }}>›</span>
          </div>
        </a>

        {/* Card 2 — KU Pacing Audit */}
        <a href="/freeresources/ku-pacing-audit" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
            padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="3" width="12" height="14" rx="2" stroke="#8B5CF6" strokeWidth="1.5" />
                <line x1="7" y1="7" x2="13" y2="7" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="7" y1="10" x2="13" y2="10" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="7" y1="13" x2="11" y2="13" stroke="#8B5CF6" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8B5CF6', marginBottom: 3 }}>
                AI Prompt Tool
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1E2D3D', marginBottom: 4, letterSpacing: '-0.01em' }}>
                KU Pacing Audit
              </p>
              <p style={{ fontSize: 12, color: 'rgba(30,45,61,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
                Paste your manuscript or a single chapter. Get a scored heat map showing exactly where your pacing breaks down.
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['Contemporary Romance', 'Cozy Mystery', 'Mafia Romance'].map(pill => (
                  <span key={pill} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.45)',
                  }}>{pill}</span>
                ))}
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'rgba(30,45,61,0.2)', flexShrink: 0 }}>›</span>
          </div>
        </a>

        {/* Card 3 — Content Guide */}
        <a href="/freeresources/content-guide" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
            padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(91,191,181,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="5" y="2" width="10" height="9" rx="3" stroke="#5BBFB5" strokeWidth="1.5" />
                <line x1="8" y1="5.5" x2="12" y2="5.5" stroke="#5BBFB5" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="8" y1="8" x2="12" y2="8" stroke="#5BBFB5" strokeWidth="1.2" strokeLinecap="round" />
                <rect x="7" y="12" width="6" height="3" rx="1" stroke="#5BBFB5" strokeWidth="1.3" />
                <line x1="10" y1="11" x2="10" y2="12" stroke="#5BBFB5" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5BBFB5', marginBottom: 3 }}>
                Step-by-Step Guide
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1E2D3D', marginBottom: 4, letterSpacing: '-0.01em' }}>
                From Book to Content
              </p>
              <p style={{ fontSize: 12, color: 'rgba(30,45,61,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
                10 steps to build a content strategy that finds your readers — without ever feeling like you&apos;re selling.
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['Social Media', 'AI Prompts Included', '10 Steps'].map(pill => (
                  <span key={pill} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.45)',
                  }}>{pill}</span>
                ))}
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'rgba(30,45,61,0.2)', flexShrink: 0 }}>›</span>
          </div>
        </a>

        {/* Card 4 — Chapter Comp Audit */}
        <a href="/freeresources/comp-audit" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: '#fff', border: '0.5px solid rgba(30,45,61,0.12)', borderRadius: 12,
            padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(110,191,139,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="3" width="7" height="14" rx="1.5" stroke="#6EBF8B" strokeWidth="1.5" fill="none" />
                <rect x="11" y="3" width="7" height="14" rx="1.5" stroke="#6EBF8B" strokeWidth="1.5" fill="none" />
                <line x1="4.5" y1="7" x2="6.5" y2="7" stroke="#6EBF8B" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="4.5" y1="10" x2="6.5" y2="10" stroke="#6EBF8B" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="4.5" y1="13" x2="6.5" y2="13" stroke="#6EBF8B" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="13.5" y1="7" x2="15.5" y2="7" stroke="#6EBF8B" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="13.5" y1="10" x2="15.5" y2="10" stroke="#6EBF8B" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="13.5" y1="13" x2="15.5" y2="13" stroke="#6EBF8B" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6EBF8B', marginBottom: 3 }}>
                AI Prompt Tool
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1E2D3D', marginBottom: 4, letterSpacing: '-0.01em' }}>
                Chapter Comp Audit
              </p>
              <p style={{ fontSize: 12, color: 'rgba(30,45,61,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
                Paste your Chapter 1 alongside your comp authors. Get a scored matrix showing exactly where your craft dimensions align — and where they don&apos;t.
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['Comp Analysis', 'Chapter 1', 'Any AI'].map(pill => (
                  <span key={pill} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.45)',
                  }}>{pill}</span>
                ))}
              </div>
            </div>
            {/* Chevron */}
            <span style={{ fontSize: 18, color: 'rgba(30,45,61,0.2)', flexShrink: 0 }}>›</span>
          </div>
        </a>

      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '0 20px 40px', fontSize: 11, color: 'rgba(30,45,61,0.3)' }}>
        Free resources from{' '}
        <a href="https://authordash.io" style={{ color: 'rgba(30,45,61,0.5)', textDecoration: 'none', fontWeight: 600 }}>
          AuthorDash
        </a>
        {' '}· Made for indie authors by Elle Wilder
      </footer>

    </div>
  )
}
