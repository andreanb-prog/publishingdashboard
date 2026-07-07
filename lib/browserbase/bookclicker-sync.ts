// lib/browserbase/bookclicker-sync.ts
// Server-side BookClicker swap sync via Browserbase + Stagehand.
// Attaches to the user's persistent Context (cookies from the Live View connect),
// loads the dashboard, and extracts the promo lists into SwapEntry rows.
//
// The dashboard carries ~80+ rows per list, so a single extract call blew past the
// timeout. Extraction is therefore CHUNKED — one Stagehand call per list (plus the
// calendar) with its own timeout, and rows are upserted after EACH chunk so a
// failure partway still persists everything extracted before it.
//
// Concurrency is guarded with bookclickerSyncStatus as a lock ('syncing'), released
// in a finally block; a lock whose heartbeat (bookclickerLastSyncAt) is older than
// STALE_LOCK_MS is treated as stale and reclaimed.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, isBookclickerLoggedInUrl } from '@/lib/browserbase'

const BOOKCLICKER_DASHBOARD_URL = 'https://www.bookclicker.com/dashboard'

const INIT_TIMEOUT_MS  = 90_000        // hard cap on attach/init (catches a locked Context)
const CHUNK_TIMEOUT_MS = 50_000        // per-list extraction cap
const OUTBOUND_TIMEOUT_MS = 120_000    // Recent Requests is the longest list; give it more room
const INTER_CHUNK_MS   = 1_000         // small breather between chunks (avoids LLM rate spikes)
export const STALE_LOCK_MS = 10 * 60_000 // a 'syncing' lock older than this is stale

// A single promo row as read off a dashboard list. promoDate is asked for as an ISO
// date so the model resolves "Thursday, July 23rd" against the current year for us.
const PromoRow = z.object({
  partnerName: z.string(),                 // the partner author/list name (verbatim)
  bookTitle:   z.string().nullable(),      // my book being promoted (null if not shown)
  promoDate:   z.string().nullable(),      // ISO YYYY-MM-DD
  promoStyle:  z.string().nullable(),      // "feature" | "mention" | "solo" | null
  statusLabel: z.string().nullable(),      // verbatim status: sent/swapped/paid/cancelled/declined/pending/not sent
})
const ListSchema = z.object({ rows: z.array(PromoRow) })
const CalendarSchema = z.object({
  bookedDates: z.array(z.object({ date: z.string().nullable(), state: z.string().nullable() })),
})

type Role = 'inbound' | 'outbound'
type ChunkResult = { name: string; extracted: number; upserted: number; ms: number; error?: string }

// Map a BookClicker status label onto the SwapEntry `confirmation` enum
// ("applied" | "approved" | "cancelled" | "complete") and payment type.
function mapStatus(raw: string | null): { confirmation: string; paymentType: string } {
  const s = (raw ?? '').toLowerCase().trim()
  if (s.includes('cancel') || s.includes('declin')) return { confirmation: 'cancelled', paymentType: 'swap' }
  if (s === 'paid' || s.includes('paid'))           return { confirmation: 'approved', paymentType: 'paid' }
  if (s === 'sent')                                  return { confirmation: 'complete', paymentType: 'swap' }
  if (s === 'not sent' || s.includes('not sent'))    return { confirmation: 'approved', paymentType: 'swap' }
  if (s.includes('swap'))                            return { confirmation: 'approved', paymentType: 'swap' }
  if (s.includes('pending') || s === '')            return { confirmation: 'applied',  paymentType: 'swap' }
  return { confirmation: 'applied', paymentType: 'swap' }
}

function normalizeStyle(raw: string | null): string | null {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('feature')) return 'feature'
  if (s.includes('mention')) return 'mention'
  if (s.includes('solo'))    return 'solo'
  return null
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)),
  ])
}

