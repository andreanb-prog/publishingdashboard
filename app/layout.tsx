// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { site } from '@/lib/site'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['opsz'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

const description =
  'Work one-on-one with Andrea to build Claude, ChatGPT and other AI systems that run the business side of your author career.'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: `${site.brand} | ${site.tagline}`,
  description,
  openGraph: {
    title: `${site.brand} | ${site.tagline}`,
    description,
    url: site.url,
    siteName: site.brand,
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E2D3D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
