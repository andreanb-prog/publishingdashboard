// lib/clientDateRange.ts
// Shared default-dashboard-window logic — client-safe (no server imports).
// The default window is THIS MONTH so the first number a user sees always
// matches the KDP dashboard's own default "This month" view. Browserbase
// syncs monthly totals, so this view is always exact.

export const DATE_RANGE_STORAGE_KEY = 'authordash_date_range'

export function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${d}` }
}

/**
 * Reads the saved range from localStorage. A saved range whose end date is
 * before today is STALE — it was saved on an earlier day and would silently
 * show old data (e.g. a June range greeting the user in July). Stale ranges
 * are discarded and the default (this month) is returned instead.
 */
export function loadStoredDateRange(): { from: string; to: string } {
  const def = getDefaultDateRange()
  try {
    const stored = localStorage.getItem(DATE_RANGE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as { from?: string; to?: string }
      if (parsed?.from && parsed?.to && parsed.to >= def.to) {
        return { from: parsed.from, to: parsed.to }
      }
      localStorage.removeItem(DATE_RANGE_STORAGE_KEY)
    }
  } catch { /* corrupted value — fall through to default */ }
  return def
}
