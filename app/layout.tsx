// app/layout.tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
})


export const metadata: Metadata = {
  title: 'AuthorDash — Publishing Marketing Dashboard',
  description: 'Your indie author marketing coach',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AuthorDash',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/favicon.svg',
  },
  themeColor: '#1E2D3D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="font-sans bg-cream text-[#0d1f35] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
