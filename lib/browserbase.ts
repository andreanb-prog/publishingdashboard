// lib/browserbase.ts
// Thin server-side wrapper around the Browserbase SDK for the KDP connection flow.
// We create a persistent Context (so login cookies survive across syncs), open a
// live Session bound to that Context, and read the live session's page URL to tell
// whether the user has finished logging into KDP.
import Browserbase from '@browserbasehq/sdk'

const KDP_SIGNIN_URL = 'https://kdp.amazon.com/en_US/signin'

// BookClicker: friendly Rails app, cookie session, no 2FA. We open the dashboard;
// if signed out it redirects to the sign-in/benefits page where the user logs in
// via Live View, then lands back on an authed page.
const BOOKCLICKER_DASHBOARD_URL = 'https://www.bookclicker.com/dashboard'

// Meta: send users to the Facebook login with a next= into Ads Manager so that
// after signing in they land on the ads surface we sync from.
// m.facebook.com on purpose: the mobile login flow renders reliably (incl. the
// two-factor step) in the small embedded viewport, where the desktop
// two_step_verification page rendered blank and stalled users mid-connect.
export const META_ADSMANAGER_URL = 'https://adsmanager.facebook.com/adsmanager/manage/campaigns'
const META_LOGIN_URL = `https://m.facebook.com/login.php?next=${encodeURIComponent(META_ADSMANAGER_URL)}`

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

// ── Fetch cookie injection (Meta) ─────────────────────────────────────────────
// The "Fetch" extension reads the user's Facebook session cookies in their own
// browser and hands them to us. We create a fresh Browserbase Context, plant the
// cookies in it, verify Ads Manager loads, and close — Browserbase persists the
// cookies into the Context so nightly syncs resume that session. No remote login,
// no 2FA, no checkpoint: authentication already happened on the user's device.
//
// Returns the new contextId to store as user.metaContextId, plus whether Ads
// Manager rendered (login confirmed).
export interface MetaCookieInput {
  cUser: string  // Facebook "c_user" cookie (the user id)
  xs:    string  // Facebook "xs" cookie (the session secret)
}

export async function injectMetaCookies(
  cfg: BrowserbaseConfig,
  cookies: MetaCookieInput,
): Promise<{ contextId: string; loggedIn: boolean; adAccountId: string | null }> {
  const bb = browserbaseClient(cfg)

  // 1. Fresh persistent context to hold this user's Facebook session.
  const context = await bb.contexts.create({ projectId: cfg.projectId })

  // 2. Session on that context, routed through residential proxy so the planted
  //    session's IP is consistent with a normal browser (avoids the "unusual
  //    login" checkpoint that fires on datacenter IPs).
  const session = await createSessionWithRetry(cfg, {
    projectId: cfg.projectId,
    proxies: true,
    browserSettings: { context: { id: context.id, persist: true } },
  })

  const { Stagehand } = await import('@browserbasehq/stagehand')
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    browserbaseSessionID: session.id,
    disablePino: true,
    verbose: 0,
    logger: () => { /* quiet */ },
  })

  try {
    await Promise.race([
      stagehand.init(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('attach timed out after 20s')), 20_000)),
    ])
    const page = stagehand.context.activePage()
    if (!page) throw new Error('No active page to inject cookies into')

    // 3. Plant the two Facebook cookies across the domains Ads Manager needs.
    const common = { path: '/', httpOnly: true, secure: true, sameSite: 'None' as const }
    const cookieList = ['.facebook.com', '.adsmanager.facebook.com'].flatMap(domain => ([
      { name: 'c_user', value: cookies.cUser, domain, ...common, httpOnly: false },
      { name: 'xs',     value: cookies.xs,    domain, ...common },
    ]))
    // stagehand.context IS the Playwright BrowserContext — addCookies lives there
    // directly (page.context() is not exposed in Stagehand v3).
    await (stagehand.context as unknown as { addCookies: (c: unknown[]) => Promise<void> }).addCookies(cookieList)

    // 4. Verify: load Ads Manager. If cookies are valid we land on the ads UI;
    //    if not we bounce to login. Never write "connected" unless verified.
    await page.goto(META_ADSMANAGER_URL, { waitUntil: 'domcontentloaded', timeoutMs: 20_000 })
    await page.waitForTimeout(4000)
    const url = page.url()
    const loggedIn = isMetaLoggedInUrl(url)
    let adAccountId: string | null = null
    try { adAccountId = new URL(url).searchParams.get('act') } catch { /* ignore */ }

    return { contextId: context.id, loggedIn, adAccountId }
  } finally {
    // Close persists cookies into the Context. Safe here (unlike the live-view
    // flow) because no user is watching this session.
    try { await stagehand.close() } catch { /* ignore */ }
  }
}

// ── Fetch cookie injection (KDP) ──────────────────────────────────────────────
// Backup to the KDP Live View flow. Amazon binds its session to a BUNDLE of
// cookies (at-main, sess-at-main, x-main, ubid-main, session-token, …) rather
// than two like Facebook, so the extension sends ALL .amazon.com cookies and we
// plant every one. More fragile than Facebook (Amazon ties cookies to IP/device
// more tightly), so this connection may need re-linking more often — that's what
// the needs_reauth state is for.
export interface RawCookie {
  name:     string
  value:    string
  domain:   string
  path?:    string
  secure?:  boolean
  httpOnly?: boolean
}

