import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import CompAuditClient from './CompAuditClient'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Chapter Comp Audit · AuthorDash',
  description: "Paste your Chapter 1 alongside your comp authors. Get a scored matrix showing exactly where your craft dimensions align — and where they don't.",
}

export default function CompAuditPage() {
  return (
    <div className={playfair.variable}>
      <CompAuditClient />
    </div>
  )
}
