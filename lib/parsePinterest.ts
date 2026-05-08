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
  const lines = csvText.split('\n').map(l => l.trim())

  // ── Section 1: Daily Impressions ────────────────────────────────────────────
  const dateHeaderIdx = lines.findIndex(l => l === 'Date,Impressions' || l.startsWith('Date,Impressions,'))
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

      if (!date?.match(/^\d{4}-\d{2}-\d{2}$/) || !impStr) continue

      const imp = parseInt(impStr, 10)
      if (!isNaN(imp)) {
        totalImpressions += imp
        if (!firstDate) firstDate = date
        lastDate = date
      }
    }
  }

  const dateRange = firstDate && lastDate ? `${firstDate} - ${lastDate}` : ''

  // ── Section 2: Top Boards ────────────────────────────────────────────────────
  const boardHeaderIdx = lines.findIndex(l =>
    l.includes('Pinterest Link') &&
    l.includes('Impressions') &&
    l.includes('Engagement') &&
    l.includes('Pin clicks')
  )
  const topBoards: PinterestOverviewData['topBoards'] = []

  if (boardHeaderIdx !== -1) {
    for (let i = boardHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) break
      if (line.startsWith('Top boards table') || line.startsWith('"Top boards table')) continue

      const parts = splitCSV(line)
      const url = parts[0]?.replace(/"/g, '').trim()
      if (!url?.includes('pinterest.com/')) continue

      topBoards.push({
        url,
        impressions:    parseInt(parts[1]?.replace(/"/g, '') || '0', 10) || 0,
        engagement:     parseInt(parts[2]?.replace(/"/g, '') || '0', 10) || 0,
        pinClicks:      parseInt(parts[3]?.replace(/"/g, '') || '0', 10) || 0,
        outboundClicks: parseInt(parts[4]?.replace(/"/g, '') || '0', 10) || 0,
        saves:          parseInt(parts[5]?.replace(/"/g, '') || '0', 10) || 0,
      })
    }
  }

  // ── Section 3: Top Pins ──────────────────────────────────────────────────────
  const pinHeaderIdx = lines.findIndex(l =>
    l.includes('Pinterest Link') &&
    l.includes('Content Type') &&
    l.includes('Source') &&
    l.includes('Canonical')
  )
  const topPins: PinterestOverviewData['topPins'] = []

  if (pinHeaderIdx !== -1) {
    for (let i = pinHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) break
      if (line.startsWith('Top pins table') || line.startsWith('"Top pins table')) continue

      const parts = splitCSV(line)
      const url = parts[0]?.replace(/"/g, '').trim()
      if (!url?.includes('pinterest.com/')) continue

      topPins.push({
        url,
        impressions: parseInt(parts[4]?.replace(/"/g, '') || '0', 10) || 0,
      })
    }
  }

  return { dateRange, totalImpressions, topBoards, topPins }
}
