// scripts/backfill-bookclicker-partner-names.ts
//
// One-time backfill: some BookClicker authors put their swap criteria (genre
// rules, "No Erotica", "link 7 days in advance", etc.) directly into their
// pen-name field, and both the dashboard-list sync and the send-obligation
// sync stored that whole blob as SwapEntry.partnerName. Re-parses every
// existing platform='bookclicker' row with the corrected splitPartnerName()
// logic (lib/browserbase/bookclicker-sync.ts), moving the trailing blob into
// notes and leaving already-clean rows untouched. Idempotent.
//
// Usage:
//   DATABASE_URL=<neon-url> npx tsx scripts/backfill-bookclicker-partner-names.ts --dry-run
//   DATABASE_URL=<neon-url> npx tsx scripts/backfill-bookclicker-partner-names.ts
import { PrismaClient } from '@prisma/client'
import { splitPartnerName, withPartnerPreferences } from '../lib/browserbase/bookclicker-sync'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

async function main() {
  const rows = await prisma.swapEntry.findMany({
    where: { platform: 'bookclicker', partnerName: { not: null } },
    select: { id: true, partnerName: true, notes: true },
  })

  let fixed = 0
  let unchanged = 0

  for (const row of rows) {
    const raw = row.partnerName!
    const { name, extra } = splitPartnerName(raw)
    if (name === raw && !extra) {
      unchanged++
      continue
    }

    const baseNotes = row.notes?.trim() || 'Synced from BookClicker'
    const notes = withPartnerPreferences(baseNotes, extra)

    console.log(`[fix] "${raw.slice(0, 60)}${raw.length > 60 ? '…' : ''}" -> "${name}"`)
    fixed++

    if (!dryRun) {
      await prisma.swapEntry.update({
        where: { id: row.id },
        data: { partnerName: name, notes },
      })
    }
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}${fixed} row(s) fixed, ${unchanged} row(s) already clean (untouched). Total scanned: ${rows.length}.`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
