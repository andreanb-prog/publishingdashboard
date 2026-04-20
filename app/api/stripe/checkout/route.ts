// app/api/stripe/checkout/route.ts — Create Stripe checkout session
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, coupon } = await req.json()
  const priceId = plan === 'fpa'
    ? process.env.STRIPE_FPA_PRICE_ID!
    : process.env.STRIPE_REGULAR_PRICE_ID!

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  // Build checkout session params
  const params: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=canceled`,
    subscription_data: {
      trial_period_days: user.trialEndsAt ? undefined : 14,
      metadata: { userId: user.id, plan },
    },
    metadata: { userId: user.id, plan },
  }

  // FPA plan: apply FPA2026 discount programmatically (54% off, no code entry needed).
  // `discounts` and `allow_promotion_codes` are mutually exclusive in Stripe, so FPA
  // gets the coupon directly and regular plan gets the visible promo code field instead.
  if (plan === 'fpa' || coupon === 'FPA2026') {
    params.discounts = [{ coupon: 'FPA2026' }]
    // Remove trial when applying a coupon
    if (params.subscription_data) {
      params.subscription_data.trial_period_days = undefined
    }
  } else {
    // Regular plan: show the promo code field so users can enter DEVACCESS2026 (100% off)
    // or any other active promotion code at checkout.
    params.allow_promotion_codes = true
  }

  const checkoutSession = await stripe.checkout.sessions.create(params)

  return NextResponse.json({ url: checkoutSession.url })
}
