// lib/browserbase.ts
// Thin server-side wrapper around the Browserbase SDK for the KDP connection flow.
// We create a persistent Context (so login cookies survive across syncs), open a
// live Session bound to that Context, and read the live session's page URL to tell
// whether the user has finished logging into KDP.
import Browserbase from '@browserbasehq/sdk'

const KDP_SIGNIN_URL = 'https://kdp.amazon.com/en_US/signin'

// Meta: send users to the Facebook login with a next= into Ads Manager so that
// after signing in they land on the ads surface we sync from.
export const META_ADSMANAGER_URL = 'https://adsmanager.facebook.com/adsmanager/manage/campaigns'
const META_LOGIN_URL = `https://www.facebook.com/login.php?next=${encodeURIComponent(META_ADSMANAGER_URL)}`

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

// ── Session hygiene ───────────────────────────────────────────────────────────
// Browserbase enforces a concurrent-session cap. Abandoned connect-flow sessions
// (user closed the tab, an error mid-flow) keep RUNNING and clog the cap, which
// then fails the NEXT connect with a RateLimitError. Best-effort sweep: release
// RUNNING sessions older than 10 minutes — real logins finish well under that,
// and nightly syncs release their own sessions.
export async function releaseStaleRunningSessions(cfg: BrowserbaseConfig, keepSessionId?: string): Promise<void> {
  try {
    const bb = browserbaseClient(cfg)
    const sessions = await bb.sessions.list({ status: 'RUNNING' })
    for (const s of sessions) {
      if (s.id === keepSessionId) continue
      const age = Date.now() - new Date(s.createdAt).getTime()
      if (age > 10 * 60_000) {
        console.log('[browserbase] releasing stale session', s.id, `(${Math.round(age / 60000)}m old)`)
        await bb.sessions.update(s.id, { status: 'REQUEST_RELEASE', projectId: cfg.projectId }).catch(() => undefined)
      }
    }
  } catch (err) {
    console.warn('[browserbase] stale-session sweep failed:', err instanceof Error ? err.message : String(err))
  }
}

// Creates a session; on a rate/concurrency error it sweeps stale sessions and
// retries once so a clogged cap self-heals instead of failing the connect.
async function createSessionWithRetry(
  cfg: BrowserbaseConfig,
  params: Browserbase.Sessions.SessionCreateParams,
): Promise<{ id: string }> {
  const bb = browserbaseClient(cfg)
  try {
    return await bb.sessions.create(params)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isLimit = /rate|429|concurrent|limit/i.test(msg)
    if (!isLimit) throw err
    console.warn('[browserbase] session cap hit — sweeping stale sessions and retrying once')
    await releaseStaleRunningSessions(cfg)
    await new Promise(resolve => setTimeout(resolve, 4000))
    return await bb.sessions.create(params)
  }
}

// Creates a persistent context + a live session bound to it, navigates it to the
// source's sign-in URL, and returns the embeddable Live View URL. Generic across
// sources (KDP, Meta, BookClicker): pass the login start URL and a substring the
// navigated page's URL must contain.
export async function createLiveSessionForUrl(
  cfg: BrowserbaseConfig,
  startUrl: string,
  urlMatch: string,
): Promise<KdpLiveSession> {
  const bb = browserbaseClient(cfg)
  console.log('[browserbase] createLiveSessionForUrl — start,', urlMatch, 'projectId:', cfg.projectId)

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
    session = await createSessionWithRetry(cfg, {
      projectId: cfg.projectId,
      browserSettings: {
        context: { id: context.id, persist: true },
        // Small viewport on purpose: the Live View scales the remote page to fit
        // the iframe, so a SMALLER viewport means everything renders BIGGER.
        // At 768x576 the sign-in form fills the window and is readable for all
        // users; a 1280+ viewport scaled down was too small to read.
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
  for (let attempt = 1; attempt <= 2; attempt++) {
    await navigateSessionToUrl(cfg, session.id, startUrl)
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (await sessionPageMatches(cfg, session.id, urlMatch)) break
    console.warn(`[browserbase] page not on ${urlMatch} after navigate attempt ${attempt}`)
  }

  // 4. Live View URL for the iframe — AFTER navigation so the page target is the
  // sign-in page. Prefer the page-specific FULLSCREEN url: it has no debugger
  // URL bar chrome, so the sign-in form gets the whole iframe (readability).
  let liveViewUrl: string
  try {
    const live = await bb.sessions.debug(session.id)
    console.log('[browserbase] debug — pages:', JSON.stringify((live.pages ?? []).map(p => ({ url: p.url }))))
    // Prefer the page that's actually on the target site over any stray blank target.
    const page = live.pages?.find(p => (p.url ?? '').includes(urlMatch)) ?? live.pages?.[0]
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

// Drives the remote session to a URL by ATTACHING to the running session over
// CDP (Stagehand session-resume) and calling page.goto directly. This replaces
// a REST "/navigate" endpoint that DOES NOT EXIST in the Browserbase API — it
// 404'd on every call, which is why the Live View kept opening on about:blank
// no matter how many times the flow was "fixed".
// IMPORTANT: never call stagehand.close() here — that would end the session
// and kill the Live View the user is looking at. Disconnecting without close
// leaves the session running (sessions survive dropped connections).
export async function navigateSessionToUrl(cfg: BrowserbaseConfig, sessionId: string, url: string): Promise<boolean> {
  try {
    const { Stagehand } = await import('@browserbasehq/stagehand')
    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: cfg.apiKey,
      projectId: cfg.projectId,
      browserbaseSessionID: sessionId, // attach to the EXISTING live session
      disablePino: true,
      verbose: 0,
      logger: () => { /* quiet */ },
    })
    await Promise.race([
      stagehand.init(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('attach timed out after 20s')), 20_000)),
    ])
    const page = stagehand.context.activePage()
    if (!page) {
      console.error('[browserbase] navigate: no active page on session', sessionId)
      return false
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 15_000 })
    console.log('[browserbase] navigated session via CDP attach to', url.slice(0, 60))
    return true
  } catch (err) {
    console.error('[browserbase] FAILED to navigate session — message:', err instanceof Error ? err.message : String(err))
    return false
  }
}

