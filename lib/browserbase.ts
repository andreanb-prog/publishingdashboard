// lib/browserbase.ts
// Thin server-side wrapper around the Browserbase SDK for the KDP connection flow.
// We create a persistent Context (so login cookies survive across syncs), open a
// live Session bound to that Context, and read the live session's page URL to tell
// whether the user has finished logging into KDP.
import Browserbase from '@browserbasehq/sdk'

const KDP_START_URL = 'https://kdp.amazon.com/'

export interface BrowserbaseConfig {
  apiKey: string
  projectId: string
}

// Returns null (instead of throwing) so callers can return a clean 503 with a
// helpful message when the env vars haven't been set in Vercel yet.
export function getBrowserbaseConfig(): BrowserbaseConfig | null {
  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID
  if (!apiKey || !projectId) return null
  return { apiKey, projectId }
}

export function browserbaseClient(cfg: BrowserbaseConfig): Browserbase {
  return new Browserbase({ apiKey: cfg.apiKey })
}

export interface KdpLiveSession {
  contextId: string
  sessionId: string
  liveViewUrl: string
}

// Creates a persistent context + a live session bound to it, navigates the live
// session to the KDP sign-in page, and returns the embeddable Live View URL.
export async function createKdpLiveSession(cfg: BrowserbaseConfig): Promise<KdpLiveSession> {
  const bb = browserbaseClient(cfg)

  // 1. Persistent context — stores the user's KDP/Amazon cookies for future syncs.
  const context = await bb.contexts.create({ projectId: cfg.projectId })

  // 2. Live session bound to that context, persisting cookies back into it on close.
  const session = await bb.sessions.create({
    projectId: cfg.projectId,
    browserSettings: { context: { id: context.id, persist: true } },
  })

  // 3. Navigate the remote browser to KDP's sign-in page so the user lands there
  //    inside the Live View. Best-effort: if navigation fails the user can still
  //    drive the browser manually, so we never fail the whole request on it.
  try {
    const { chromium } = await import('playwright-core')
    const browser = await chromium.connectOverCDP(session.connectUrl)
    try {
      const ctx = browser.contexts()[0]
      const page = ctx?.pages()[0] ?? (await ctx?.newPage())
      if (page) {
        await page.goto(KDP_START_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      }
    } finally {
      // Disconnects our CDP client without ending the remote session — the user
      // keeps interacting with the same live session.
      await browser.close()
    }
  } catch {
    // Non-fatal: live view still opens, user can navigate to KDP themselves.
  }

  // 4. Live View URL for the iframe.
  const live = await bb.sessions.debug(session.id)

  return {
    contextId: context.id,
    sessionId: session.id,
    liveViewUrl: live.debuggerFullscreenUrl,
  }
}

// Decides whether a given page URL means the user is logged into KDP.
// Amazon redirects KDP sign-in through www.amazon.com/ap/signin; once the user
// authenticates they are returned to kdp.amazon.com. So: on kdp.amazon.com and
// NOT on a sign-in path => logged in.
export function isKdpLoggedInUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl) return false
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  const host = url.hostname.toLowerCase()
  const path = url.pathname.toLowerCase()
  const isSignin = path.includes('/signin') || path.startsWith('/ap/') || path.includes('/ap/signin')
  return host.endsWith('kdp.amazon.com') && !isSignin
}

// Polls the live session's open pages and reports whether the user has reached a
// signed-in KDP page yet. Read-only — never ends the session.
export async function checkKdpLoggedIn(
  cfg: BrowserbaseConfig,
  sessionId: string,
): Promise<{ loggedIn: boolean; url: string | null }> {
  const bb = browserbaseClient(cfg)
  const live = await bb.sessions.debug(sessionId)
  const pages = live.pages ?? []
  const match = pages.find(p => isKdpLoggedInUrl(p.url))
  if (match) return { loggedIn: true, url: match.url }
  return { loggedIn: false, url: pages[0]?.url ?? null }
}