export async function injectKdpCookies(
  cfg: BrowserbaseConfig,
  cookies: RawCookie[],
): Promise<{ contextId: string; loggedIn: boolean }> {
  const bb = browserbaseClient(cfg)
  const context = await bb.contexts.create({ projectId: cfg.projectId })
  const session = await createSessionWithRetry(cfg, {
    projectId: cfg.projectId,
    browserSettings: { context: { id: context.id, persist: true } },
  })

  const { Stagehand } = await import('@browserbasehq/stagehand')
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    browserbaseSessionID: session.id,
    disablePino: true,
    verbose: 0,
    logger: () => { /* quiet */ },
  })

  try {
    await Promise.race([
      stagehand.init(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('attach timed out after 20s')), 20_000)),
    ])
    const page = stagehand.context.activePage()
    if (!page) throw new Error('No active page to inject cookies into')

    const cookieList = cookies
      .filter(c => c.name && c.value)
      .map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain?.startsWith('.') ? c.domain : `.amazon.com`,
        path: c.path || '/',
        secure: c.secure ?? true,
        httpOnly: c.httpOnly ?? false,
        sameSite: 'None' as const,
      }))
    await (stagehand.context as unknown as { addCookies: (c: unknown[]) => Promise<void> }).addCookies(cookieList)

    await page.goto('https://kdpreports.amazon.com/dashboard', { waitUntil: 'domcontentloaded', timeoutMs: 20_000 })
    await page.waitForTimeout(4000)
    const loggedIn = isKdpLoggedInUrl(page.url())

    return { contextId: context.id, loggedIn }
  } finally {
    try { await stagehand.close() } catch { /* ignore */ }
  }
}

// ── Session hygiene ───────────────────────────────────────────────────────────
// Browserbase enforces a concurrent-session cap. Abandoned connect-flow sessions
// (user closed the tab, an error mid-flow) keep RUNNING and clog the cap, which
// then fails the NEXT connect with a RateLimitError. Best-effort sweep: release
// RUNNING sessions older than 10 minutes — real logins finish well under that,
// and nightly syncs release their own sessions.
export async function releaseStaleRunningSessions(cfg: BrowserbaseConfig, keepSessionId?: string, maxAgeMs = 10 * 60_000): Promise<void> {
  try {
    const bb = browserbaseClient(cfg)
    const sessions = await bb.sessions.list({ status: 'RUNNING' })
    for (const s of sessions) {
      if (s.id === keepSessionId) continue
      const age = Date.now() - new Date(s.createdAt).getTime()
      if (age > maxAgeMs) {
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
    // Aggressive 2-minute threshold here: when the cap is BLOCKING a new
    // connect, a lingering session is almost always an abandoned or stuck
    // connect attempt (e.g. a dead 2FA page) — supersede it.
    console.warn('[browserbase] session cap hit — sweeping stale sessions and retrying once')
    await releaseStaleRunningSessions(cfg, undefined, 2 * 60_000)
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
  opts?: { proxies?: boolean },
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
      // Residential proxy when requested (Meta): Facebook serves its login and
      // two-factor pages an EMPTY SHELL on datacenter IPs — users got stuck on
      // a blank 2FA screen. Through a residential IP the pages render normally.
      ...(opts?.proxies ? { proxies: true } : {}),
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
  return createLiveSessionForUrl(cfg, META_LOGIN_URL, 'facebook', { proxies: true })
}

export async function createBookclickerLiveSession(cfg: BrowserbaseConfig): Promise<KdpLiveSession> {
  return createLiveSessionForUrl(cfg, BOOKCLICKER_DASHBOARD_URL, 'bookclicker.com')
}

// ── BookClicker login detection ───────────────────────────────────────────────
// Signed IN when on a bookclicker.com authed route (/dashboard, /calendars,
// /my_lists, /confirm_promos, /marketplace). Signed OUT lands on the marketing
// page (/benefits) or a Devise sign-in/up path.
export function isBookclickerLoggedInUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl) return false
  let url: URL
  try { url = new URL(rawUrl) } catch { return false }
  if (!url.hostname.toLowerCase().includes('bookclicker.com')) return false
  const path = url.pathname.toLowerCase()
  if (path.includes('/sign_in') || path.includes('/sign_up') || path.startsWith('/benefits')) return false
  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/calendars') ||
    path.startsWith('/my_lists') ||
    path.startsWith('/confirm_promos') ||
    path.startsWith('/marketplace') ||
    path.startsWith('/my_books')
  )
}

// Polls the live session's open pages and reports whether the user has reached a
// signed-in BookClicker page yet. Read-only — never ends the session.
export async function checkBookclickerLoggedIn(
  cfg: BrowserbaseConfig,
  sessionId: string,
): Promise<{ loggedIn: boolean; url: string | null }> {
  const bb = browserbaseClient(cfg)
  const live = await bb.sessions.debug(sessionId)
  const pages = live.pages ?? []
  const match = pages.find(p => isBookclickerLoggedInUrl(p.url))
  if (match) return { loggedIn: true, url: match.url ?? null }
  return { loggedIn: false, url: pages[0]?.url ?? null }
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
  // kdpreports.amazon.com only renders signed-in — always counts.
  if (host === 'kdpreports.amazon.com') return true
  // kdp.amazon.com: Amazon drops users on /<locale>/bookshelf after login, and
  // that path redirects to sign-in when logged out — so a bookshelf/reports
  // path here is proof of login. The bare marketing root and /ap/signin pages
  // must NOT count (they render logged-out). Fixes the red "Please complete
  // login first" users saw while sitting, signed in, on their Bookshelf.
  if (host === 'kdp.amazon.com') {
    const path = url.pathname.toLowerCase()
    if (path.includes('/ap/')) return false // signin/mfa flows
    return path.includes('bookshelf') || path.includes('report')
  }
  return false
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
