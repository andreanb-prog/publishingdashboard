// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROMO_CODES = [
  {
    code: 'FOUNDERSCLUB',
    description: 'Founding member — free for life',
    discountPercent: 100,
    discountedPrice: null,
    maxUses: 50,
  },
  {
    code: 'FPA2026',
    description: 'Fiction Publishing Academy member — $17/month',
    discountPercent: null,
    discountedPrice: 17.0,
    maxUses: null,
  },
  {
    code: 'BETA',
    description: 'Beta tester — free for 60 days',
    discountPercent: 100,
    discountedPrice: null,
    maxUses: 200,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
  },
]

async function main() {
  console.log('Seeding promo codes...')
  for (const promo of PROMO_CODES) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {
        description: promo.description,
        discountPercent: promo.discountPercent,
        discountedPrice: promo.discountedPrice,
        maxUses: promo.maxUses,
        expiresAt: promo.expiresAt ?? null,
      },
      create: promo,
    })
    console.log(`  ✓ ${promo.code}`)
  }
  console.log('Done.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
