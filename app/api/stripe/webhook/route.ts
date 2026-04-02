// app/api/stripe/webhook/route.ts — Handle Stripe webhook events
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[Stripe Webhook]', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan || 'regular'
        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await db.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: sub.id,
              subscriptionStatus: sub.status,
              subscriptionPlan: plan,
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            },
          })
          console.log('[Stripe Webhook] Subscription created for user:', userId, 'plan:', plan, 'status:', sub.status)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: sub.status,
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            },
          })
          console.log('[Stripe Webhook] Subscription updated:', userId, sub.status)
        } else {
          // Find by stripeSubscriptionId
          const user = await db.user.findFirst({ where: { stripeSubscriptionId: sub.id } })
          if (user) {
            await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: sub.status,
                trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const user = await db.user.findFirst({ where: { stripeSubscriptionId: sub.id } })
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
            },
          })
          console.log('[Stripe Webhook] Subscription canceled:', user.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const user = await db.user.findFirst({ where: { stripeCustomerId: customerId } })
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: 'past_due' },
          })
          console.log('[Stripe Webhook] Payment failed for user:', user.id)
        }
        break
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err)
  }

  return NextResponse.json({ received: true })
}
