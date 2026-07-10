// lib/kdpDataPriority.ts
// Single source of truth for KDP data deduplication and aggregation.
// Used at WRITE time (shouldOverwrite) and READ time (resolveKdpRows / aggregateKdp).

// ── Write-time priority ───────────────────────────────────────────────────────

export const SOURCE_PRIORITY: Record<string, number> = {
  csv:       1, // highest — full daily detail
  extension: 2, // MTD monthly snapshot from browser extension
  manual:    3, // lowest
}

export function shouldOverwrite(
  existingSource: string | null,
  incomingSource: string,
): boolean {
  const existingPriority = SOURCE_PRIORITY[existingSource ?? 'manual'] ?? 99
  const incomingPriority = SOURCE_PRIORITY[incomingSource] ?? 99
  return incomingPriority <= existingPriority
}

// ── Read-time deduplication ───────────────────────────────────────────────────

/** Minimal shape required by resolveKdpRows / aggregateKdp. */
export interface KdpSaleRow {
  asin:      string
  title:     string
  date:      string         // YYYY-MM-DD (the sync/upload date for extension rows)
  monthKey?: string | null  // YYYY-MM — set only on extension rows
  source?:   string | null  // 'csv' | 'extension' | 'manual'
  units:     number
  kenp:      number
  royalties: number
}

/**
 * A KdpSaleRow decorated with a shapeOnly flag.
 *
 * shapeOnly = true  → exclude from unit/kenp/royalty totals; keep only for
 *                     daily chart-shape rendering.  This is set on CSV rows
 *                     that share a book-month with an extension MTD row, because
 *                     the extension MTD row is the authoritative monthly total.
 * shapeOnly = false → authoritative; include in all aggregations.
 */
export type ResolvedRow<T extends KdpSaleRow = KdpSaleRow> = T & {
  shapeOnly: boolean
}

export type AggregateResult = {
  units:     number
  kenp:      number
  royalties: number
  /**
   * Correct estimated revenue that avoids double-counting KU.
   * Extension rows already embed KU in their royalties figure, so we only
   * add KENP × $0.0045 for CSV/manual rows whose royalties field is paid-only.
   *   estRevenue = extensionRoyalties + csvRoyalties + (csvKenp × 0.0045)
   */
  estRevenue:         number
  extensionRoyalties: number
  csvRoyalties:       number
  /** Per-ASIN totals (authoritative rows only, date-scoped). */
  byBook: Record<string, {
    asin:      string
    title:     string
    units:     number
    kenp:      number
    royalties: number
  }>
  /**
   * CSV daily rows within the requested range — use for chart rendering.
   * Includes shapeOnly rows so the chart still has daily shape even when
   * the extension MTD row is the authoritative total for that month.
   */
  dailySeries: Array<{ date: string; asin: string; title: string; units: number; kenp: number }>
  /**
   * true if any extension MTD row contributed to totals, meaning the result
   * is month-granular for that period (no per-day breakdown available).
   */
  hasMonthGranularData: boolean
}

/**
 * Groups rows by (asin, calendar-month) and marks rows as shapeOnly when a
 * higher-authority MTD row exists for the same month.
 *
 * Rules:
 *   browserbase row  = aggregate dashboard total for the month; overrides ALL
 *                      per-book rows (extension + csv) for that month.
 *   extension row    = per-book MTD total; overrides csv rows for that book-month.
 *   CSV/manual rows  = daily shape only when a higher-authority row exists.
 */
