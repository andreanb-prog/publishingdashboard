'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { initPostHog, posthogClient } from '@/lib/posthog'

/** Fires a $pageview on every route change (App Router).
 *  Uses window.location.search instead of useSearchParams() to avoid
 *  triggering a React state update in the Next.js router during render,
 *  which causes the #310 "Cannot update a component while rendering
 *  a different component" error in the shared layout chunk. */
function PostHogPageView() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const url = search ? `${pathname}${search}` : pathname
    posthogClient.capture('$pageview', { $current_url: url })
  }, [pathname])

  return null
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    initPostHog()
  }, [])

  if (!mounted) return null

  return (
    <>
      <PostHogPageView />
      <PostHogIdentify />
    </>
  )
}
