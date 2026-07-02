export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// DISABLED — DO NOT RE-ENABLE without the geo-matched-proxy work.
// This route used to plant Facebook session cookies into a Browserbase context
// and sync from a SERVER IP. That tripped Facebook's account-hijack protection
// and LOCKED a real user's Facebook account (Jul 1, 2026). The replacement is
// the in-browser reader (/api/extension/meta-data): Fetch reads the numbers in
// the user's OWN browser on their OWN IP and posts only the numbers — no cookies
// ever leave the user's machine, nothing for Facebook to flag.
//
// This stub stays so any still-installed old extension that calls this endpoint
// gets a clean refusal instead of spinning up a risky Browserbase session.
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      error: 'This connection method has been retired for your account\'s safety. Please update the Fetch extension — Meta now syncs directly in your browser.',
    },
    { status: 410 },
  )
}
