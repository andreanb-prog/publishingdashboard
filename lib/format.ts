// lib/format.ts — Shared currency formatter
// Use formatCurrency() for all dollar/revenue/spend/royalty displays.

export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