// Upsert a synced promo by its natural key so re-syncs update in place instead of
// duplicating — and never touch manually-entered rows (matched key always carries
// platform 'bookclicker' + a resolved promoDate).
async function upsertSwapEntry(
  userId: string,
  myList: string,
  role: Role,
  row: z.infer<typeof PromoRow>,
): Promise<'created' | 'updated' | 'skipped'> {
  if (!row.partnerName || !row.promoDate) return 'skipped'
  const promoDate = new Date(row.promoDate)
  if (isNaN(promoDate.getTime())) return 'skipped'

  const { confirmation, paymentType } = mapStatus(row.statusLabel)
  const swapType = normalizeStyle(row.promoStyle)
  const data = {
    userId,
    promoType: paymentType === 'paid' ? 'paid_promo' : 'swap',
    role,
    platform: 'bookclicker',
    partnerName: row.partnerName,
    myBook: row.bookTitle ?? null,
    myList,
    swapType,
    promoDate,
    confirmation,
    paymentType,
    notes: 'Synced from BookClicker',
  }

  const existing = await db.swapEntry.findFirst({
    where: {
      userId,
      platform: 'bookclicker',
      role,
      partnerName: row.partnerName,
      promoDate,
      myBook: row.bookTitle ?? null,
    },
    select: { id: true },
  })

  if (existing) {
    await db.swapEntry.update({ where: { id: existing.id }, data: { confirmation, paymentType, swapType } })
    return 'updated'
  }
  await db.swapEntry.create({ data })
  return 'created'
}

