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
//
// Besides the dashboard lists (the user's own promo requests), the sync also captures
// SEND OBLIGATIONS — swaps the user must send for partners — from each mailing list's
// calendar via its per-date JSON endpoint (/api/one_day_inventories). Lists are
// enumerated from /my_lists (accounts can have several); rows are stored as role
// 'outbound-send' with the list's pen name in myList.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, isBookclickerLoggedInUrl } from '@/lib/browserbase'

const BOOKCLICKER_DASHBOARD_URL = 'https://www.bookclicker.com/dashboard'
const BOOKCLICKER_MY_LISTS_URL  = 'https://www.bookclicker.com/my_lists'

const INIT_TIMEOUT_MS  = 90_000        // hard cap on attach/init (catches a locked Context)
const CHUNK_TIMEOUT_MS = 50_000        // default per-list extraction cap
const LONG_CHUNK_TIMEOUT_MS = 120_000  // "Promos Sent for You" + "Recent Requests" are the long lists
const INTER_CHUNK_MS   = 1_000         // small breather between chunks (avoids LLM rate spikes)
export const STALE_LOCK_MS = 10 * 60_000 // a 'syncing' lock older than this is stale

// Send-obligation scan (what Andrea sends for OTHERS, off the list calendar's
// per-date JSON endpoint /api/one_day_inventories?date=...&list_id=...).
const SEND_SCAN_DAYS_AHEAD = 60        // scan today → +60 days
const SEND_DATE_TIMEOUT_MS = 60_000    // per-date fetch cap
const SEND_INTER_DATE_MS   = 150       // breather between per-date fetches
const SEND_MAX_CONSECUTIVE_FAILURES = 3 // endpoint clearly broken — stop scanning
const SEND_MAX_LISTS = 10              // sanity cap on lists scanned per account
const SYNC_BUDGET_MS = 270_000         // route has 300s; stop iterating dates near it

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
type ChunkResult = { name: string; extracted: number; upserted: number; ms: number; error?: string; detail?: string }

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

