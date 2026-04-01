// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, message, page } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  // Save to database
  await db.feedback.create({
    data: {
      userId: session.user.id,
      type: type ?? 'idea',
      message: message.trim(),
      page: page ?? '',
    },
  })

  // Send email notification — requires RESEND_API_KEY env var
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
          from: 'AuthorDash <feedback@authordash.app>',
          to: ['elle@ellewilderbooks.com'],
          subject: `[${type === 'bug' ? '🐛 Bug' : '💡 Idea'}] New feedback from ${session.user.name ?? session.user.email}`,
          html: `
            <p><strong>Type:</strong> ${type === 'bug' ? 'Bug report' : 'Feature idea'}</p>
            <p><strong>From:</strong> ${session.user.name ?? ''} (${session.user.email})</p>
            <p><strong>Page:</strong> ${page}</p>
            <hr />
            <p>${message.trim().replace(/\n/g, '<br />')}</p>
          `,
        }),
      })
    } catch (err) {
      // Non-fatal — feedback is saved to DB regardless
      console.error('[Feedback] Email send failed:', err)
    }
  } else {
    console.warn('[Feedback] RESEND_API_KEY not set — email notification skipped')
  }

  return NextResponse.json({ success: true })
}
