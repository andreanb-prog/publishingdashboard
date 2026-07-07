'use client'
// components/PostHogProvider.tsx
// PostHog session replay + product analytics. Records real user sessions so you
// can play them back and watch bugs happen (with console + network capture).
// No-ops safely if the env keys aren't set, so local dev / previews don't record.
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
// Send ingestion through our own domain (see next.config.js rewrites) so ad
// blockers and our CSP don't block it. ui_host keeps "open in PostHog" links working.
const POSTHOG_HOST = '/ingest'
const POSTHOG_UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com'

let initialized = false

function initPostHog() {
  if (initialized || typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_UI_HOST,
    // Session replay — records clicks, navigation, and (per project settings)
    // console + network so you can diagnose bugs from the replay.
    session_recording: {
      maskAllInputs: true,        // never record what users type into fields (privacy)
      maskTextSelector: '.ph-mask', // add class="ph-mask" to hide any sensitive element
    },
    capture_pageview: false,      // we capture pageviews manually below (App Router)
    capture_pageleave: true,
    autocapture: true,            // capture clicks/interactions automatically
    persistence: 'localStorage+cookie',
  })
  initialized = true
}

// Manual pageview capture — App Router doesn't fire them automatically.
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!POSTHOG_KEY || !initialized) return
    let url = window.origin + pathname
    if (searchParams?.toString()) url += '?' + searchParams.toString()
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])
  return null
}

// Ties each replay to the signed-in user (email/name) so you know WHOSE session
// you're watching, instead of an anonymous ID.
function IdentifyUser() {
  const { data: session } = useSession()
  useEffect(() => {
    if (!POSTHOG_KEY || !initialized) return
    const user = session?.user as { id?: string; email?: string; name?: string } | undefined
    if (user?.id || user?.email) {
      posthog.identify(user.id || user.email!, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      })
    }
  }, [session])
  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { initPostHog() }, [])

  // If PostHog isn't configured, render children untouched (no recording).
  if (!POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <IdentifyUser />
      {children}
    </PHProvider>
  )
}
