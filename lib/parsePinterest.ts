// lib/parsePinterest.ts — parses Pinterest Analytics overview CSVs

export interface PinterestOverviewData {
  dateRange: string
  totalImpressions: number
  topBoards: {
    url: string
    impressions: number
    engagement: number
    pinClicks: number
    outboundClicks: number
    saves: number
  }[]
  topPins: {
    url: string
    impressions: number
  }[]
}

// Parse an integer metric, tolerating quotes, thousands separators ("1,234"),
// and stray whitespace. Plain parseInt("1,234") returns 1, silently dividing
// every value ≥1000 by ~1000.
function toInt(v: string | undefined): number {
  if (!v) return 0
  const n = parseInt(v.replace(/[^0-9-]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

function splitCSV(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  result.push(cur.trim())
  return result
}

export function parsePinterest(csvText: string): PinterestOverviewData {
  // Keep blank lines so we can use them as section boundaries,
  // but also strip CR so CRLF files work correctly
  const lines = csvText.split('\n').map(l => l.replace(/\r$/, '').trim())

  // ── Section 1: Daily Impressions ────────────────────────────────────────────
  // Use startsWith (like the old parser) rather than exact match — more permissive
  const dateHeaderIdx = lines.findIndex(l => l.startsWith('Date,Impressions'))
  let totalImpressions = 0
  let firstDate = ''
  let lastDate = ''

  if (dateHeaderIdx !== -1) {
    for (let i = dateHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) break
      if (line.startsWith('Data starting') || line.startsWith('"Data starting')) continue

      const parts = splitCSV(line)
      const date = parts[0]?.replace(/"/g, '').trim()
      const impStr = parts[1]?.replace(/"/g, '').trim()

      if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) continue
      // Allow empty impression values — skip the row but don't break
      if (!impStr) continue

      const imp = toInt(impStr)
      totalImpressions += imp
      if (!firstDate) firstDate = date
      lastDate = date
    }
  }

  const dateRange = firstDate && lastDate ? `${firstDate} - ${lastDate}` : ''

  // ── Section 2: Top Boards ────────────────────────────────────────────────────
  // Find the board header AFTER the date section ends — prevents matching
  // "Impressions" in the preamble before the data sections
  const searchFrom = dateHeaderIdx !== -1 ? dateHeaderIdx : 0
  const boardHeaderIdx = lines.findIndex((l, idx) =>
    idx > searchFrom &&
    l.includes('Pinterest Link') &&
    l.includes('Impressions') &&
    l.includes('Engagement')
  )
  const topBoards: PinterestOverviewData['topBoards'] = []

  if (boardHeaderIdx !== -1) {
    for (let i = boardHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) break
      // Footer note — skip but don't break (it may not be the last line)
      if (line.replace(/"/g, '').startsWith('Top boards table')) continue

      const parts = splitCSV(line)
      const url = parts[0]?.replace(/"/g, '').trim()
      if (!url?.includes('pinterest.com/')) continue

      topBoards.push({
        url,
        impressions:    toInt(parts[1]),
        engagement:     toInt(parts[2]),
        pinClicks:      toInt(parts[3]),
        outboundClicks: toInt(parts[4]),
        saves:          toInt(parts[5]),
      })
    }
  }

  // ── Section 3: Top Pins ──────────────────────────────────────────────────────
  const pinSearchFrom = boardHeaderIdx !== -1 ? boardHeaderIdx : searchFrom
  const pinHeaderIdx = lines.findIndex((l, idx) =>
    idx > pinSearchFrom &&
    l.includes('Pinterest Link') &&
    l.includes('Content Type') &&
    l.includes('Source')
  )
  const topPins: PinterestOverviewData['topPins'] = []

  if (pinHeaderIdx !== -1) {
    for (let i = pinHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) break
      if (line.replace(/"/g, '').startsWith('Top pins table')) continue

      const parts = splitCSV(line)
      const url = parts[0]?.replace(/"/g, '').trim()
      if (!url?.includes('pinterest.com/')) continue

      topPins.push({
        url,
        impressions: toInt(parts[4]),
      })
    }
  }

  return { dateRange, totalImpressions, topBoards, topPins }
}
