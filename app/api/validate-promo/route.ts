// app/api/validate-promo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'No code provided' })
    }

    const promo = await db.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    })

    if (!promo) {
      return NextResponse.json({ valid: false, error: 'Invalid promo code' })
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'This code has expired' })
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ valid: false, error: 'This code has reached its limit' })
    }

    return NextResponse.json({
      valid: true,
      description: promo.description,
      discountPercent: promo.discountPercent,
      discountedPrice: promo.discountedPrice,
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Something went wrong' }, { status: 500 })
  }
}
