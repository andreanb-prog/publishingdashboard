// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const NOTION_DB_ID = '694bfdad3ac34b61997f41be25d9dd33'

async function sendToNotion({
  type,
  message,
  page,
  userName,
  userEmail,
}: {
  type: string
  message: string
  page: string
  userName: string
  userEmail: string
}) {
  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) {
    console.warn('[Feedback] NOTION_API_KEY not set — Notion sync skipped')
    return
  }

  const typeLabel =
    type === 'bug' ? 'Something is broken' : type === 'idea' ? 'I have an idea' : 'General'

  const body = {
    parent: { database_id: NOTION_DB_ID },
    properties: {
      Feedback: {
        title: [{ text: { content: message.slice(0, 100) + (message.length > 100 ? '…' : '') } }],
      },
      Message: {
        rich_text: [{ text: { content: message.slice(0, 2000) } }],
      },
      Page: {
        rich_text: [{ text: { content: page || '' } }],
      },
      Type: {
        select: { name: typeLabel },
      },
      Status: {
        select: { name: 'New' },
      },
      'Submitted By': {
        rich_text: [{ text: { content: `${userName} (${userEmail})` } }],
      },
      Date: {
        date: { start: new Date().toISOString().split('T')[0] },
      },
    },
  }

  console.log('[Feedback → Notion] Sending to database:', NOTION_DB_ID)
  console.log('[Feedback → Notion] Type:', typeLabel, '| Page:', page, '| User:', userEmail)

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error('[Feedback → Notion] FAILED:', res.status, res.statusText)
    console.error('[Feedback → Notion] Response:', errorBody)
    throw new Error(`Notion API error ${res.status}: ${errorBody}`)
  }

  const data = await res.json()
  console.log('[Feedback → Notion] SUCCESS — page id:', data.id)
}

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

  // Send to Notion
  try {
    await sendToNotion({
      type: type ?? 'idea',
      message: message.trim(),
      page: page ?? '',
      userName: session.user.name ?? '',
      userEmail: session.user.email ?? '',
    })
  } catch (err) {
    console.error('[Feedback] Notion sync failed:', err)
    // Non-fatal — feedback is saved to local DB regardless
  }

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
