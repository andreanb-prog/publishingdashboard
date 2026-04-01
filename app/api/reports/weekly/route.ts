// app/api/reports/weekly/route.ts
// Weekly digest email — called by Vercel cron every Monday at 8am
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Analysis } from '@/types'

function compareMetric(label: string, curr: number, prev: number): string {
  if (prev === 0 && curr === 0) return ''
  const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0
  if (pct > 3) return `- Your ${label} is up ${pct}% (${curr.toLocaleString()} vs ${prev.toLocaleString()})`
  if (pct < -3) return `- Your ${label} is down ${Math.abs(pct)}% (${curr.toLocaleString()} vs ${prev.toLocaleString()})`
  return `- Your ${label} is holding steady at ${curr.toLocaleString()}`
}

function buildDigest(name: string, current: Analysis, previous: Analysis): string {
  const changes: string[] = []

  if (current.kdp && previous.kdp) {
    changes.push(compareMetric('royalties', current.kdp.totalRoyaltiesUSD, previous.kdp.totalRoyaltiesUSD))
    changes.push(compareMetric('unit sales', current.kdp.totalUnits, previous.kdp.totalUnits))
    const ck = current.kdp.totalKENP ?? 0, pk = previous.kdp.totalKENP ?? 0
    changes.push(compareMetric('KENP reads', ck, pk))
  }

  if (current.meta?.bestAd) {
    const cc = current.meta.bestAd.ctr, pc = previous.meta?.bestAd?.ctr ?? 0
    if (cc > pc + 1) changes.push(`- Your best ad CTR jumped to ${cc}% — that's extraordinary`)
    else if (cc > 0) changes.push(`- Best ad CTR at ${cc}%`)
  }

  if (current.mailerLite) {
    if (current.mailerLite.listSize === 0) {
      changes.push('- Email list still showing 0 — this is your biggest opportunity')
    } else {
      changes.push(compareMetric('email list', current.mailerLite.listSize, previous.mailerLite?.listSize ?? 0))
    }
  }

  const filteredChanges = changes.filter(Boolean)

  const actions = ((current as any).actionPlan ?? []).slice(0, 3)
  const actionLines = actions.map((a: any, i: number) =>
    `${i + 1}. ${a.title}`
  )

  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return `Hi ${name || 'there'},

Here's what happened in your publishing business this week.

WHAT CHANGED
${filteredChanges.length ? filteredChanges.join('\n') : '- No significant changes detected this period'}

WHAT NEEDS ACTION THIS WEEK
${actionLines.length ? actionLines.join('\n') : '- Keep doing what you\'re doing — your numbers are solid'}

Your numbers are heading in the right direction. Keep going.

-- Your AuthorDash coach

View your full dashboard → ${process.env.NEXTAUTH_URL || 'https://authordash.com'}/dashboard
`
}

export async function GET() {
  try {
    // Find all users who have at least 2 analyses and haven't opted out
    const users = await db.user.findMany({
      where: {
        analyses: { some: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: { data: true, month: true },
        },
      },
    })

    let sent = 0
    const errors: string[] = []

    for (const user of users) {
      if (!user.email || user.analyses.length < 2) continue

      const current = user.analyses[0].data as unknown as Analysis
      const previous = user.analyses[1].data as unknown as Analysis
      if (!current || !previous) continue

      const body = buildDigest(user.name?.split(' ')[0] ?? '', current, previous)
      const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

      // Send via Resend if configured, otherwise log
      if (process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'AuthorDash <digest@authordash.com>',
              to: user.email,
              subject: `Your AuthorDash weekly — week of ${weekOf}`,
              text: body,
            }),
          })
          sent++
        } catch (e) {
          errors.push(`Failed for ${user.email}: ${e}`)
        }
      } else {
        console.log(`[Weekly Digest] Would send to ${user.email}:\n${body}`)
        sent++
      }
    }

    return NextResponse.json({ success: true, sent, errors })
  } catch (error) {
    console.error('Weekly report error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
