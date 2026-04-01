// app/api/health/digest/route.ts — Daily health digest (7am HST / 5pm UTC)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const now = new Date()

  // Gather health stats
  let dbStatus = 'ok'
  let userCount = 0
  let feedbackCount = 0
  let analysisCount = 0

  try {
    await db.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'error'
  }

  try {
    userCount = await db.user.count()
    feedbackCount = await db.feedback.count({
      where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    })
    analysisCount = await db.analysis.count({
      where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    })
  } catch (e) {
    console.error('[Health Digest] DB query failed:', e)
  }

  const report = {
    timestamp: now.toISOString(),
    site: dbStatus === 'ok' ? 'UP' : 'DEGRADED',
    database: dbStatus,
    totalUsers: userCount,
    feedbackLast24h: feedbackCount,
    analysesLast24h: analysisCount,
  }

  console.log('[Health Digest]', JSON.stringify(report))

  // Send email digest if RESEND_API_KEY is set
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AuthorDash <health@authordash.app>',
          to: ['elle@ellewilderbooks.com'],
          subject: `[AuthorDash] Daily Health — ${report.site}`,
          html: `
            <h2>AuthorDash Daily Health Digest</h2>
            <p><strong>Status:</strong> ${report.site}</p>
            <p><strong>Database:</strong> ${report.database}</p>
            <p><strong>Total Users:</strong> ${report.totalUsers}</p>
            <p><strong>Feedback (24h):</strong> ${report.feedbackLast24h}</p>
            <p><strong>Analyses (24h):</strong> ${report.analysesLast24h}</p>
            <hr />
            <p style="color:#999;font-size:12px">${report.timestamp}</p>
          `,
        }),
      })
    } catch (err) {
      console.error('[Health Digest] Email failed:', err)
    }
  }

  // Send SMS via Twilio if configured and site is degraded
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_FROM_NUMBER
  const twilioTo = process.env.TWILIO_TO_NUMBER

  if (twilioSid && twilioToken && twilioFrom && twilioTo && report.site !== 'UP') {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: twilioTo,
          Body: `[AuthorDash ALERT] Site is ${report.site} | DB: ${report.database} | ${report.timestamp}`,
        }),
      })
    } catch (err) {
      console.error('[Health Digest] SMS failed:', err)
    }
  }

  return NextResponse.json(report)
}
