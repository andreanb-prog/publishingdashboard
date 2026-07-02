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
        // Small viewport on purpose: the Live View scales the remote page to fit
        // the iframe, so a SMALLER viewport means everything renders BIGGER.
        // At 768x576 the Amazon sign-in form fills the window and is readable
        // for all users; a 1280+ viewport scaled down was too small to read.
        viewport: { width: 768, height: 576 },
      },
    })
    console.log('[browserbase] session created — sessionId:', session.id)
  } catch (err) {
    console.error('[browserbase] FAILED to create session — message:', err instanceof Error ? err.message : String(err))
    console.error('[browserbase] FAILED to create session — stack:', err instanceof Error ? err.stack : '(no stack)')
    throw err
  }

  // 3. Navigate to KDP signin FIRST — with retries and verification — so the
  // Live View never opens on about:blank. (Previously the debug URL was fetched
  // before navigating; when the navigate call silently failed, users saw a blank
  // page in the connect modal.)
  await new Promise(resolve => setTimeout(resolve, 1000))
  for (let attempt = 1; attempt <= 3; attempt++) {
    await navigateSessionToKdp(cfg, session.id)
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (await sessionPageOnAmazon(cfg, session.id)) break
    console.warn(`[browserbase] page not on Amazon after navigate attempt ${attempt}`)
  }

  // 4. Live View URL for the iframe — AFTER navigation so the page target is the
  // sign-in page. Prefer the page-specific FULLSCREEN url: it has no debugger
  // URL bar chrome, so the sign-in form gets the whole iframe (readability).
  let liveViewUrl: string
  try {
    const live = await bb.sessions.debug(session.id)
    console.log('[browserbase] debug — pages:', JSON.stringify((live.pages ?? []).map(p => ({ url: p.url }))))
    const page = live.pages?.[0]
    liveViewUrl = page?.debuggerFullscreenUrl ?? live.debuggerFullscreenUrl ?? page?.debuggerUrl
    console.log('[browserbase] using liveViewUrl:', liveViewUrl)
  } catch (err) {
    console.error('[browserbase] FAILED to fetch debug URL — message:', err instanceof Error ? err.message : String(err))
    throw err
  }

  return {
    contextId: context.id,
    sessionId: session.id,
    liveViewUrl,
  }
}

// Drives the remote session to the KDP sign-in page via the Browserbase REST
// API. Used at connect time and by the "Load Amazon sign-in" fallback button.
export async function navigateSessionToKdp(cfg: BrowserbaseConfig, sessionId: string): Promise<boolean> {
  try {
    const navRes = await fetch(
      `https://www.browserbase.com/v1/sessions/${sessionId}/navigate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bb-api-key': cfg.apiKey,
        },
        body: JSON.stringify({ url: KDP_SIGNIN_URL }),
      },
    )
    if (!navRes.ok) {
      console.error('[browserbase] navigate failed — status:', navRes.status, 'body:', await navRes.text().catch(() => ''))
      return false
    }
    return true
  } catch (err) {
    console.error('[browserbase] FAILED to navigate session — message:', err instanceof Error ? err.message : String(err))
    return false
  }
}

// True when the session's first page is anywhere on Amazon (sign-in or logged in).
export async function sessionPageOnAmazon(cfg: BrowserbaseConfig, sessionId: string): Promise<boolean> {
  try {
    const bb = browserbaseClient(cfg)
    const live = await bb.sessions.debug(sessionId)
    const url = live.pages?.[0]?.url ?? ''
    return url.includes('amazon')
  } catch { return false }
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
