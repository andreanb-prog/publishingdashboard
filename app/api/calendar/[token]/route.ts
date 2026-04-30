// app/api/calendar/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  let userId: string
  try {
    userId = Buffer.from(params.token, 'base64url').toString('utf8')
  } catch {
    return new NextResponse('Invalid token', { status: 400 })
  }

  if (!userId || userId.length < 10) {
    return new NextResponse('Invalid token', { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) return new NextResponse('Not found', { status: 404 })

  const tasks = await db.launchTask.findMany({
    where: { userId },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()
  const dtstamp = `${fmtIcalDate(now)}T${fmtIcalTime(now)}Z`

  const vevents = tasks.map(task => {
    const dateStr = fmtIcalDate(task.dueDate)
    const nextDay = new Date(task.dueDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    const nextDateStr = fmtIcalDate(nextDay)

    return [
      'BEGIN:VEVENT',
      `UID:${task.id}@authordash`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${nextDateStr}`,
      `SUMMARY:${escapeIcal(task.name)}`,
      `DESCRIPTION:${escapeIcal(`${task.channel} · ${task.phase}`)}`,
      `CATEGORIES:${task.channel}`,
      `STATUS:${task.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      'END:VEVENT',
    ].join('\r\n')
  })

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AuthorDash//Launch Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AuthorDash Launch Plan',
    'X-WR-TIMEZONE:UTC',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="launch.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}

function fmtIcalDate(d: Date): string {
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('')
}

function fmtIcalTime(d: Date): string {
  return [
    String(d.getUTCHours()).padStart(2, '0'),
    String(d.getUTCMinutes()).padStart(2, '0'),
    String(d.getUTCSeconds()).padStart(2, '0'),
  ].join('')
}

function escapeIcal(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
