// scripts/cleanup-seeded-books.ts
//
// One-time cleanup: removes Andrea's books that were auto-seeded into beta user
// accounts before the DEFAULT_BOOKS seed was removed from /api/books/route.ts.
//
// Safe to run multiple times — idempotent.
//
// Usage:
//   DATABASE_URL=<neon-url> npx tsx scripts/cleanup-seeded-books.ts --dry-run
//   DATABASE_URL=<neon-url> npx tsx scripts/cleanup-seeded-books.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ANDREA_EMAIL = 'andreanbonilla@gmail.com'
const ANDREA_ASINS = ['B0GSC2RTF8', 'B0GQD4J6VT', 'B0GX2ZXLHR']

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const andrea = await prisma.user.findUnique({
    where: { email: ANDREA_EMAIL },
    select: { id: true },
  })

  if (!andrea) {
    console.error('Andrea user not found — check ANDREA_EMAIL constant.')
    process.exit(1)
  }

  const contaminated = await prisma.book.findMany({
    where: {
      asin: { in: ANDREA_ASINS },
      userId: { not: andrea.id },
    },
    include: { user: { select: { email: true } } },
  })

  if (contaminated.length === 0) {
    console.log('No contaminated book records found — nothing to clean up.')
    return
  }

  console.log(`Found ${contaminated.length} contaminated book record(s):`)
  contaminated.forEach(b =>
    console.log(`  - "${b.title}" (${b.asin}) → user: ${b.user.email}`)
  )

  if (dryRun) {
    console.log('\nDry run — no records deleted. Re-run without --dry-run to apply.')
    return
  }

  const result = await prisma.book.deleteMany({
    where: {
      asin: { in: ANDREA_ASINS },
      userId: { not: andrea.id },
    },
  })

  console.log(`\nDeleted ${result.count} contaminated book record(s).`)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
