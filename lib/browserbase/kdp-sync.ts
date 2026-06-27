// lib/browserbase/kdp-sync.ts
// Server-side KDP sync via Browserbase + Stagehand.
// Uses the user's stored kdpContextId so Amazon cookies persist across runs.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getBrowserbaseConfig } from '@/lib/browserbase'

const KDP_REPORT_URL = 'https://kdp.amazon.com/en_US/report/bookReport'

const BookRowSchema = z.object({
  asin: z.string(),
  title: z.string(),
  units: z.number(),
  kenp: z.number(),
  royalties: z.number(),
  dateRange: z.string(),
})

const ExtractSchema = z.object({
  books: z.array(BookRowSchema),
})

// Derives a YYYY-MM key from a date-range string like "June 1 – June 26, 2026".
// Falls back to current month if parsing fails.
function monthKeyFromDateRange(dateRange: string): string {
  const months: Record<string, string> = {
    January: '01', February: '02', March: '03', April: '04',
    May: '05', June: '06', July: '07', August: '08',
    September: '09', October: '10', November: '11', December: '12',
  }
  const match = dateRange.match(/(\w+)\s+\d+[^,]*,\s*(\d{4})/)
  if (match) {
    const mo = months[match[1]]
    if (mo) return `${match[2]}-${mo}`
  }
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function syncKdpForUser(userId: string): Promise<void> {
  // 1. Look up kdpContextId
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { kdpContextId: true },
  })

  if (!user?.kdpContextId) {
    await db.syncLog.create({
      data: {
        userId,
        source: 'kdp',
        status: 'failed',
        errorType: 'no_context',
        errorDetail: 'No kdpContextId stored for this user. Connect KDP first.',
      },
    })
    return
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    await db.syncLog.create({
      data: {
        userId,
        source: 'kdp',
        status: 'failed',
        errorType: 'config_missing',
        errorDetail: 'BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID not set.',
      },
    })
    return
  }

  // 2. Open Stagehand session using the stored context
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    browserbaseSessionCreateParams: {
      projectId: cfg.projectId,
      browserSettings: {
        context: { id: user.kdpContextId, persist: true },
      },
    },
  })

  let bbSessionId: string | undefined
  let syncLogId: string | undefined

  try {
    await stagehand.init()
    bbSessionId = stagehand.browserbaseSessionID ?? undefined

    // Write SyncLog row immediately with sessionId
    const syncLogEntry = await db.syncLog.create({
      data: {
        userId,
        source: 'kdp',
        status: 'failed', // updated to 'success' at the end
        sessionId: bbSessionId,
      },
    })
    syncLogId = syncLogEntry.id

    // 3. Navigate to KDP report page
    const page = stagehand.context.activePage()
    if (!page) throw new Error('No active page in Browserbase session')

    await page.goto(KDP_REPORT_URL, { waitUntil: 'load', timeoutMs: 60_000 })

    // 4. Check for redirect to login
    const currentUrl = page.url()
    const isLoginPage =
      currentUrl.includes('/ap/signin') ||
      currentUrl.includes('/signin') ||
      !currentUrl.includes('kdp.amazon.com')

    if (isLoginPage) {
      await db.user.update({
        where: { id: userId },
        data: { kdpSyncStatus: 'needs_reauth' },
      })
      await db.syncLog.update({
        where: { id: syncLogEntry.id },
        data: {
          status: 'expired',
          completedAt: new Date(),
          errorType: 'session_expired',
          errorDetail: `Redirected to login: ${currentUrl}`,
        },
      })
      return
    }

    // 5. Extract current month and previous month data
    const months: Array<{ books: z.infer<typeof BookRowSchema>[]; monthKey: string }> = []

    for (const monthOffset of [0, -1]) {
      const label = monthOffset === 0 ? 'current month' : 'previous month'

      if (monthOffset === -1) {
        // Try to navigate to the previous month tab if available
        try {
          await stagehand.act('Click the button or link to view the previous month\'s sales data')
          await page.waitForTimeout(2000)
        } catch {
          // Not all KDP reports show a previous-month tab — skip gracefully
          break
        }
      }

      // 5a. Extract book rows from the report table
      const result = await stagehand.extract(
        `Extract the KDP sales report table for the ${label}.
For each book row return: asin (ASIN/ISBN-13 shown in the table), title, units sold as an integer,
KENP pages read as an integer (0 if column is missing or shows a dash),
royalties as a float in USD (0 if missing), and the date range displayed at the top of the report
as a plain string (e.g. "June 1 - June 26, 2026"). If a value shows a dash use 0.`,
        ExtractSchema,
      )

      if (result?.books?.length) {
        const firstBook = result.books[0]
        const mk = monthKeyFromDateRange(firstBook?.dateRange ?? '')
        months.push({ books: result.books, monthKey: mk })
      }
    }

    // 6. Upsert into KdpSale
    let totalRows = 0

    for (const { books, monthKey } of months) {
      for (const book of books) {
        await db.kdpSale.upsert({
          where: {
            userId_asin_source_monthKey: {
              userId,
              asin: book.asin,
              source: 'browserbase',
              monthKey,
            },
          },
          update: {
            title: book.title,
            units: book.units,
            kenp: book.kenp,
            royalties: book.royalties,
          },
          create: {
            userId,
            asin: book.asin,
            title: book.title,
            date: `${monthKey}-01`,
            units: book.units,
            kenp: book.kenp,
            royalties: book.royalties,
            format: 'ebook',
            source: 'browserbase',
            monthKey,
          },
        })
        totalRows++
      }
    }

    // 7. Update user sync metadata and mark success
    await db.user.update({
      where: { id: userId },
      data: { kdpLastSyncAt: new Date() },
    })

    await db.syncLog.update({
      where: { id: syncLogEntry.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        rowsFetched: totalRows,
      },
    })
  } catch (err) {
    // 8. Write failure — never fail silently
    const msg = err instanceof Error ? err.message : String(err)
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorType: 'sync_error',
          errorDetail: msg.slice(0, 1000),
        },
      }).catch(() => undefined)
    } else {
      await db.syncLog.create({
        data: {
          userId,
          source: 'kdp',
          status: 'failed',
          sessionId: bbSessionId,
          completedAt: new Date(),
          errorType: 'sync_error',
          errorDetail: msg.slice(0, 1000),
        },
      })
    }
  } finally {
    // 9. Always close the session
    try {
      await stagehand.close()
    } catch {
      // Ignore close errors
    }
  }
}
