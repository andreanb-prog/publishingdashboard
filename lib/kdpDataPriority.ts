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
 * Groups rows by (asin, calendar-month) and marks CSV/manual rows as
 * shapeOnly when an extension MTD row exists for the same book-month.
 *
 * Rule: extension row = monthly total of record.
 *       CSV rows in the same month = daily shape only; never summed with extension.
 *       Months with no extension row: sum all CSV/manual rows as normal.
 */
export function resolveKdpRows<T extends KdpSaleRow>(rows: T[]): ResolvedRow<T>[] {
  // Group by asin + calendar month
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const month = row.monthKey ?? row.date.substring(0, 7) // YYYY-MM
    const key   = `${row.asin}::${month}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const result: ResolvedRow<T>[] = []
  Array.from(groups.values()).forEach(groupRows => {
    const hasExtension = groupRows.some((r: T) => r.source === 'extension')
    groupRows.forEach(row => {
      result.push({
        ...row,
        shapeOnly: hasExtension && row.source !== 'extension',
      } as ResolvedRow<T>)
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

  for (const row of rows) {
    const isExtension = row.source === 'extension'

    // ── Authoritative totals (non-shapeOnly rows only) ────────────────────
    if (!row.shapeOnly) {
      let include = false

      if (isExtension && row.monthKey) {
        // MTD snapshot: include when the selected range overlaps its calendar month
        if (!range) {
          include = true
        } else {
          const monthStart = `${row.monthKey}-01`
          const monthEnd   = `${row.monthKey}-31` // intentional overshoot — always >= real last day
          include = range.start <= monthEnd && range.end >= monthStart
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
        // Track source-split for estRevenue: extension royalties already include KU;
        // CSV/manual royalties are paid-only so we add KENP × rate separately.
        if (isExtension) {
          extensionRoyalties += row.royalties
        } else {
          csvRoyalties += row.royalties
          csvKenp      += row.kenp
        }
        if (!byBook[row.asin]) {
          byBook[row.asin] = { asin: row.asin, title: row.title, units: 0, kenp: 0, royalties: 0 }
        }
        byBook[row.asin].units     += row.units
        byBook[row.asin].kenp      += row.kenp
        byBook[row.asin].royalties += row.royalties
      }
    }

    // ── Daily series for chart shape (all CSV rows in range, incl. shapeOnly) ──
    if (!isExtension) {
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