export function resolveKdpRows<T extends KdpSaleRow>(rows: T[]): ResolvedRow<T>[] {
  // Detect which calendar months have a browserbase aggregate row.
  const browserbaseMonths = new Set<string>()
  for (const row of rows) {
    if (row.source === 'browserbase') {
      browserbaseMonths.add(row.monthKey ?? row.date.substring(0, 7))
    }
  }

  // Group by asin + calendar month for extension-vs-csv dedup
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const month = row.monthKey ?? row.date.substring(0, 7)
    const key   = `${row.asin}::${month}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const result: ResolvedRow<T>[] = []
  Array.from(groups.values()).forEach(groupRows => {
    const month       = groupRows[0].monthKey ?? groupRows[0].date.substring(0, 7)
    const hasBb       = browserbaseMonths.has(month)
    const hasExtension = groupRows.some((r: T) => r.source === 'extension')

    groupRows.forEach(row => {
      // If a browserbase aggregate exists for this month, every non-browserbase
      // row becomes shapeOnly (daily chart shape only, not counted in totals).
      const isBb = row.source === 'browserbase'
      let shapeOnly: boolean
      if (row.source === 'browserbase-daily') {
        // Sync-captured daily histogram rows are ALWAYS chart shape only —
        // the browserbase month row (written by the same sync) is the money
        // truth; counting both would double totals.
        shapeOnly = true
      } else if (hasBb) {
        shapeOnly = !isBb
      } else {
        shapeOnly = hasExtension && row.source !== 'extension'
      }
      result.push({ ...row, shapeOnly } as ResolvedRow<T>)
    })
  })
  return result
}

/**
 * Sums authoritative (non-shapeOnly) rows, scoped to an optional date range.
 *
 * Date-scoping rules:
 *  - Extension MTD rows: included when the range overlaps the row's monthKey.
 *    Their full value is counted — never day-sliced.
 *  - CSV/manual daily rows: included when row.date falls within range.
 *
 * dailySeries always contains CSV rows within range regardless of shapeOnly,
 * so charts have daily shape even in months where the extension row is the total.
 */
export function aggregateKdp<T extends KdpSaleRow>(
  rows: ResolvedRow<T>[],
  range?: { start: string; end: string },
): AggregateResult {
  let units              = 0
  let kenp               = 0
  let royalties          = 0
  let extensionRoyalties = 0
  let csvRoyalties       = 0
  let csvKenp            = 0
  let hasMonthGranularData = false
  const byBook:      AggregateResult['byBook']      = {}
  const dailySeries: AggregateResult['dailySeries'] = []

  // Dates already covered by per-book CSV/manual daily rows. When a date has
  // real CSV rows, skip the sync's account-level 'browserbase-daily' row for
  // that date — including both would double the chart's daily shape.
  const csvDates = new Set<string>()
  for (const row of rows) {
    if (row.source !== 'extension' && row.source !== 'browserbase' && row.source !== 'browserbase-daily') {
      csvDates.add(row.date)
    }
  }

  // Sync-captured daily rows grouped by month — used to DAY-SLICE browserbase
  // month rows when the selected range only partially covers a month. Without
  // this, "last 2 days" returned the whole month's totals (the month row is
  // "never day-sliced"), which is exactly the inflated-range bug beta users hit.
  const dailyByMonth = new Map<string, Array<{ date: string; units: number; kenp: number }>>()
  for (const row of rows) {
    if (row.source === 'browserbase-daily') {
      const mk = row.date.substring(0, 7)
      if (!dailyByMonth.has(mk)) dailyByMonth.set(mk, [])
      dailyByMonth.get(mk)!.push({ date: row.date, units: row.units, kenp: row.kenp })
    }
  }
  const lastDayOfMonth = (mk: string) => {
    const [y, m] = mk.split('-').map(Number)
    return `${mk}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  }

  for (const row of rows) {
    const isExtension = row.source === 'extension'

    // ── Authoritative totals (non-shapeOnly rows only) ────────────────────
    if (!row.shapeOnly) {
      let include = false

      if ((isExtension || row.source === 'browserbase') && row.monthKey) {
        // MTD snapshot: include when the selected range overlaps its calendar month
        if (!range) {
          include = true
        } else {
          const monthStart = `${row.monthKey}-01`
          const monthEnd   = `${row.monthKey}-31` // intentional overshoot — always >= real last day
          include = range.start <= monthEnd && range.end >= monthStart

          // ── Partial-month day-slicing (browserbase month rows only) ────────
          // When the range covers only PART of this month and sync-captured
          // daily rows exist for it, slice: units/KENP are exact daily sums;
          // royalties are split KU-vs-paid — KU dollars scale with KENP
          // (KENP × $0.0045 is the KU payout model), paid dollars scale with
          // units. Previously the WHOLE month was counted for any overlap.
          if (include && row.source === 'browserbase') {
            const realMonthEnd = lastDayOfMonth(row.monthKey)
            const sliceStart = range.start > monthStart ? range.start : monthStart
            const sliceEnd   = range.end < realMonthEnd ? range.end : realMonthEnd
            const isPartial  = sliceStart > monthStart || sliceEnd < realMonthEnd
            const daily = dailyByMonth.get(row.monthKey)
            if (isPartial && daily && daily.length > 0) {
              let rUnits = 0, rKenp = 0
              for (const d of daily) {
                if (d.date >= sliceStart && d.date <= sliceEnd) { rUnits += d.units; rKenp += d.kenp }
              }
              const kuPart   = Math.min(row.royalties, row.kenp * 0.0045)
              const paidPart = Math.max(0, row.royalties - kuPart)
              const rRoyalties =
                (row.kenp > 0 ? kuPart * (rKenp / row.kenp) : 0) +
                (row.units > 0 ? paidPart * (rUnits / row.units) : 0)
              units     += rUnits
              kenp      += rKenp
              royalties += rRoyalties
              extensionRoyalties += rRoyalties
              // Sliced values are day-granular — do NOT set hasMonthGranularData.
              continue
            }
          }
        }
        if (include) hasMonthGranularData = true
      } else {
        // Daily CSV/manual: include when date is within range
        include = !range || (row.date >= range.start && row.date <= range.end)
      }

      if (include) {
        units     += row.units
        kenp      += row.kenp
        royalties += row.royalties
        // Track source-split for estRevenue: extension and browserbase royalties
        // already include KU; CSV/manual royalties are paid-only so we add KENP × rate.
        const isBrowserbase = row.source === 'browserbase'
        if (isExtension || isBrowserbase) {
          extensionRoyalties += row.royalties
        } else {
          csvRoyalties += row.royalties
          csvKenp      += row.kenp
        }
        // Skip aggregate sentinel rows from the per-book breakdown.
        if (row.asin !== 'ALL_BOOKS') {
          if (!byBook[row.asin]) {
            byBook[row.asin] = { asin: row.asin, title: row.title, units: 0, kenp: 0, royalties: 0 }
          }
          byBook[row.asin].units     += row.units
          byBook[row.asin].kenp      += row.kenp
          byBook[row.asin].royalties += row.royalties
        }
      }
    }

    // ── Daily series for chart shape (all CSV rows in range, incl. shapeOnly) ──
    // Exclude BOTH extension and browserbase: their rows are month-aggregate MTD
    // snapshots dated to the 1st (browserbase uses the ALL_BOOKS sentinel), so
    // charting them would render a whole month's totals as a single-day spike.
    // 'browserbase-daily' rows (sync-captured dashboard histogram) DO chart —
    // but only on dates with no CSV rows, so the two sources never double up.
    const chartable = row.source === 'browserbase-daily'
      ? !csvDates.has(row.date)
      : (row.source !== 'extension' && row.source !== 'browserbase')
    if (chartable) {
      const inRange = !range || (row.date >= range.start && row.date <= range.end)
      if (inRange) {
        dailySeries.push({
          date:  row.date,
          asin:  row.asin,
          title: row.title,
          units: row.units,
          kenp:  row.kenp,
        })
      }
    }
  }

  const estRevenue = extensionRoyalties + csvRoyalties + csvKenp * 0.0045
  return { units, kenp, royalties, estRevenue, extensionRoyalties, csvRoyalties, byBook, dailySeries, hasMonthGranularData }
}
