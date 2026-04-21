// scripts/backfill-kdp-analysis.ts
//
// One-time backfill: rebuilds the `kdp` slice of every user's Analysis record
// from their existing KdpSale rows, fixing users whose dashboard still shows
// stale numbers because parse-kdp used to update raw rows but never refresh
// the Analysis record.
//
// Preserves other channels (meta, mailerLite, pinterest, coaching) on existing
// Analysis records — only `kdp` is replaced. Idempotent.
//
// Usage:
//   DATABASE_URL=<neon-url> npx tsx scripts/backfill-kdp-analysis.ts --dry-run
//   DATABASE_URL=<neon-url> npx tsx scripts/backfill-kdp-analysis.ts
//   DATABASE_URL=<neon-url> npx tsx scripts/backfill-kdp-analysis.ts --user=<userId>
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const userArg = args.find(a => a.startsWith('--user='))?.split('=')[1]

interface BookAgg {
  asin: string
  title: string
  units: number
  kenp: number
  royalties: number
  format?: string
}

async function main() {
  console.log(`\n=== KDP Analysis Backfill ${dryRun ? '(DRY RUN)' : '(WRITE MODE)'} ===`)
  if (userArg) console.log(`Scoped to userId: ${userArg}`)

  const userWhere = userArg ? { userId: userArg } : {}

  // Find every user who has at least one KdpSale row
  const distinctUsers = await prisma.kdpSale.findMany({
    where: userWhere,
    distinct: ['userId'],
    select: { userId: true },
  })
  const userIds = distinctUsers.map(r => r.userId)
  console.log(`Users with KdpSale rows: ${userIds.length}\n`)

  // Hydrate emails for readability in the log
  const userRecords = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    : []
  const emailById = new Map(userRecords.map(u => [u.id, u.email ?? '(no-email)']))

  let totalUserMonths = 0
  let totalCreated = 0
  let totalUpdatedChanged = 0
  let totalUpdatedNoChange = 0

  for (const userId of userIds) {
    const email = emailById.get(userId) ?? '(unknown)'
    const rows = await prisma.kdpSale.findMany({ where: { userId } })
    if (rows.length === 0) continue

    // Group rows by YYYY-MM (first 7 chars of the date string)
    const byMonth = new Map<string, typeof rows>()
    for (const row of rows) {
      const month = row.date.substring(0, 7)
      const list = byMonth.get(month) ?? []
      list.push(row)
      byMonth.set(month, list)
    }

    console.log(`── ${email} (${userId}) — ${rows.length} rows across ${byMonth.size} month(s)`)

    for (const [month, monthRows] of Array.from(byMonth.entries())) {
      // Aggregate — exactly the logic in app/api/parse-kdp/route.ts lines 93-143
      const bookMap = new Map<string, BookAgg>()
      const dailyUnitsMap = new Map<string, number>()
      const dailyKENPMap = new Map<string, number>()

      for (const r of monthRows) {
        const b = bookMap.get(r.asin)
        if (b) {
          b.units += r.units
          b.kenp += r.kenp
          b.royalties += r.royalties
        } else {
          bookMap.set(r.asin, {
            asin: r.asin,
            title: r.title,
            units: r.units,
            kenp: r.kenp,
            royalties: r.royalties,
            format: r.format ?? undefined,
          })
        }
        dailyUnitsMap.set(r.date, (dailyUnitsMap.get(r.date) ?? 0) + r.units)
        dailyKENPMap.set(r.date, (dailyKENPMap.get(r.date) ?? 0) + r.kenp)
      }

      const books = Array.from(bookMap.values())
        .sort((a, b) => b.units - a.units)
        .map(b => ({
          ...b,
          shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '...' : b.title,
          format: b.format as 'ebook' | 'paperback' | undefined,
        }))

      const dailyUnits = Array.from(dailyUnitsMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const dailyKENP = Array.from(dailyKENPMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const totalUnits = books.reduce((s, b) => s + b.units, 0)
      const totalKENP = books.reduce((s, b) => s + b.kenp, 0)
      const totalRoyaltiesUSD = books.reduce((s, b) => s + b.royalties, 0)
      const paperbackUnits = books.filter(b => b.format === 'paperback').reduce((s, b) => s + b.units, 0)
      const paidUnits = totalUnits - paperbackUnits

      const kdpSlice = {
        month,
        totalUnits,
        totalKENP,
        totalRoyaltiesUSD,
        books,
        dailyUnits,
        dailyKENP,
        summary: { paidUnits, freeUnits: 0, paperbackUnits },
        rowCount: monthRows.length,
      }

      // Compare against existing Analysis record for this user+month
      const existing = await prisma.analysis.findFirst({
        where: { userId, month },
      })

      const existingKdp = (existing?.data as Record<string, unknown> | null)?.kdp as
        | { totalUnits?: number; totalKENP?: number; totalRoyaltiesUSD?: number }
        | undefined

      const prevUnits = existingKdp?.totalUnits ?? 0
      const prevKenp = existingKdp?.totalKENP ?? 0
      const prevRoy = existingKdp?.totalRoyaltiesUSD ?? 0

      const changed =
        prevUnits !== totalUnits ||
        prevKenp !== totalKENP ||
        Math.abs(prevRoy - totalRoyaltiesUSD) > 0.001

      const delta = changed
        ? `units: ${prevUnits} → ${totalUnits} | kenp: ${prevKenp} → ${totalKENP} | $${prevRoy.toFixed(2)} → $${totalRoyaltiesUSD.toFixed(2)}`
        : `unchanged (${totalUnits} units, ${totalKENP} KENP, $${totalRoyaltiesUSD.toFixed(2)})`

      if (!existing) {
        console.log(`   [${month}] CREATE → ${totalUnits} units, ${totalKENP} KENP, $${totalRoyaltiesUSD.toFixed(2)} (${books.length} books)`)
        totalCreated++
      } else if (changed) {
        console.log(`   [${month}] UPDATE → ${delta}`)
        totalUpdatedChanged++
      } else {
        console.log(`   [${month}] SKIP   → ${delta}`)
        totalUpdatedNoChange++
      }

      if (!dryRun) {
        if (existing) {
          const existingData = (existing.data as Record<string, unknown>) ?? {}
          await prisma.analysis.update({
            where: { id: existing.id },
            data: { data: { ...existingData, kdp: kdpSlice } as object },
          })
        } else {
          await prisma.analysis.create({
            data: { userId, month, data: { month, kdp: kdpSlice } as object },
          })
        }
      }

      totalUserMonths++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Users scanned:        ${userIds.length}`)
  console.log(`User-months total:    ${totalUserMonths}`)
  console.log(`Would CREATE:         ${totalCreated}`)
  console.log(`Would UPDATE (delta): ${totalUpdatedChanged}`)
  console.log(`Already up-to-date:   ${totalUpdatedNoChange}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN — no writes' : 'WRITE — changes applied'}`)
}

main()
  .catch(e => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
