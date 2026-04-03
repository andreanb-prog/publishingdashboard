// app/api/health/connections/route.ts — Multi-source integration health check
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getMailerLiteStats } from '@/lib/mailerlite'

type IntegrationStatus = {
  status: 'green' | 'amber' | 'red'
  text: string
  actionText?: string
  actionHref?: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      mailerLiteKey: true,
      metaAccessToken: true,
      metaTokenExpires: true,
      metaLastSync: true,
      subscriptionStatus: true,
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, data: true },
      },
    },
  })

  const now = new Date()

  // ── MailerLite ──────────────────────────────────────────────────
  let mailerlite: IntegrationStatus
  const mlKey = user?.mailerLiteKey || process.env.MAILERLITE_API_KEY || null

  if (!mlKey) {
    mailerlite = {
      status: 'red',
      text: 'Not connected',
      actionText: 'Connect →',
      actionHref: '/dashboard/settings',
    }
  } else {
    try {
      const data = await getMailerLiteStats(mlKey)
      const subs = data?.listSize ?? 0
      if (subs > 0) {
        mailerlite = { status: 'green', text: `Connected · ${subs.toLocaleString()} subscribers` }
      } else {
        mailerlite = {
          status: 'amber',
          text: 'API key issue — check settings',
          actionText: 'Check settings →',
          actionHref: '/dashboard/settings',
        }
      }
    } catch {
      mailerlite = {
        status: 'amber',
        text: 'API key issue — check settings',
        actionText: 'Check settings →',
        actionHref: '/dashboard/settings',
      }
    }
  }

  // ── Meta Ads ────────────────────────────────────────────────────
  let meta: IntegrationStatus

  if (!user?.metaAccessToken) {
    meta = {
      status: 'red',
      text: 'Not connected',
      actionText: 'Connect →',
      actionHref: '/dashboard/settings',
    }
  } else {
    const tokenExpired = user.metaTokenExpires ? user.metaTokenExpires < now : false
    if (tokenExpired) {
      meta = {
        status: 'amber',
        text: 'Token expired',
        actionText: 'Reconnect →',
        actionHref: '/dashboard/settings',
      }
    } else {
      const lastSync = user.metaLastSync
      if (!lastSync) {
        meta = { status: 'amber', text: 'Connected · never synced' }
      } else {
        const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
        if (hoursSinceSync <= 24) {
          const minsSince = hoursSinceSync * 60
          const syncLabel = minsSince < 2 ? 'just now'
            : minsSince < 60 ? `${Math.floor(minsSince)}m ago`
            : `${Math.floor(hoursSinceSync)}h ago`
          meta = { status: 'green', text: `Connected · last synced ${syncLabel}` }
        } else {
          meta = {
            status: 'amber',
            text: 'Token valid but stale',
            actionText: 'Sync →',
            actionHref: '/dashboard/settings',
          }
        }
      }
    }
  }

  // ── KDP ─────────────────────────────────────────────────────────
  let kdp: IntegrationStatus
  const latestAnalysis = user?.analyses?.[0]

  if (!latestAnalysis) {
    kdp = {
      status: 'red',
      text: 'No data yet',
      actionText: 'Upload →',
      actionHref: '/dashboard?upload=1',
    }
  } else {
    const uploadedAt = new Date((latestAnalysis.data as any)?.kdpUploadedAt ?? latestAnalysis.createdAt)
    const daysSince = (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 35) {
      const d = uploadedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      kdp = { status: 'green', text: `Data uploaded · ${d}` }
    } else {
      kdp = { status: 'amber', text: 'No data this month' }
    }
  }

  // ── Stripe ──────────────────────────────────────────────────────
  let stripe: IntegrationStatus
  const subStatus = user?.subscriptionStatus

  if (subStatus === 'active' || subStatus === 'trialing') {
    stripe = { status: 'green', text: 'Active subscription' }
  } else if (subStatus === 'past_due') {
    stripe = { status: 'amber', text: 'Payment issue' }
  } else {
    stripe = { status: 'red', text: 'Not set up' }
  }

  return NextResponse.json({
    mailerlite,
    meta,
    kdp,
    stripe,
    cachedAt: now.toISOString(),
  })
}