// ── partnerName cleanup ───────────────────────────────────────────────────
// Some BookClicker authors put their swap criteria (genre rules, "No Erotica",
// "link 7 days in advance", etc.) directly INTO their pen-name field rather
// than in a separate field — BookClicker has no dedicated place for it. Both
// the dashboard list extraction (Stagehand/LLM, verbatim per PromoRow) and the
// send-obligation JSON fetch (book.author / adopted_pen_name, raw) pass that
// blob straight through as partnerName. This is real upstream data, not a
// parsing bug on our end — splitPartnerName() heuristically isolates the pen
// name (typically 1-3 words, Title Case or ALL CAPS, optionally with a
// trailing "#N" list-slot marker) from the trailing preferences blob so it
// can be moved into notes instead.
//
// Approach: cut the string at the earliest "blob starts here" delimiter
// (paren/bracket/brace, pipe, colon, semicolon, comma, tilde, asterisk,
// en/em dash, " -" space-dash, a dash glued to a known genre word, or a
// sentence-ending period not part of an initial like "E.C."), then trim any
// trailing genre/logistics keywords or stray punctuation left on the name
// side of that cut (e.g. "Cora Kingsley Romance ," → cut after "Romance" on
// the comma, then "Romance" itself gets trimmed as a stoplisted word).
const PARTNER_NAME_STOPWORDS = new Set([
  'romance', 'contemporary', 'steamy', 'cr', 'csr', 'romcom', 'contemp', 'rom',
  'genres', 'genre', 'other', 'actual', 'fpa', 'sports', 'billionaire',
  'billionaires', 'small', 'town', 'towns', 'erotica', 'paranormal', 'pnr',
  'no', 'please', 'swap', 'swaps', 'paid', 'solo', 'solos', 'feature',
  'features', 'mention', 'mentions', 'lm', 'lms', 'link', 'links', 'clean',
  'dark', 'mafia', 'cowboy', 'cowboys', 'lgbtq', 'lgbt', 'lgtbq', 'rh', 'arc',
  'arcs', 'boxset', 'boxsets', 'box', 'sets', 'set', 'only', 'welcome',
  'same', 'once', 'month', 'months', 'list', 'lists', 'size', 'click', 'rate',
  'weekly', 'free', 'freebies', 'friday', 'sunday', 'saturday', 'monday',
  'tuesday', 'wednesday', 'thursday', 'bookfunnel', 'newsletter', 'main',
  'lead', 'magnet', 'optin', 'notice', 'sci-fi', 'fantasy', 'cozy',
  'historical', 'age', 'gap', 'and', '&', '-',
])
const PARTNER_NAME_NON_NAME_TOKEN = /^[&~*|:;,.\-–—/]+$/
const PARTNER_NAME_LEADING_TAG_RE = /^\(?FPA\)?[\s-]*/i
const PARTNER_NAME_DELIM_RE =
  /\(|\[|\{|\||:|;|,|~|\*|[–—]|\s-|-(?=(?:Contemporary|Steamy|Romance|RomCom|CR|CSR)\b)|(?<!\b[A-Za-z])\.\s+/i

export function splitPartnerName(raw: string): { name: string; extra: string | null } {
  const original = (raw ?? '').trim()
  if (!original) return { name: original, extra: null }

  const destagged = original.replace(PARTNER_NAME_LEADING_TAG_RE, '')
  const leadingTag = original.slice(0, original.length - destagged.length)

  const m = PARTNER_NAME_DELIM_RE.exec(destagged)
  const candidate = m ? destagged.slice(0, m.index) : destagged

  const tokens = candidate.split(/\s+/).filter(Boolean)
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1]
    const bare = last.replace(/[^a-zA-Z&-]/g, '').toLowerCase()
    if (PARTNER_NAME_STOPWORDS.has(bare) || PARTNER_NAME_NON_NAME_TOKEN.test(last)) {
      tokens.pop()
    } else {
      break
    }
  }
  const name = tokens.join(' ').trim()

  if (!name || (name === destagged && !leadingTag)) return { name: original, extra: null }

  let extra = (leadingTag + destagged.slice(name.length)).trim()
  extra = extra.replace(/^[\s,;:.\-–—()[\]{}|~*/]+/, '').replace(/[\s,;:.\-–—()[\]{}|~*/]+$/, '').trim()

  return { name, extra: extra || null }
}

// Appends a partner-preferences blob to a base notes string, if present.
export function withPartnerPreferences(baseNotes: string, extra: string | null): string {
  return extra ? `${baseNotes} — Partner preferences: ${extra}` : baseNotes
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

  const { name: partnerName, extra } = splitPartnerName(row.partnerName)
  const { confirmation, paymentType } = mapStatus(row.statusLabel)
  const swapType = normalizeStyle(row.promoStyle)
  const data = {
    userId,
    promoType: paymentType === 'paid' ? 'paid_promo' : 'swap',
    role,
    platform: 'bookclicker',
    partnerName,
    myBook: row.bookTitle ?? null,
    myList,
    swapType,
    promoDate,
    confirmation,
    paymentType,
    notes: withPartnerPreferences('Synced from BookClicker', extra),
  }

  const existing = await db.swapEntry.findFirst({
    where: {
      userId,
      platform: 'bookclicker',
      role,
      partnerName,
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

// Calendar chunk: confirms the forward schedule. BookClicker's calendar is
// color-coded by date with no partner/book detail (verified in recon), so this
// chunk is informational — it extracts booked dates + state and logs them, but
// produces no SwapEntry rows (the three lists are the row source). It navigates
// AWAY from the dashboard, so callers must return to the dashboard afterward.
async function runCalendarChunk(stagehand: Stagehand, page: any, calendarUrl: string): Promise<ChunkResult> {
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
    console.log(`[bc-sync] chunk calendar: ${n} dated cells extracted (informational; 0 upserted) in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    return { name: 'calendar', extracted: n, upserted: 0, ms: Date.now() - t0 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[bc-sync] chunk calendar FAILED: ${msg}`)
    return { name: 'calendar', extracted: 0, upserted: 0, ms: Date.now() - t0, error: msg }
  }
}

// ── Send obligations (role 'outbound-send') ──────────────────────────────────
// BookClicker's list calendar is fed by GET /api/one_day_inventories?date=YYYY-MM-DD
// &list_id=<id> (discovered 2026-07-06: fired on day-tile click, plain session-cookie
// GET). Its accepted_system_bookings / pending_system_bookings (grouped solo/feature/
// mention) are the swaps ANDREA MUST SEND for partners on that date — the under-
// captured half of the swap ledger. We fetch it in-page (same origin, cookies attached),
// no LLM extraction needed.

// Minimal booking shape returned by the in-page fetch (see buildSendFetchScript).
type SendBooking = {
  invType: string | null        // "solo" | "feature" | "mention"
  phase: 'accepted' | 'pending'
  author: string | null         // partner pen name (book.author)
  penName: string | null        // fallback partner name (swap_offer_list.adopted_pen_name)
  title: string | null          // partner's book title (best-effort / placeholder)
  listName: string | null       // partner's list name
  listSize: number | null       // partner's active_member_count
  paymentOffer: number | null   // >0 → paid promo, else swap
  sendConfirmed: boolean
  cancelled: boolean
}

// The in-page fetch, as a string IIFE so no closure/arg marshalling is needed.
// dateISO and listId are validated by the caller before interpolation.
function buildSendFetchScript(listId: number, dateISO: string): string {
  return `(async () => {
    const r = await fetch('/api/one_day_inventories?date=${dateISO}&list_id=${listId}', {
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
    })
    if (!r.ok) return { ok: false, status: r.status }
    const j = await r.json()
    const pick = (b, group, phase) => ({
      invType: b.inv_type ?? group,
      phase,
      author: b.book?.author ?? null,
      penName: b.swap_offer_list?.adopted_pen_name ?? null,
      title: b.book?.title ?? null,
      listName: b.swap_offer_list?.name ?? null,
      listSize: b.swap_offer_list?.active_member_count ?? null,
      paymentOffer: b.payment_offer ?? null,
      sendConfirmed: !!b['send_confirmed?'],
      cancelled: !!(b.buyer_cancelled_at || b.seller_cancelled_at || b.system_cancelled_at),
    })
    const bookings = []
    for (const group of ['solo', 'feature', 'mention']) {
      for (const b of (j.accepted_system_bookings?.[group] ?? [])) bookings.push(pick(b, group, 'accepted'))
      for (const b of (j.pending_system_bookings?.[group] ?? [])) bookings.push(pick(b, group, 'pending'))
    }
    return { ok: true, status: r.status, bookings }
  })()`
}

// One of the account's BookClicker mailing lists, as read off /my_lists.
type BookclickerList = {
  penName: string          // the list's public pen name → stored as myList
  listId: number           // BookClicker list/calendar id
  calendarUrl: string
  size: number | null      // subscriber count (log-only)
}

// Enumerate the account's lists from /my_lists: a table with one row per mailing
// list (Public Pen Name, Size, Platform, …) and a calendar-icon link per row to
// that list's calendar. Pure DOM read, no LLM. Users can have several lists
// (a known beta user has 3), each with its own calendar — never assume one.
// Navigates away from wherever the page was.
async function enumerateBookclickerLists(page: any): Promise<BookclickerList[]> {
  await page.goto(BOOKCLICKER_MY_LISTS_URL, { waitUntil: 'load', timeoutMs: 20_000 })
  await page.waitForTimeout(2000)
  const raw: Array<{ penName: string; calendarUrl: string; size: number | null }> =
    await page.evaluate(() => {
      const out: Array<{ penName: string; calendarUrl: string; size: number | null }> = []
      for (const a of Array.from(document.querySelectorAll('a'))) {
        const href = (a as HTMLAnchorElement).href
        if (!/\/calendars\/\d+/.test(href)) continue
        const row = a.closest('tr')
        if (!row) continue
        const cells = Array.from(row.querySelectorAll('td')).map(td => (td.textContent || '').trim())
        const penName = (cells.find(t => t && !/^[\d,.]+%?$/.test(t)) || '').split('\n')[0].trim()
        const sizeText = cells.find(t => /^[\d,]+$/.test(t))
        out.push({ penName, calendarUrl: href, size: sizeText ? Number(sizeText.replace(/,/g, '')) : null })
      }
      return out
    })

  // Dedupe by calendar id (a row can carry more than one link to its calendar).
  const byId = new Map<number, BookclickerList>()
  for (const r of raw ?? []) {
    const m = r.calendarUrl.match(/\/calendars\/(\d+)/)
    if (!m) continue
    const listId = Number(m[1])
    if (!byId.has(listId)) {
      byId.set(listId, { penName: r.penName || `List ${listId}`, listId, calendarUrl: r.calendarUrl, size: r.size })
    }
  }
  const lists = Array.from(byId.values()).slice(0, SEND_MAX_LISTS)
  console.log(`[bc-sync] my_lists: ${lists.length} list(s) — ${lists.map(l => `${l.penName} (#${l.listId}${l.size != null ? `, ${l.size} subs` : ''})`).join('; ')}`)
  return lists
}

// Upsert one send obligation. Natural key: list + partner name + promo date
// (+ inv type, which is fixed per booking) — the same partner can book sends on
// two of the user's lists for the same date, so the list is part of the key.
// Titles can be placeholders, so they are stored best-effort in theirBook but
// never used to match. The BookClicker list id is written to sourceListId (and
// kept in notes for human readability).
async function upsertSendObligation(
  userId: string,
  list: BookclickerList,
  promoDate: Date,
  b: SendBooking,
): Promise<'created' | 'updated' | 'skipped'> {
  const rawPartnerName = (b.author || b.penName || '').trim()
  if (!rawPartnerName) return 'skipped'
  const { name: partnerName, extra } = splitPartnerName(rawPartnerName)

  const confirmation =
    b.cancelled ? 'cancelled' :
    b.sendConfirmed ? 'complete' :
    b.phase === 'pending' ? 'applied' : 'approved'
  const paymentType = (b.paymentOffer ?? 0) > 0 ? 'paid' : 'swap'
  const swapType = normalizeStyle(b.invType)

  const existing = await db.swapEntry.findFirst({
    where: { userId, platform: 'bookclicker', role: 'outbound-send', myList: list.penName, partnerName, promoDate, swapType },
    select: { id: true },
  })
  const shared = {
    confirmation,
    paymentType,
    theirBook: b.title ?? null,
    partnerListName: b.listName ?? null,
    partnerListSize: b.listSize ?? null,
    sourceListId: String(list.listId),
  }
  if (existing) {
    await db.swapEntry.update({ where: { id: existing.id }, data: shared })
    return 'updated'
  }
  await db.swapEntry.create({
    data: {
      userId,
      promoType: paymentType === 'paid' ? 'paid_promo' : 'swap',
      role: 'outbound-send',
      platform: 'bookclicker',
      partnerName,
      myList: list.penName,
      swapType,
      promoDate,
      notes: withPartnerPreferences(`Synced from BookClicker send calendar (list ${list.listId})`, extra),
      ...shared,
    },
  })
  return 'created'
}

// Scans ONE list's calendar, yesterday → +SEND_SCAN_DAYS_AHEAD days, against the
// per-date JSON endpoint (yesterday because Vercel runs UTC and Andrea is UTC-10 —
// UTC "today" can already be tomorrow in Hawaii). One fetch per date, 60s cap each,
// upsert after each date, per-date outcome logged and rolled up per month. Stops
// gracefully when the sync nears the 300s route budget or the endpoint fails
// repeatedly; upserts are idempotent so the next sync resumes the remainder.
// Navigates to the list's calendar page for a same-origin fetch context, so
// callers must return to the dashboard afterward.
async function runSendObligationsChunk(
  page: any,
  userId: string,
  list: BookclickerList,
  syncStartMs: number,
): Promise<ChunkResult> {
  const t0 = Date.now()
  const name = `sendObligations:${list.penName}`
  const listId = list.listId

  try {
    await page.goto(list.calendarUrl, { waitUntil: 'load', timeoutMs: 20_000 })
    await page.waitForTimeout(1500)

    const dates: string[] = []
    for (let d = -1; d <= SEND_SCAN_DAYS_AHEAD; d++) {
      dates.push(new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10))
    }

    let extracted = 0
    let upserted = 0
    let consecutiveFailures = 0
    const datesWithBookings: string[] = []
    let stoppedEarly: string | null = null

    for (let i = 0; i < dates.length; i++) {
      const dateISO = dates[i]
      const elapsedTotal = Date.now() - syncStartMs
      if (elapsedTotal > SYNC_BUDGET_MS) {
        stoppedEarly = `budget: ${dates.length - i} dates unprocessed (${dates[i]}…${dates[dates.length - 1]}); next sync resumes`
        console.warn(`[bc-sync] sendObligations stopping at ${(elapsedTotal / 1000).toFixed(0)}s cumulative elapsed — ${stoppedEarly}`)
        break
      }

      try {
        const out = await withTimeout(
          page.evaluate(buildSendFetchScript(listId, dateISO)) as Promise<{ ok: boolean; status: number; bookings?: SendBooking[] }>,
          SEND_DATE_TIMEOUT_MS, `send scan ${dateISO}`,
        )
        if (!out?.ok) throw new Error(`HTTP ${out?.status ?? '?'}`)
        consecutiveFailures = 0
        const bookings = out.bookings ?? []
        extracted += bookings.length
        let dayUpserts = 0
        for (const b of bookings) {
          const outcome = await upsertSendObligation(userId, list, new Date(dateISO), b)
          if (outcome !== 'skipped') { upserted++; dayUpserts++ }
        }
        if (bookings.length > 0) {
          datesWithBookings.push(`${dateISO}:${bookings.length}`)
          console.log(`[bc-sync] send scan [${list.penName}] ${dateISO}: ${bookings.length} bookings / ${dayUpserts} upserted`)
        }
      } catch (err) {
        consecutiveFailures++
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[bc-sync] send scan [${list.penName}] ${dateISO} FAILED (${consecutiveFailures} consecutive): ${msg}`)
        if (consecutiveFailures >= SEND_MAX_CONSECUTIVE_FAILURES) {
          stoppedEarly = `endpoint failing: stopped at ${dateISO}, ${dates.length - i - 1} dates unprocessed`
          break
        }
      }
      await page.waitForTimeout(SEND_INTER_DATE_MS)
    }

    // Per-month rollup for the chunk log (e.g. "2026-07: 47 across 7 dates").
    const byMonth = new Map<string, { bookings: number; days: number }>()
    for (const entry of datesWithBookings) {
      const [dateISO, n] = entry.split(':')
      const month = dateISO.slice(0, 7)
      const agg = byMonth.get(month) ?? { bookings: 0, days: 0 }
      agg.bookings += Number(n); agg.days++
      byMonth.set(month, agg)
    }
    const detail = byMonth.size
      ? ` [${Array.from(byMonth.entries()).map(([m, a]) => `${m}: ${a.bookings} across ${a.days} dates`).join('; ')}]`
      : ' [no booked dates]'
    console.log(`[bc-sync] chunk ${name}: ${extracted} bookings / ${upserted} upserted across ${dates.length} dates in ${((Date.now() - t0) / 1000).toFixed(1)}s${detail}${stoppedEarly ? ` STOPPED(${stoppedEarly})` : ''}`)
    return { name, extracted, upserted, ms: Date.now() - t0, error: stoppedEarly ?? undefined, detail: detail.trim() }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[bc-sync] chunk ${name} FAILED: ${msg}`)
    return { name, extracted: 0, upserted: 0, ms: Date.now() - t0, error: msg }
  }
}

const PENDING_PROMPT =
  `On the BookClicker dashboard, read ONLY the "Pending Sales Activity" section (inbound booking requests awaiting my confirmation). Return { rows: [...] }. For each request: partnerName = the requesting partner's name verbatim; bookTitle = my list/book named in the request or null; promoDate = the requested date as ISO YYYY-MM-DD (resolve "Thursday, July 23rd" to the nearest such date; assume the current year unless the month is clearly earlier in the year than now, then next year); promoStyle = "feature" or "mention"; statusLabel = "pending".`
const PROMOS_FOR_ME_PROMPT =
  `On the BookClicker dashboard, read ONLY the "Promos Sent for You" section (promos other authors send FOR my books). This list can be very long — capture ONLY the 30 most recent entries (the newest 30 rows, i.e. those at the top / with the most recent dates); ignore everything older. Return { rows: [...] } with at most 30 items. For each: partnerName = the sending author's name verbatim; bookTitle = my book being sent; promoDate = the send date as ISO YYYY-MM-DD (resolve relative to the current year as above); promoStyle = null; statusLabel = the SENT / NOT SENT label shown for that row.`
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
  // Wall-clock anchor for the 300s route budget — must predate init, since init
  // (up to 90s) counts against the route too.
  const syncStart = Date.now()

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

    // ── Chunked extraction, ordered CHEAPEST-FIRST so the light chunks always
    // land even if a late 120s chunk is killed at the 300s route budget (init 90s
    // + two 120s long chunks can exceed 300s in the worst case; per-chunk upsert
    // means everything before the kill is already persisted). Order:
    // pendingInbound → calendar → sendObligations → promosForMe → outboundRequests.
    // sendObligations sits before the long LLM chunks because it is per-date JSON
    // fetches (no LLM) — cheap, and it is the driver this sync exists for. ──
    const chunks: ChunkResult[] = []
    const logElapsed = () => console.log(`[bc-sync] cumulative elapsed: ${((Date.now() - syncStart) / 1000).toFixed(1)}s`)

    // 1. pendingInbound — small (~4 rows), reads the dashboard.
    chunks.push(await runListChunk(stagehand, userId, myList, 'pendingInbound', 'inbound', PENDING_PROMPT))
    logElapsed()

    // 2. calendar — cheap/informational; navigates away from the dashboard.
    let leftDashboard = false
    if (calendarUrl) {
      chunks.push(await runCalendarChunk(stagehand, page, calendarUrl))
      leftDashboard = true
      logElapsed()
    }

    // 3. sendObligations — enumerate ALL of the account's lists from /my_lists
    // (users can have several, each with its own calendar), then per-date JSON
    // scan of each list's calendar (what the user sends for partners). Falls back
    // to the dashboard's calendar link if /my_lists yields nothing.
    let lists: BookclickerList[] = []
    try {
      lists = await enumerateBookclickerLists(page)
      leftDashboard = true
    } catch (err) {
      console.warn(`[bc-sync] my_lists enumeration FAILED: ${err instanceof Error ? err.message : String(err)}`)
    }
    if (lists.length === 0 && calendarUrl) {
      const m = calendarUrl.match(/\/calendars\/(\d+)/)
      if (m) lists = [{ penName: myList, listId: Number(m[1]), calendarUrl, size: null }]
      console.warn('[bc-sync] my_lists empty — falling back to the dashboard calendar link')
    }
    if (lists.length === 0) {
      chunks.push({ name: 'sendObligations', extracted: 0, upserted: 0, ms: 0, error: 'no lists found via /my_lists or dashboard' })
    }
    for (const list of lists) {
      chunks.push(await runSendObligationsChunk(page, userId, list, syncStart))
      leftDashboard = true
      logElapsed()
    }

    // Return to the dashboard for the two long list chunks.
    if (leftDashboard) {
      await page.goto(BOOKCLICKER_DASHBOARD_URL, { waitUntil: 'load', timeoutMs: 20_000 })
      await page.waitForTimeout(2000)
    }

    // 4. promosForMe — long list; 120s cap, scoped to the newest 30 rows.
    await page.waitForTimeout(INTER_CHUNK_MS)
    chunks.push(await runListChunk(stagehand, userId, myList, 'promosForMe', 'inbound', PROMOS_FOR_ME_PROMPT, LONG_CHUNK_TIMEOUT_MS))
    logElapsed()

    // 5. outboundRequests — longest list; 120s cap, scoped to the newest 30 rows.
    await page.waitForTimeout(INTER_CHUNK_MS)
    chunks.push(await runListChunk(stagehand, userId, myList, 'outboundRequests', 'outbound', OUTBOUND_PROMPT, LONG_CHUNK_TIMEOUT_MS))
    logElapsed()

    // ── Roll up per-chunk outcomes into the sync log. ──
    const totalUpserted = chunks.reduce((s, c) => s + c.upserted, 0)
    const okChunks = chunks.filter(c => !c.error).length
    const failedChunks = chunks.filter(c => c.error)
    const allRateLimited = failedChunks.length > 0 && failedChunks.every(c => /\b429\b|rate limit/i.test(c.error!))

    const summary = chunks.map(c =>
      `${c.name}: ${c.extracted}extracted/${c.upserted}upserted ${(c.ms / 1000).toFixed(1)}s${c.detail ? ` ${c.detail}` : ''}${c.error ? ` ERROR(${c.error.slice(0, 60)})` : ''}`
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
