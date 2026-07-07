// lib/browserbase/bookclicker-sync.ts
// Server-side BookClicker swap sync via Browserbase + Stagehand.
// Attaches to the user's persistent Context (cookies from the Live View connect),
// loads the dashboard, and extracts the three promo lists into SwapEntry rows:
//   • "Pending Sales Activity"  → inbound requests awaiting my confirmation
//   • "Promos Sent for You"     → inbound promos others send for my books
//   • "Recent Requests"         → outbound requests I made
// BookClicker is a friendly Rails app (cookie session, no 2FA), so the flow is a
// straight mirror of kdp-sync: timeout-guarded init, login check, extract, upsert.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, isBookclickerLoggedInUrl } from '@/lib/browserbase'

const BOOKCLICKER_DASHBOARD_URL = 'https://www.bookclicker.com/dashboard'

// A single promo row as read off the dashboard. promoDate is asked for as an ISO
// date so the model resolves "Thursday, July 23rd" against the current year for us.
const PromoRow = z.object({
  partnerName: z.string(),                 // the partner author/list name (verbatim)
  bookTitle:   z.string().nullable(),      // my book being promoted (null if not shown)
  promoDate:   z.string().nullable(),      // ISO YYYY-MM-DD
  promoStyle:  z.string().nullable(),      // "feature" | "mention" | "solo" | null
  statusLabel: z.string().nullable(),      // verbatim status: sent/swapped/paid/cancelled/declined/pending/not sent
})

const DashboardSchema = z.object({
  myListLabel:    z.string().nullable(),   // e.g. "Elle Wilder (Contemporary Romance...)"
  pendingInbound: z.array(PromoRow),       // Pending Sales Activity
  promosForMe:    z.array(PromoRow),       // Promos Sent for You
  outboundRequests: z.array(PromoRow),     // Recent Requests
})

type Role = 'inbound' | 'outbound'

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

// Upsert a synced promo by its natural key so re-syncs update in place instead of
// duplicating — and never touch manually-entered rows (matched key won't collide
// because sync rows always carry platform 'bookclicker' + a resolved promoDate).
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
  const data = {
    userId,
    promoType: paymentType === 'paid' ? 'paid_promo' : 'swap',
    role,
    platform: 'bookclicker',
    partnerName: row.partnerName,
    myBook: row.bookTitle ?? null,
    myList,
    swapType: normalizeStyle(row.promoStyle),
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
    await db.swapEntry.update({ where: { id: existing.id }, data: { confirmation, paymentType, swapType: data.swapType } })
    return 'updated'
  }
  await db.swapEntry.create({ data })
  return 'created'
}

export async function syncBookclickerForUser(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { bookclickerContextId: true },
  })

  if (!user?.bookclickerContextId) {
    await db.syncLog.create({
      data: {
        userId, source: 'bookclicker', status: 'failed',
        errorType: 'no_context',
        errorDetail: 'No bookclickerContextId stored for this user. Connect BookClicker first.',
      },
    })
    return
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    await db.syncLog.create({
      data: {
        userId, source: 'bookclicker', status: 'failed',
        errorType: 'config_missing',
        errorDetail: 'BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID not set.',
      },
    })
    return
  }

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
    await Promise.race([
      stagehand.init(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Stagehand init/connect timed out after 90s — Browserbase session never became drivable (likely a locked Context)')), 90_000),
      ),
    ])
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
      await db.user.update({ where: { id: userId }, data: { bookclickerSyncStatus: 'needs_reauth' } })
      await db.syncLog.update({
        where: { id: syncLogEntry.id },
        data: {
          status: 'expired', completedAt: new Date(),
          errorType: 'session_expired',
          errorDetail: `Redirected away from dashboard: ${currentUrl}`,
        },
      })
      return
    }

    // Extract the three promo lists in one pass.
    const thisYear = new Date().getFullYear()
    const extractPromise = stagehand.extract(
      `This is the BookClicker author dashboard. Read the promo lists and return them.
For every date like "Thursday, July 23rd", resolve it to an ISO date (YYYY-MM-DD). Assume the year is ${thisYear} unless the month clearly falls earlier in the year than the current month, in which case it may be ${thisYear + 1}. Copy partner names verbatim.
- myListLabel: the pen name / list heading (e.g. "Elle Wilder (Contemporary Romance...)").
- pendingInbound: rows under "Pending Sales Activity" (partner requesting a feature/mention on a date). promoStyle = feature or mention. statusLabel = "pending".
- promosForMe: rows under "Promos Sent for You" (someone sending one of my books on a date). bookTitle = my book. statusLabel = the SENT / NOT SENT label.
- outboundRequests: rows under "Recent Requests" (a request I made for one of my books). bookTitle = my book. statusLabel = the status word (sent / swapped / paid / cancelled / declined).`,
      DashboardSchema,
    )
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('BookClicker extraction timed out after 90s')), 90_000),
    )
    const result = await Promise.race([extractPromise, timeoutPromise])

    const myList = result.myListLabel?.trim() || 'BookClicker'
    let rowsFetched = 0
    const tally = async (rows: z.infer<typeof PromoRow>[], role: Role) => {
      for (const row of rows) {
        const outcome = await upsertSwapEntry(userId, myList, role, row)
        if (outcome !== 'skipped') rowsFetched++
      }
    }
    await tally(result.pendingInbound, 'inbound')
    await tally(result.promosForMe, 'inbound')
    await tally(result.outboundRequests, 'outbound')

    await db.user.update({
      where: { id: userId },
      data: { bookclickerLastSyncAt: new Date(), bookclickerSyncStatus: 'connected' },
    })
    await db.syncLog.update({
      where: { id: syncLogEntry.id },
      data: { status: 'success', completedAt: new Date(), rowsFetched },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', completedAt: new Date(), errorType: 'sync_error', errorDetail: msg.slice(0, 1000) },
      }).catch(() => undefined)
    } else {
      await db.syncLog.create({
        data: { userId, source: 'bookclicker', status: 'failed', sessionId: bbSessionId, completedAt: new Date(), errorType: 'sync_error', errorDetail: msg.slice(0, 1000) },
      })
    }
  } finally {
    try { await stagehand.close() } catch { /* ignore close errors */ }
  }
}
