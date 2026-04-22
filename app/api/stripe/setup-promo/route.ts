// app/api/stripe/setup-promo/route.ts
// ONE-TIME setup endpoint — call POST /api/stripe/setup-promo after deployment to create
// the DEVACCESS2026 promotion code in Stripe. Idempotent: safe to call multiple times.
// Protected by SETUP_SECRET env var (or falls back to STRIPE_SECRET_KEY check).
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  // Simple protection: require a setup secret header so this can't be triggered by anyone
  const authHeader = req.headers.get('x-setup-secret')
  const setupSecret = process.env.SETUP_SECRET ?? process.env.STRIPE_SECRET_KEY
  if (!setupSecret || authHeader !== setupSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // ── 1. Create or confirm the DEVACCESS2026 coupon ───────────────────────────
  let couponId: string
  try {
    const existing = await stripe.coupons.retrieve('DEVACCESS2026').catch(() => null)
    if (existing) {
      couponId = existing.id
      results.coupon = { status: 'already_exists', id: couponId }
    } else {
      const coupon = await stripe.coupons.create({
        id: 'DEVACCESS2026',
        percent_off: 100,
        duration: 'once',
        max_redemptions: 3,
        name: 'DEVACCESS2026 — Developer Testing (100% off first month)',
      })
      couponId = coupon.id
      results.coupon = { status: 'created', id: couponId }
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // ── 2. Create or confirm the DEVACCESS2026 promotion code ───────────────────
  try {
    // List existing promotion codes for this coupon and look for matching code
    const list = await stripe.promotionCodes.list({ coupon: couponId, limit: 10 })
    const existing = list.data.find(p => p.code === 'DEVACCESS2026')
    if (existing) {
      results.promotionCode = { status: 'already_exists', id: existing.id, code: existing.code }
    } else {
      const promoCode = await stripe.promotionCodes.create({
        promotion: { coupon: couponId, type: 'coupon' },
        code: 'DEVACCESS2026',
        max_redemptions: 3,
      })
      results.promotionCode = { status: 'created', id: promoCode.id, code: promoCode.code }
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // ── 3. Verify FPA2026 coupon still exists ───────────────────────────────────
  try {
    const fpa = await stripe.coupons.retrieve('FPA2026')
    results.fpa2026 = {
      status: 'ok',
      id: fpa.id,
      percent_off: fpa.percent_off,
      amount_off: fpa.amount_off,
      valid: fpa.valid,
    }
  } catch {
    results.fpa2026 = { status: 'NOT_FOUND — create manually in Stripe dashboard' }
  }

  return NextResponse.json({ success: true, results })
}