// Runs one list extraction chunk: extract → upsert each row → return a tally.
// Never throws — a failed chunk returns an error result so the caller can continue
// to the remaining chunks (and everything upserted so far is already persisted).
async function runListChunk(
  stagehand: Stagehand,
  userId: string,
  myList: string,
  name: string,
  role: Role,
  instruction: string,
  timeoutMs: number = CHUNK_TIMEOUT_MS,
): Promise<ChunkResult> {
  const t0 = Date.now()
  try {
    const out = await withTimeout(stagehand.extract(instruction, ListSchema), timeoutMs, `${name} extraction`)
    const rows = out.rows ?? []
    let upserted = 0
    for (const row of rows) {
      const outcome = await upsertSwapEntry(userId, myList, role, row)
      if (outcome !== 'skipped') upserted++
    }
    const res: ChunkResult = { name, extracted: rows.length, upserted, ms: Date.now() - t0 }
    console.log(`[bc-sync] chunk ${name}: ${res.extracted} extracted / ${res.upserted} upserted in ${(res.ms / 1000).toFixed(1)}s`)
    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[bc-sync] chunk ${name} FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${msg}`)
    return { name, extracted: 0, upserted: 0, ms: Date.now() - t0, error: msg }
  }
}

const PENDING_PROMPT =
  `On the BookClicker dashboard, read ONLY the "Pending Sales Activity" section (inbound booking requests awaiting my confirmation). Return { rows: [...] }. For each request: partnerName = the requesting partner's name verbatim; bookTitle = my list/book named in the request or null; promoDate = the requested date as ISO YYYY-MM-DD (resolve "Thursday, July 23rd" to the nearest such date; assume the current year unless the month is clearly earlier in the year than now, then next year); promoStyle = "feature" or "mention"; statusLabel = "pending".`
const PROMOS_FOR_ME_PROMPT =
  `On the BookClicker dashboard, read ONLY the "Promos Sent for You" section (promos other authors send FOR my books). Return { rows: [...] }. For each: partnerName = the sending author's name verbatim; bookTitle = my book being sent; promoDate = the send date as ISO YYYY-MM-DD (resolve relative to the current year as above); promoStyle = null; statusLabel = the SENT / NOT SENT label shown for that row.`
const OUTBOUND_PROMPT =
  `On the BookClicker dashboard, read ONLY the "Recent Requests" section (requests I sent to others for my books). This list can be very long — capture ONLY the 30 most recent entries (the newest 30 rows, i.e. those at the top / with the most recent dates); ignore everything older. Return { rows: [...] } with at most 30 items. For each: partnerName = the recipient partner's name verbatim; bookTitle = my book named; promoDate = the date as ISO YYYY-MM-DD (resolve relative to the current year as above); promoStyle = null; statusLabel = the status word (sent / swapped / paid / cancelled / declined).`

// Resolve the list label and calendar URL from the dashboard DOM (no LLM cost).
async function resolveDashboardMeta(page: any): Promise<{ myList: string; calendarUrl: string | null }> {
  let myList = 'BookClicker'
  let calendarUrl: string | null = null
  try {
    const info = await page.evaluate(() => {
      const text = document.body.innerText || ''
      let label = ''
      const idx = text.indexOf('Your Lists')
      if (idx !== -1) {
        const after = text.slice(idx + 'Your Lists'.length).split('\n').map(s => s.trim()).filter(Boolean)
        if (after[0]) label = after[0].replace(/\s+\d[\d,]*\s.*$/, '').trim() // strip trailing counts/percentages
      }
      const cal = Array.from(document.querySelectorAll('a'))
        .map(a => (a as HTMLAnchorElement).href)
        .find(h => /\/calendars\/\d+/.test(h)) || null
      return { label, cal }
    })
    if (info?.label) myList = info.label
    if (info?.cal) calendarUrl = info.cal
  } catch { /* fall back to defaults */ }
  return { myList, calendarUrl }
}

export async function syncBookclickerForUser(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { bookclickerContextId: true, bookclickerSyncStatus: true, bookclickerLastSyncAt: true },
  })

  if (!user?.bookclickerContextId) {
    await db.syncLog.create({
      data: { userId, source: 'bookclicker', status: 'failed', errorType: 'no_context', errorDetail: 'No bookclickerContextId stored for this user. Connect BookClicker first.', completedAt: new Date() },
    })
    return
  }

  // ── Concurrency lock ──────────────────────────────────────────────────────
  // If a sync is already in flight and its heartbeat is fresh, skip. A stale lock
  // (heartbeat older than STALE_LOCK_MS, e.g. a prior run killed by Vercel) is
  // reclaimed so a jammed status can never permanently block syncing.
  const lockFresh =
    user.bookclickerSyncStatus === 'syncing' &&
    user.bookclickerLastSyncAt != null &&
    (Date.now() - user.bookclickerLastSyncAt.getTime()) < STALE_LOCK_MS
  if (lockFresh) {
    await db.syncLog.create({
      data: { userId, source: 'bookclicker', status: 'skipped', errorType: 'in_flight', errorDetail: 'A BookClicker sync is already running (lock held).', completedAt: new Date() },
    })
    return
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    await db.syncLog.create({
      data: { userId, source: 'bookclicker', status: 'failed', errorType: 'config_missing', errorDetail: 'BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID not set.', completedAt: new Date() },
    })
    return
  }

  // Acquire the lock: bookclickerLastSyncAt doubles as the lock heartbeat.
  await db.user.update({
    where: { id: userId },
    data: { bookclickerSyncStatus: 'syncing', bookclickerLastSyncAt: new Date() },
  })

  // finalStatus is the terminal status restored in `finally` (which releases the
  // lock). Default 'connected'; transient/rate-limit errors keep us connected, only
  // a real login expiry flips to 'needs_reauth'.
  let finalStatus = 'connected'

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    disablePino: true,
    verbose: 0,
    logger: (line) => {
      try { console.log('[stagehand:bc]', typeof line === 'string' ? line : JSON.stringify(line)) } catch { /* ignore */ }
    },
    browserbaseSessionCreateParams: {
      projectId: cfg.projectId,
      browserSettings: { context: { id: user.bookclickerContextId, persist: true } },
    },
  })

  let bbSessionId: string | undefined
  let syncLogId: string | undefined

  try {
    await withTimeout(stagehand.init(), INIT_TIMEOUT_MS, 'Stagehand init/connect')
    bbSessionId = stagehand.browserbaseSessionID ?? undefined

    const syncLogEntry = await db.syncLog.create({
      data: { userId, source: 'bookclicker', status: 'failed', sessionId: bbSessionId },
    })
    syncLogId = syncLogEntry.id

    const page = stagehand.context.activePage()
    if (!page) throw new Error('No active page in Browserbase session')

    await page.goto(BOOKCLICKER_DASHBOARD_URL, { waitUntil: 'load', timeoutMs: 20_000 })
    await page.waitForTimeout(3000)

    // Login check: signed-out sessions redirect to /benefits or a sign-in page.
    const currentUrl = page.url()
    if (!isBookclickerLoggedInUrl(currentUrl)) {
      finalStatus = 'needs_reauth'
      await db.syncLog.update({
        where: { id: syncLogEntry.id },
        data: { status: 'expired', completedAt: new Date(), errorType: 'session_expired', errorDetail: `Redirected away from dashboard: ${currentUrl}` },
      })
      return
    }

    const { myList, calendarUrl } = await resolveDashboardMeta(page)

    // ── Chunked extraction: one Stagehand call per list, upsert after each. ──
    const chunks: ChunkResult[] = []
    chunks.push(await runListChunk(stagehand, userId, myList, 'pendingInbound', 'inbound', PENDING_PROMPT))
    await page.waitForTimeout(INTER_CHUNK_MS)
    chunks.push(await runListChunk(stagehand, userId, myList, 'promosForMe', 'inbound', PROMOS_FOR_ME_PROMPT))
    await page.waitForTimeout(INTER_CHUNK_MS)
    chunks.push(await runListChunk(stagehand, userId, myList, 'outboundRequests', 'outbound', OUTBOUND_PROMPT, OUTBOUND_TIMEOUT_MS))

    // ── Calendar chunk: confirms the forward schedule. BookClicker's calendar is
    // color-coded by date with no partner/book detail (verified in recon), so this
    // chunk is informational — it extracts booked dates + state and logs them, but
    // produces no SwapEntry rows (the three lists above are the row source). ──
    if (calendarUrl) {
      const t0 = Date.now()
      try {
        await page.waitForTimeout(INTER_CHUNK_MS)
        await page.goto(calendarUrl, { waitUntil: 'load', timeoutMs: 20_000 })
        await page.waitForTimeout(2000)
        const cal = await withTimeout(
          stagehand.extract(
            `This BookClicker calendar month grid color-codes each day by promo state. Return { bookedDates: [...] } listing every day cell that is NOT empty/grey: date = the day's ISO date (YYYY-MM-DD), state = a short label for its colour/state (e.g. "booked", "available", "today").`,
            CalendarSchema,
          ),
          CHUNK_TIMEOUT_MS, 'calendar extraction',
        )
        const n = cal.bookedDates?.length ?? 0
        chunks.push({ name: 'calendar', extracted: n, upserted: 0, ms: Date.now() - t0 })
        console.log(`[bc-sync] chunk calendar: ${n} dated cells extracted (informational; 0 upserted) in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        chunks.push({ name: 'calendar', extracted: 0, upserted: 0, ms: Date.now() - t0, error: msg })
        console.warn(`[bc-sync] chunk calendar FAILED: ${msg}`)
      }
    }

    // ── Roll up per-chunk outcomes into the sync log. ──
    const totalUpserted = chunks.reduce((s, c) => s + c.upserted, 0)
    const okChunks = chunks.filter(c => !c.error).length
    const failedChunks = chunks.filter(c => c.error)
    const allRateLimited = failedChunks.length > 0 && failedChunks.every(c => /\b429\b|rate limit/i.test(c.error!))

    const summary = chunks.map(c =>
      `${c.name}: ${c.extracted}extracted/${c.upserted}upserted ${(c.ms / 1000).toFixed(1)}s${c.error ? ` ERROR(${c.error.slice(0, 60)})` : ''}`
    ).join(' | ')

    const status = okChunks > 0 ? 'success' : (allRateLimited ? 'rate_limited' : 'failed')

    await db.syncLog.update({
      where: { id: syncLogEntry.id },
      data: { status, completedAt: new Date(), rowsFetched: totalUpserted, errorDetail: summary.slice(0, 1000), errorType: failedChunks.length ? 'partial_or_failed_chunks' : null },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isRate = /\b429\b|rate limit/i.test(msg)
    const status = isRate ? 'rate_limited' : 'failed'
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: { status, completedAt: new Date(), errorType: 'sync_error', errorDetail: msg.slice(0, 1000) },
      }).catch(() => undefined)
    } else {
      await db.syncLog.create({
        data: { userId, source: 'bookclicker', status, sessionId: bbSessionId, completedAt: new Date(), errorType: 'sync_error', errorDetail: msg.slice(0, 1000) },
      })
    }
    // Transient/rate-limit errors keep the user connected; login expiry is the only
    // path that sets 'needs_reauth' (handled above), so leave finalStatus as-is.
  } finally {
    // Release the lock: restore the terminal status + refresh the heartbeat.
    await db.user.update({
      where: { id: userId },
      data: { bookclickerSyncStatus: finalStatus, bookclickerLastSyncAt: new Date() },
    }).catch(() => undefined)
    try { await stagehand.close() } catch { /* ignore close errors */ }
  }
}
