import posthog from 'posthog-js'

export const posthogClient = posthog

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return // already initialised

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: 'https://app.posthog.com',
    capture_pageview: false, // we fire manually via PostHogPageView
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  })
}
