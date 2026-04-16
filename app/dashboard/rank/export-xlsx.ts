// app/dashboard/rank/export-xlsx.ts
// Client-side Excel export for ROAS Hub.
// Called via dynamic import from page.tsx so xlsx is only loaded on demand.
import * as XLSX from 'xlsx'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExportRow {
  date: string
  rank: number | null
  rankChange: number | null
  adSpend: number | null
  clicks: number | null
  cpc: number | null
  ctr: number | null
  revenue: number | null
  roas: number | null
  pageReads: number | null
  orders: number | null
  newSubs: number | null
  lpv?: number | null
  notes?: string | null
  costPerSub?: number | null
}

export interface ExportData {
  date: string
  books: Array<{ slot: string; title: string | null; asin: string | null }>
  b1: ExportRow[]
  b2: ExportRow[]
  b3: ExportRow[]
  lm: ExportRow[]
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const NAVY  = '1E2D3D'
const CREAM = 'FFF8F0'
const WHITE = 'FFFFFF'

function headerStyle() {
  return {
    font:      { bold: true, sz: 11, color: { rgb: WHITE } },
    fill:      { patternType: 'solid', fgColor: { rgb: NAVY }, bgColor: { rgb: NAVY } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

function goalsStyle() {
  return {
    font:      { bold: true, sz: 11, color: { rgb: NAVY } },
    fill:      { patternType: 'solid', fgColor: { rgb: CREAM }, bgColor: { rgb: CREAM } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

function dataStyle(isStripe: boolean, fillOverride?: string) {
  const bg = fillOverride ?? (isStripe ? CREAM : WHITE)
  return {
    font:      { sz: 11, color: { rgb: NAVY } },
    fill:      { patternType: 'solid', fgColor: { rgb: bg }, bgColor: { rgb: bg } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

function roasFill(roas: number | null): string | undefined {
  if (roas == null) return undefined
  if (roas >= 1)   return 'C6EFCE'  // light green
  if (roas >= 0.5) return 'FFEB9C'  // light amber
  return 'FFC7CE'                    // light red
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateSheetName(name: string): string {
  // Excel sheet names max 31 chars; strip chars invalid in sheet names
  return name.replace(/[\\/?*[\]]/g, '').slice(0, 31)
}

function fmtDateDisplay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day:   '2-digit',
  })
}

function escapeSheetRef(name: string): string {
  // Wrap in single quotes; escape internal single quotes
  return `'${name.replace(/'/g, "''")}'`
}

// Convenience: set a cell with value, type, number format, and style
function setCell(
  ws: XLSX.WorkSheet,
  addr: string,
  value: XLSX.CellObject['v'],
  type: XLSX.CellObject['t'],
  numFmt?: string,
  style?: object,
  formula?: string,
) {
  const cell: XLSX.CellObject = { v: value, t: type }
  if (formula) cell.f = formula
  if (numFmt)  cell.z = numFmt
  if (style)  (cell as unknown as Record<string, unknown>).s = style
  ws[addr] = cell
}

// ── Book Sheet (B1 / B2 / B3) ─────────────────────────────────────────────────
// Columns: A=DATE B=BSR C=ΔRANK D=AD SPEND E=CLICKS F=CPC G=CTR H=REVENUE I=ROAS J=PAGE READS K=ORDERS L=NEW SUBS

const BOOK_HEADERS = [
  'DATE', 'BSR', 'Δ RANK', 'AD SPEND', 'CLICKS',
  'CPC', 'CTR', 'REVENUE', 'ROAS', 'PAGE READS', 'ORDERS', 'NEW SUBS',
]
const BOOK_COLS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const BOOK_COL_WIDTHS = [10, 12, 10, 12, 8, 10, 8, 12, 10, 12, 8, 10]

// Goals row values (parallel to BOOK_HEADERS)
const BOOK_GOALS = ['GOALS', '—', '—', '—', '—', '$0.10', '15%', '—', '—', '—', '—', '—']

function buildBookSheet(rows: ExportRow[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}

  // Row 1 — headers
  BOOK_HEADERS.forEach((h, i) => {
    setCell(ws, `${BOOK_COLS[i]}1`, h, 's', undefined, headerStyle())
  })

  // Row 2 — goals
  BOOK_GOALS.forEach((g, i) => {
    setCell(ws, `${BOOK_COLS[i]}2`, g, 's', undefined, goalsStyle())
  })

  // Rows 3+ — data
  rows.forEach((row, rowIdx) => {
    const r      = rowIdx + 3   // Excel row number (1-based)
    const stripe = rowIdx % 2 !== 0

    // A — DATE
    setCell(ws, `A${r}`, fmtDateDisplay(row.date), 's', undefined, dataStyle(stripe))

    // B — BSR
    if (row.rank != null) {
      setCell(ws, `B${r}`, row.rank, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `B${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // C — Δ RANK (formula; first data row has no previous, leave blank)
    if (rowIdx === 0) {
      setCell(ws, `C${r}`, '', 's', undefined, dataStyle(stripe))
    } else {
      const prev = r - 1
      setCell(
        ws, `C${r}`,
        row.rankChange ?? '',
        row.rankChange != null ? 'n' : 's',
        '#,##0',
        dataStyle(stripe),
        `IF(AND(B${r}<>"",B${prev}<>""),B${prev}-B${r},"")`,
      )
    }

    // D — AD SPEND
    if (row.adSpend != null) {
      setCell(ws, `D${r}`, row.adSpend, 'n', '$#,##0.00', dataStyle(stripe))
    } else {
      setCell(ws, `D${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // E — CLICKS
    if (row.clicks != null) {
      setCell(ws, `E${r}`, row.clicks, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `E${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // F — CPC (formula: AD SPEND ÷ CLICKS)
    setCell(
      ws, `F${r}`,
      row.cpc ?? '',
      row.cpc != null ? 'n' : 's',
      '$#,##0.00',
      dataStyle(stripe),
      `IF(AND(D${r}<>"",E${r}<>"",E${r}>0),D${r}/E${r},"")`,
    )

    // G — CTR (no impressions stored — leave blank)
    setCell(ws, `G${r}`, '', 's', undefined, dataStyle(stripe))

    // H — REVENUE
    if (row.revenue != null) {
      setCell(ws, `H${r}`, row.revenue, 'n', '$#,##0.00', dataStyle(stripe))
    } else {
      setCell(ws, `H${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // I — ROAS (formula: REVENUE ÷ AD SPEND) — conditional fill
    const rf = roasFill(row.roas)
    setCell(
      ws, `I${r}`,
      row.roas ?? '',
      row.roas != null ? 'n' : 's',
      '0.00"x"',
      dataStyle(stripe, rf),
      `IF(AND(D${r}<>"",D${r}>0,H${r}<>""),H${r}/D${r},"")`,
    )

    // J — PAGE READS
    if (row.pageReads != null) {
      setCell(ws, `J${r}`, row.pageReads, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `J${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // K — ORDERS
    if (row.orders != null) {
      setCell(ws, `K${r}`, row.orders, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `K${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // L — NEW SUBS
    if (row.newSubs != null) {
      setCell(ws, `L${r}`, row.newSubs, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `L${r}`, '', 's', undefined, dataStyle(stripe))
    }
  })

  const lastRow = Math.max(rows.length + 2, 2)
  ws['!ref']  = `A1:L${lastRow}`
  ws['!cols'] = BOOK_COL_WIDTHS.map(wch => ({ wch }))
  return ws
}

// ── Lead Magnet Sheet ─────────────────────────────────────────────────────────
// Columns: A=DATE B=AD SPEND C=CLICKS D=CPC E=CTR F=NEW SUBS G=COST PER SUB H=LPV I=NOTES

const LM_HEADERS    = ['DATE', 'AD SPEND', 'CLICKS', 'CPC', 'CTR', 'NEW SUBS', 'COST PER SUB', 'LPV', 'NOTES']
const LM_COLS       = ['A','B','C','D','E','F','G','H','I']
const LM_GOALS      = ['GOALS', '—', '—', '$0.10', '15%', '—', '$2.00', '—', '—']
const LM_COL_WIDTHS = [10, 12, 8, 10, 8, 10, 14, 8, 20]

function buildLmSheet(rows: ExportRow[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}

  LM_HEADERS.forEach((h, i) => setCell(ws, `${LM_COLS[i]}1`, h, 's', undefined, headerStyle()))
  LM_GOALS.forEach((g, i)   => setCell(ws, `${LM_COLS[i]}2`, g, 's', undefined, goalsStyle()))

  rows.forEach((row, rowIdx) => {
    const r      = rowIdx + 3
    const stripe = rowIdx % 2 !== 0

    setCell(ws, `A${r}`, fmtDateDisplay(row.date), 's', undefined, dataStyle(stripe))

    if (row.adSpend != null) {
      setCell(ws, `B${r}`, row.adSpend, 'n', '$#,##0.00', dataStyle(stripe))
    } else {
      setCell(ws, `B${r}`, '', 's', undefined, dataStyle(stripe))
    }

    if (row.clicks != null) {
      setCell(ws, `C${r}`, row.clicks, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `C${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // D — CPC formula
    setCell(
      ws, `D${r}`,
      row.cpc ?? '',
      row.cpc != null ? 'n' : 's',
      '$#,##0.00',
      dataStyle(stripe),
      `IF(AND(B${r}<>"",C${r}<>"",C${r}>0),B${r}/C${r},"")`,
    )

    // E — CTR (no impressions)
    setCell(ws, `E${r}`, '', 's', undefined, dataStyle(stripe))

    if (row.newSubs != null) {
      setCell(ws, `F${r}`, row.newSubs, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `F${r}`, '', 's', undefined, dataStyle(stripe))
    }

    // G — COST PER SUB formula
    setCell(
      ws, `G${r}`,
      row.costPerSub ?? '',
      row.costPerSub != null ? 'n' : 's',
      '$#,##0.00',
      dataStyle(stripe),
      `IF(AND(B${r}<>"",F${r}<>"",F${r}>0),B${r}/F${r},"")`,
    )

    if (row.lpv != null) {
      setCell(ws, `H${r}`, row.lpv, 'n', '#,##0', dataStyle(stripe))
    } else {
      setCell(ws, `H${r}`, '', 's', undefined, dataStyle(stripe))
    }

    setCell(ws, `I${r}`, row.notes ?? '', 's', undefined, dataStyle(stripe))
  })

  const lastRow = Math.max(rows.length + 2, 2)
  ws['!ref']  = `A1:I${lastRow}`
  ws['!cols'] = LM_COL_WIDTHS.map(wch => ({ wch }))
  return ws
}

// ── Summary Sheet ─────────────────────────────────────────────────────────────

function buildSummarySheet(data: ExportData, bookSheetNames: string[], date: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}

  // Row 1 — title (merged A1:H1)
  setCell(ws, 'A1', `ROAS Hub Export — ${date}`, 's', undefined, {
    font:      { bold: true, sz: 16, color: { rgb: NAVY } },
    alignment: { horizontal: 'left', vertical: 'center' },
  })
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]

  // Row 3 — KPI tile labels
  const kpiLabels = ['Total Spend (7 days)', 'Best BSR', 'Overall ROAS (7d)', 'Cost Per Subscriber']
  const kpiCols   = ['A', 'C', 'E', 'G'] as const
  kpiLabels.forEach((label, i) => {
    setCell(ws, `${kpiCols[i]}3`, label, 's', undefined, {
      font:      { bold: true, sz: 11, color: { rgb: NAVY } },
      alignment: { horizontal: 'left' },
    })
  })

  // Row 4 — KPI tile values (cross-sheet SUM formulas)
  const sn = bookSheetNames.map(escapeSheetRef)
  const lm = `'Lead Magnet'`

  // Total Spend: sum AD SPEND (col D) across book sheets + LM AD SPEND (col B)
  setCell(ws, 'A4', '', 'n', '$#,##0.00', undefined,
    `SUM(${sn[0]}!D3:D10000,${sn[1]}!D3:D10000,${sn[2]}!D3:D10000,${lm}!B3:B10000)`)

  // Best BSR: minimum BSR (col B) across book sheets (ignoring blanks and zeros)
  setCell(ws, 'C4', '', 'n', '#,##0', undefined,
    `IFERROR(MINIFS(${sn[0]}!B3:B10000,${sn[0]}!B3:B10000,">"&0,${sn[1]}!B3:B10000,${sn[1]}!B3:B10000,">"&0,${sn[2]}!B3:B10000,${sn[2]}!B3:B10000,">"&0),"—")`)

  // Overall ROAS: total revenue / total spend
  setCell(ws, 'E4', '', 'n', '0.00"x"', undefined,
    `IFERROR(SUM(${sn[0]}!H3:H10000,${sn[1]}!H3:H10000,${sn[2]}!H3:H10000)/SUM(${sn[0]}!D3:D10000,${sn[1]}!D3:D10000,${sn[2]}!D3:D10000),"—")`)

  // Cost Per Sub: LM total spend / LM total new subs
  setCell(ws, 'G4', '', 'n', '$#,##0.00', undefined,
    `IFERROR(SUM(${lm}!B3:B10000)/SUM(${lm}!F3:F10000),"—")`)

  // Row 6 — "By Book" breakdown table header
  const byBookHeaders = [
    'BOOK', 'TOTAL SPEND', 'AVG BSR', 'BEST BSR',
    'TOTAL REVENUE', 'OVERALL ROAS', 'TOTAL PAGE READS', 'TOTAL ORDERS',
  ]
  byBookHeaders.forEach((h, i) => {
    const col = String.fromCharCode(65 + i) // A–H
    setCell(ws, `${col}6`, h, 's', undefined, headerStyle())
  })

  // Rows 7-9 — one row per book
  bookSheetNames.forEach((sheetName, i) => {
    const row     = 7 + i
    const ref     = escapeSheetRef(sheetName)
    const title   = data.books[i]?.title ?? `Book ${i + 1}`

    setCell(ws, `A${row}`, title, 's')

    // TOTAL SPEND (D col in book sheet)
    setCell(ws, `B${row}`, '', 'n', '$#,##0.00', undefined,
      `SUM(${ref}!D3:D10000)`)

    // AVG BSR
    setCell(ws, `C${row}`, '', 'n', '#,##0', undefined,
      `IFERROR(AVERAGEIF(${ref}!B3:B10000,"<>"),"—")`)

    // BEST BSR
    setCell(ws, `D${row}`, '', 'n', '#,##0', undefined,
      `IFERROR(MINIFS(${ref}!B3:B10000,${ref}!B3:B10000,">"&0),"—")`)

    // TOTAL REVENUE (H col in book sheet)
    setCell(ws, `E${row}`, '', 'n', '$#,##0.00', undefined,
      `SUM(${ref}!H3:H10000)`)

    // OVERALL ROAS
    setCell(ws, `F${row}`, '', 'n', '0.00"x"', undefined,
      `IFERROR(SUM(${ref}!H3:H10000)/SUM(${ref}!D3:D10000),"—")`)

    // TOTAL PAGE READS (J col in book sheet)
    setCell(ws, `G${row}`, '', 'n', '#,##0', undefined,
      `SUM(${ref}!J3:J10000)`)

    // TOTAL ORDERS (K col in book sheet)
    setCell(ws, `H${row}`, '', 'n', '#,##0', undefined,
      `SUM(${ref}!K3:K10000)`)
  })

  ws['!ref']  = 'A1:H9'
  ws['!cols'] = [35, 14, 10, 10, 14, 14, 16, 12].map(wch => ({ wch }))
  return ws
}

// ── Main export function ──────────────────────────────────────────────────────

export async function exportRoasHub(): Promise<void> {
  // Fetch all data from the API
  const res = await fetch('/api/books/bsr/export')
  if (!res.ok) throw new Error(`Export fetch failed: ${res.status}`)
  const data: ExportData = await res.json()

  const wb = XLSX.utils.book_new()

  // Default book titles if missing
  const defaultTitles = ['Book 1', 'Book 2', 'Book 3']
  const bookSheetNames = [0, 1, 2].map(i => {
    const title = data.books[i]?.title ?? defaultTitles[i]
    return truncateSheetName(`B${i + 1} · ${title}`)
  })

  // Book sheets (B1, B2, B3)
  const bookSlots: (keyof ExportData)[] = ['b1', 'b2', 'b3']
  bookSlots.forEach((slot, i) => {
    const rows = (data[slot] as ExportRow[]) ?? []
    XLSX.utils.book_append_sheet(wb, buildBookSheet(rows), bookSheetNames[i])
  })

  // Lead Magnet sheet
  XLSX.utils.book_append_sheet(wb, buildLmSheet(data.lm ?? []), 'Lead Magnet')

  // Summary sheet
  XLSX.utils.book_append_sheet(
    wb,
    buildSummarySheet(data, bookSheetNames, data.date),
    'Summary',
  )

  // Trigger download
  XLSX.writeFile(wb, `ROAS-Hub-${data.date}.xlsx`)
}
