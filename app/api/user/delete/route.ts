// app/api/user/delete/route.ts — Delete user account and all data
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  let reason: string | undefined
  try {
    const body = await req.json()
    reason = body?.reason
  } catch { /* no body is fine */ }

  console.log('[User Delete] Starting deletion for:', userId, reason ? `reason: ${reason}` : '')

  try {
    // Cancel Stripe subscription if exists
    try {
      const stripeRow = await db.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true, stripeCustomerId: true },
      })
      if (stripeRow?.stripeSubscriptionId) {
        const { getStripe } = await import('@/lib/stripe')
        const stripe = getStripe()
        await stripe.subscriptions.cancel(stripeRow.stripeSubscriptionId).catch(() => {})
        console.log('[User Delete] Stripe subscription canceled')
      }
    } catch { /* ignore */ }

    // Clear Meta and MailerLite tokens
    try {
      await db.user.update({
        where: { id: userId },
        data: { metaAccessToken: null, metaAdAccountId: null, mailerLiteKey: null },
      })
    } catch { /* ignore */ }

    // Delete all related data
    await db.feedback.deleteMany({ where: { userId } })
    await db.analysis.deleteMany({ where: { userId } })
    await db.rankLog.deleteMany({ where: { userId } })
    await db.roasLog.deleteMany({ where: { userId } })
    await db.pinterestLog.deleteMany({ where: { userId } })
    await db.listBuildingLog.deleteMany({ where: { userId } })

    // Delete promo code associations
    await db.userPromoCode.deleteMany({ where: { userId } })

    // Delete sessions and accounts
    await db.session.deleteMany({ where: { userId } })
    await db.account.deleteMany({ where: { userId } })

    // Delete the user
    await db.user.delete({ where: { id: userId } })

    console.log('[User Delete] All data deleted for:', userId)

    // Send confirmation email if Resend is configured
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && session.user.email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'AuthorDash <support@authordash.app>',
            to: [session.user.email],
            subject: 'Your AuthorDash account has been deleted',
            html: `<p>Hi ${session.user.name ?? ''},</p><p>Your AuthorDash account and all associated data have been permanently deleted as requested.</p><p>If this was a mistake or you change your mind, you can always create a new account at authordash.io.</p><p>— The AuthorDash Team</p>`,
          }),
        })
      } catch { /* email is non-critical */ }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[User Delete] Error:', err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
