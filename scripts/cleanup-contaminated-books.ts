// scripts/cleanup-contaminated-books.ts
// Removes Andrea's books that were incorrectly seeded into beta user accounts.
// Safe to run multiple times — idempotent.
//
// Usage:
//   npx tsx scripts/cleanup-contaminated-books.ts         # dry run (default)
//   npx tsx scripts/cleanup-contaminated-books.ts --run   # real delete

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Andrea's ASINs that should ONLY exist under her own account
const ANDREA_ASINS = [
  'B0GSC2RTF8', // My Off-Limits Roommate
  'B0GQD4J6VT', // Fake Dating My Billionaire Protector
  'B0GX2ZXLHR', // My Ex's Secret Baby
]

// Andrea's known email addresses — books under these accounts are legitimate
const ANDREA_EMAILS = [
  'andreanbonilla@gmail.com',
  'info@ellewilderbooks.com',
  'elle@ellewilderbooks.com',
]

const DRY_RUN = !process.argv.includes('--run')

async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`AuthorDash — Contaminated Book Cleanup`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (pass --run to delete)' : '⚠️  LIVE DELETE'}`)
  console.log(`${'='.repeat(60)}\n`)

  // Find all users who have Andrea's books but are NOT Andrea
  const contaminated = await db.book.findMany({
    where: {
      asin: { in: ANDREA_ASINS },
      user: {
        email: { notIn: ANDREA_EMAILS },
      },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { user: { email: 'asc' } },
  })

  if (contaminated.length === 0) {
    console.log('✅ No contaminated records found. Database is clean.')
    return
  }

  console.log(`Found ${contaminated.length} contaminated book record(s) across ${new Set(contaminated.map(b => b.user.email)).size} account(s):\n`)

  // Group by user for readable output
  const byUser = new Map<string, typeof contaminated>()
  for (const book of contaminated) {
    const email = book.user.email ?? 'unknown'
    if (!byUser.has(email)) byUser.set(email, [])
    byUser.get(email)!.push(book)
  }

  for (const [email, books] of byUser.entries()) {
    console.log(`  ${email}`)
    for (const book of books) {
      console.log(`    - [${book.id}] "${book.title}" (ASIN: ${book.asin})`)
    }
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete. ${contaminated.length} record(s) would be deleted.`)
    console.log('Run with --run flag to execute the delete.\n')
    return
  }

  // Real delete
  const ids = contaminated.map(b => b.id)
  const result = await db.book.deleteMany({ where: { id: { in: ids } } })
  console.log(`\n✅ Deleted ${result.count} contaminated book record(s).`)

  // Also clean up any KDP sale rows seeded under these users with Andrea's ASINs
  // (these would have come from the old task seed or any accidental data bleed)
  const affectedUserIds = [...new Set(contaminated.map(b => b.user.id))]
  const kdpCleanup = await db.kdpSale.deleteMany({
    where: {
      userId: { in: affectedUserIds },
      asin: { in: ANDREA_ASINS.map(a => a.replace(/\s/g, '').toUpperCase()) },
    },
  })
  if (kdpCleanup.count > 0) {
    console.log(`✅ Also deleted ${kdpCleanup.count} contaminated KDP sale row(s).`)
  }

  console.log('\nDone. Affected accounts:')
  for (const email of byUser.keys()) {
    console.log(`  - ${email}`)
  }
  console.log()
}

main()
  .catch(e => { console.error('Script failed:', e); process.exit(1) })
  .finally(() => db.$disconnect())
