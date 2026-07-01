// lib/browserbase.ts
// Thin server-side wrapper around the Browserbase SDK for the KDP connection flow.
// We create a persistent Context (so login cookies survive across syncs), open a
// live Session bound to that Context, and read the live session's page URL to tell
// whether the user has finished logging into KDP.
import Browserbase from '@browserbasehq/sdk'

const KDP_SIGNIN_URL = 'https://kdp.amazon.com/en_US/signin'

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

// Creates a persistent context + a live session bound to it and returns the
// embeddable Live View URL. No navigation — the user drives the browser themselves.
export async function createKdpLiveSession(cfg: BrowserbaseConfig): Promise<KdpLiveSession> {
  const bb = browserbaseClient(cfg)
  console.log('[browserbase] createKdpLiveSession — start, projectId:', cfg.projectId)

  // 1. Persistent context — stores the user's KDP/Amazon cookies for future syncs.
  let context: { id: string }
  try {
    context = await bb.contexts.create({ projectId: cfg.projectId })
    console.log('[browserbase] context created — contextId:', context.id)
  } catch (err) {
    console.error('[browserbase] FAILED to create context — message:', err instanceof Error ? err.message : String(err))
    console.error('[browserbase] FAILED to create context — stack:', err instanceof Error ? err.stack : '(no stack)')
    throw err
  }

  // 2. Live session bound to that context, persisting cookies back into it on close.
  let session: { id: string }
  try {
    session = await bb.sessions.create({
      projectId: cfg.projectId,
      browserSettings: {
        context: { id: context.id, persist: true },
        // Match the Live View modal size so the remote page renders ~1:1 instead
        // of a 1920px viewport scaled down into a small iframe (unreadable login).
        viewport: { width: 1280, height: 800 },
      },
    })
    console.log('[browserbase] session created — sessionId:', session.id)
  } catch (err) {
    console.error('[browserbase] FAILED to create session — message:', err instanceof Error ? err.message : String(err))
    console.error('[browserbase] FAILED to create session — stack:', err instanceof Error ? err.stack : '(no stack)')
    throw err
  }

  // 3. Live View URL for the iframe — use the page-specific debuggerUrl so the
  // iframe shows the active tab rather than about:blank.
  let liveViewUrl: string
  try {
    const live = await bb.sessions.debug(session.id)
    console.log('[browserbase] debug — debuggerFullscreenUrl:', live.debuggerFullscreenUrl)
    console.log('[browserbase] debug — pages:', JSON.stringify(live.pages ?? []))
    const pageUrl = live.pages?.[0]?.debuggerUrl
    liveViewUrl = pageUrl ?? live.debuggerFullscreenUrl
    console.log('[browserbase] using liveViewUrl:', liveViewUrl)
  } catch (err) {
    console.error('[browserbase] FAILED to fetch debug URL — message:', err instanceof Error ? err.message : String(err))
    console.error('[browserbase] FAILED to fetch debug URL — stack:', err instanceof Error ? err.stack : '(no stack)')
    throw err
  }

  // 4. Give the session 1 second to initialize, then navigate to KDP signin via
  // the REST API so the Live View iframe shows the login page rather than about:blank.
  await new Promise(resolve => setTimeout(resolve, 1000))
  try {
    const navRes = await fetch(
      `https://www.browserbase.com/v1/sessions/${session.id}/navigate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bb-api-key': cfg.apiKey,
        },
        body: JSON.stringify({ url: KDP_SIGNIN_URL }),
      },
    )
    console.log('[browserbase] navigate response status:', navRes.status)
    if (!navRes.ok) {
      const text = await navRes.text()
      console.error('[browserbase] navigate failed — body:', text)
    }
  } catch (err) {
    console.error('[browserbase] FAILED to navigate session — message:', err instanceof Error ? err.message : String(err))
  }

  return {
    contextId: context.id,
    sessionId: session.id,
    liveViewUrl,
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
  // Only consider kdpreports.amazon.com as "logged in" — the marketing page
  // (kdp.amazon.com) and any sign-in pages must not trigger a false positive.
  return host === 'kdpreports.amazon.com'
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
