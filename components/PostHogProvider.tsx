'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { initPostHog, posthogClient } from '@/lib/posthog'

/** Fires a $pageview on every route change (App Router). */
function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams}`
      : pathname
    posthogClient.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  )
}

/** Identifies the user once the NextAuth session loads. */
function PostHogIdentify() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.email) {
      posthogClient.identify(session.user.email, {
        name: session.user.name ?? undefined,
        email: session.user.email,
      })
    }
  }, [session?.user?.email, session?.user?.name])

  return null
}

export function PostHogProvider() {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      <PostHogPageView />
      <PostHogIdentify />
    </>
  )
}
