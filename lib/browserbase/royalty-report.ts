// Parser for KDP's downloadable "Prior Month's Royalties" report (.xlsx).
//
// The file has six sheets — "eBook Royalty", "KENP", "Paperback Royalty",
// "Hardcover Royalty", "Audiobook Royalty", "Total Earnings" — each with row 0 =
// ["Sales Period","June 2026", …], row 1 = column headers, rows 2+ = data.
//
// Every royalty sheet carries a per-row "Royalty" amount in a per-row "Currency"
// (USD/GBP/EUR/AUD/…), so we roll each format up to a single USD figure. The KENP
// sheet reports Kindle Edition Normalized Pages (page reads) — NOT dollars; KDP
// only finalises the per-page rate ~mid the following month, so KU dollars are
// always derived, never read. See deriveKuUsd() and the sync for how the KU
// dollar figure is reconciled against the blended dashboard total.
import * as XLSX from 'xlsx'

// Approximate FX → USD. These are ESTIMATES for rolling up the small non-US
// royalty tail (a US-based KU author is overwhelmingly Amazon.com/USD). Refine
// or swap for a live rate source later; USD rows are unaffected (rate = 1).
export const FX_TO_USD: Record<string, number> = {
  USD: 1, GBP: 1.27, EUR: 1.08, CAD: 0.73, AUD: 0.66, JPY: 0.0067,
  INR: 0.012, BRL: 0.18, MXN: 0.055, PLN: 0.25, SEK: 0.095,
}

// Estimated fallback $/page when we have no blended total to derive KU from.
// KDP's real KENP rate historically runs ~$0.0040–0.0050/page.
export const KENP_RATE_FALLBACK = 0.0045

export interface RoyaltyReportBreakdown {
  monthKey: string | null // 'YYYY-MM' parsed from the "Sales Period" cell
  ebookUsd: number
  ebookUnits: number
  paperbackUsd: number
  paperbackUnits: number
  hardcoverUsd: number
  hardcoverUnits: number
  audiobookUsd: number
  audiobookUnits: number
  kenpPages: number
  currencyBreakdown: Record<string, number> // raw per-currency royalty totals (debug)
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? 0 : n
}

function toUsd(amount: number, currency: string): number {
  const rate = FX_TO_USD[(currency || 'USD').toUpperCase()] ?? 1
  return amount * rate
}

// "June 2026", "June, 2026", "2026-06", "06/2026" → "2026-06"
export function parseSalesPeriod(label: unknown): string | null {
  const s = String(label ?? '').trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}`
  m = s.match(/^(\d{1,2})\/(\d{4})/)
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, '0')}`
  m = s.match(/([A-Za-z]{3,})\.?,?\s+(\d{4})/)
  if (m) {
    const idx = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      .indexOf(m[1].slice(0, 3).toLowerCase())
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}`
  }
  return null
}

type Grid = unknown[][]

function sheetGrid(wb: XLSX.WorkBook, name: string): Grid {
  const ws = wb.Sheets[name]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as Grid
}

function headerIndex(header: unknown[], re: RegExp): number {
  return header.findIndex((h) => re.test(String(h)))
}

// Sum a royalty sheet's "Royalty" column to USD, plus a units count.
function sumRoyaltySheet(
  wb: XLSX.WorkBook,
  name: string,
  currencyAcc: Record<string, number>,
): { usd: number; units: number } {
  const grid = sheetGrid(wb, name)
  const header = grid[1] ?? []
  const data = grid.slice(2)
  const royaltyIdx = headerIndex(header, /^Royalty$/i)
  const currencyIdx = headerIndex(header, /Currency/i)
  // Prefer "Net Units Sold" when present, else "Units Sold".
  const netIdx = headerIndex(header, /Net Units Sold/i)
  const unitsIdx = netIdx >= 0 ? netIdx : headerIndex(header, /Units Sold/i)

  let usd = 0
  let units = 0
  for (const row of data) {
    if (!row || row.every((c) => c === '' || c == null)) continue
    const currency = String((currencyIdx >= 0 ? row[currencyIdx] : 'USD') || 'USD').toUpperCase()
    const royalty = royaltyIdx >= 0 ? toNumber(row[royaltyIdx]) : 0
    usd += toUsd(royalty, currency)
    units += unitsIdx >= 0 ? toNumber(row[unitsIdx]) : 0
    currencyAcc[currency] = (currencyAcc[currency] ?? 0) + royalty
  }
  return { usd: +usd.toFixed(2), units }
}

/** Parse a KDP Prior-Month royalty report buffer into per-format USD totals. */
export function parseRoyaltyReport(buffer: Buffer): RoyaltyReportBreakdown {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const currencyBreakdown: Record<string, number> = {}

  const ebook = sumRoyaltySheet(wb, 'eBook Royalty', currencyBreakdown)
  const paperback = sumRoyaltySheet(wb, 'Paperback Royalty', currencyBreakdown)
  const hardcover = sumRoyaltySheet(wb, 'Hardcover Royalty', currencyBreakdown)
  const audiobook = sumRoyaltySheet(wb, 'Audiobook Royalty', currencyBreakdown)

  // KENP pages (page reads) — the only KU signal in the file.
  const kenpGrid = sheetGrid(wb, 'KENP')
  const kenpHeader = kenpGrid[1] ?? []
  const kenpIdx = headerIndex(kenpHeader, /Kindle Edition Normalized Pages|KENP/i)
  let kenpPages = 0
  for (const row of kenpGrid.slice(2)) {
    if (!row || row.every((c) => c === '' || c == null)) continue
    kenpPages += kenpIdx >= 0 ? toNumber(row[kenpIdx]) : 0
  }

  // Month: read from any sheet's "Sales Period" cell (row 0, col 1).
  let monthKey: string | null = null
  for (const name of wb.SheetNames) {
    const g = sheetGrid(wb, name)
    const mk = parseSalesPeriod(g[0]?.[1])
    if (mk) { monthKey = mk; break }
  }

  return {
    monthKey,
    ebookUsd: ebook.usd,
    ebookUnits: ebook.units,
    paperbackUsd: paperback.usd,
    paperbackUnits: paperback.units,
    hardcoverUsd: hardcover.usd,
    hardcoverUnits: hardcover.units,
    audiobookUsd: audiobook.usd,
    audiobookUnits: audiobook.units,
    kenpPages,
    currencyBreakdown,
  }
}

/**
 * Derive KU (page-read) dollars for a month. Preferred: reconcile against the
 * blended dashboard royalty so the per-format parts sum to the headline the user
 * already sees — KU = blendedTotal − (ebook + paperback + hardcover + audiobook).
 * Fallback (no blended total available): pages × the estimated KENP rate.
 */
export function deriveKuUsd(
  b: RoyaltyReportBreakdown,
  blendedTotalUsd: number | null | undefined,
): { kuUsd: number; derived: boolean } {
  const nonKu = b.ebookUsd + b.paperbackUsd + b.hardcoverUsd + b.audiobookUsd
  if (blendedTotalUsd != null && blendedTotalUsd > 0) {
    return { kuUsd: +Math.max(0, blendedTotalUsd - nonKu).toFixed(2), derived: true }
  }
  return { kuUsd: +(b.kenpPages * KENP_RATE_FALLBACK).toFixed(2), derived: false }
}