// Back-compat wrapper used by the KDP connect flow.
export async function navigateSessionToKdp(cfg: BrowserbaseConfig, sessionId: string): Promise<boolean> {
  return navigateSessionToUrl(cfg, sessionId, KDP_SIGNIN_URL)
}

// True when the session's first page URL contains the given substring.
export async function sessionPageMatches(cfg: BrowserbaseConfig, sessionId: string, match: string): Promise<boolean> {
  try {
    const bb = browserbaseClient(cfg)
    const live = await bb.sessions.debug(sessionId)
    const url = live.pages?.[0]?.url ?? ''
    return url.includes(match)
  } catch { return false }
}

// Back-compat wrapper used by the KDP rescue route.
export async function sessionPageOnAmazon(cfg: BrowserbaseConfig, sessionId: string): Promise<boolean> {
  return sessionPageMatches(cfg, sessionId, 'amazon')
}

// Source-specific wrappers around the generic live-session creator.
export async function createKdpLiveSession(cfg: BrowserbaseConfig): Promise<KdpLiveSession> {
  return createLiveSessionForUrl(cfg, KDP_SIGNIN_URL, 'amazon')
}

export async function createMetaLiveSession(cfg: BrowserbaseConfig): Promise<KdpLiveSession> {
  return createLiveSessionForUrl(cfg, META_LOGIN_URL, 'facebook')
}

export function metaLoginUrl(): string {
  return META_LOGIN_URL
}

// ── Meta login detection ──────────────────────────────────────────────────────
// Logged in when the session has reached Ads Manager (adsmanager.facebook.com,
// or business.facebook.com/adsmanager). Login, checkpoint, and two-factor pages
// must NOT count — users sitting on those are still signing in.
export function isMetaLoggedInUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl) return false
  let url: URL
  try { url = new URL(rawUrl) } catch { return false }
  const host = url.hostname.toLowerCase()
  const path = url.pathname.toLowerCase()
  if (path.includes('login') || path.includes('checkpoint') || path.includes('two_step_verification')) return false
  if (host === 'adsmanager.facebook.com') return true
  if (host === 'business.facebook.com' && path.includes('adsmanager')) return true
  return false
}

// Polls the live session's open pages and reports whether the user has reached
// a signed-in Ads Manager page yet. Read-only — never ends the session.
// Also returns the act= ad account id from the URL when present, so the connect
// flow can capture which ad account the user landed on.
export async function checkMetaLoggedIn(
  cfg: BrowserbaseConfig,
  sessionId: string,
): Promise<{ loggedIn: boolean; url: string | null; adAccountId: string | null }> {
  const bb = browserbaseClient(cfg)
  const live = await bb.sessions.debug(sessionId)
  const pages = live.pages ?? []
  const match = pages.find(p => isMetaLoggedInUrl(p.url))
  if (match) {
    let adAccountId: string | null = null
    try { adAccountId = new URL(match.url!).searchParams.get('act') } catch { /* ignore */ }
    return { loggedIn: true, url: match.url ?? null, adAccountId }
  }
  return { loggedIn: false, url: pages[0]?.url ?? null, adAccountId: null }
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
