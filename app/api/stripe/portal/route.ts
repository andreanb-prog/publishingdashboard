// app/api/stripe/portal/route.ts — Create Stripe billing portal session
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
  })

  return NextResponse.json({ url: portalSession.url })
}
