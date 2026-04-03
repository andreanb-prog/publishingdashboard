// lib/utils.ts — Shared number formatting utilities
// Use these across all pages to keep metric display consistent.

/**
 * Format a percentage to 1 decimal place.
 * e.g. 38.2352942 → "38.2%"
 */
export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toFixed(1)}%`
}

/**
 * Format a currency value to 2 decimal places.
 * e.g. 0.1 → "$0.10", 1234.5 → "$1,234.50"
 */
export function fmtCurrency(n: number | null | undefined, prefix = '$'): string {
  if (n == null) return '—'
  return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a large integer with comma separators, no decimals.
 * e.g. 1625 → "1,625"
 */
export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('en-US')
}

/**
 * Auto-format a metric value based on its type.
 * Convenience wrapper around the three functions above.
 *
 * type:
 *   'pct'      → fmtPct      (38.2%)
 *   'currency' → fmtCurrency ($0.10)
 *   'int'      → fmtInt      (1,625)
 */
export function formatMetric(
  value: number | null | undefined,
  type: 'pct' | 'currency' | 'int',
  prefix = '$',
): string {
  switch (type) {
    case 'pct':      return fmtPct(value)
    case 'currency': return fmtCurrency(value, prefix)
    case 'int':      return fmtInt(value)
  }
}
