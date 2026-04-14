export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch latest analysis data
  const analysis = await db.analysis.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  if (!analysis?.data) {
    return NextResponse.json(
      { error: 'No data uploaded yet. Upload your KDP report or Meta export first to get AI suggestions.' },
      { status: 400 }
    )
  }

  // Fetch existing tasks to avoid duplicates
  const existingTasks = await db.task.findMany({
    where: { userId: session.user.id, status: 'todo' },
    select: { title: true },
  })

  const existingTitles = existingTasks.map(t => t.title)
  const data = analysis.data as Record<string, unknown>

  const today = new Date().toISOString().slice(0, 10)

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an AI publishing coach for an indie romance author. Based on their current data, suggest 3-5 specific, actionable tasks they should do this week.

For each task return a JSON array of objects with:
- title: specific action (start with a verb: Upload, Send, Pause, Scale, Create, Schedule, etc.)
- priority: "high" | "medium" | "low"
- category: "KDP" | "Meta ads" | "MailerLite" | "Writing" | "List building" | "Pinterest" | "General"
- aiReason: brief data-backed reason (e.g. "CTR below 0.5% for 7 days")
- dueDate: suggested due date as ISO string (today is ${today})

Current data:
${JSON.stringify(data, null, 2).slice(0, 6000)}

Existing tasks (don't duplicate these):
${existingTitles.join(', ') || '(none)'}

Return ONLY valid JSON array. No explanation.`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''

  let suggestions: Array<{
    title: string
    priority?: string
    category?: string
    aiReason?: string
    dueDate?: string
  }>

  try {
    // Extract JSON from possible markdown code fences
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    suggestions = JSON.parse(jsonMatch?.[0] ?? '[]')
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  const created = await Promise.all(
    suggestions.map(s =>
      db.task.create({
        data: {
          userId: session.user.id,
          title: s.title,
          priority: s.priority ?? 'medium',
          category: s.category ?? 'General',
          isAISuggested: true,
          aiReason: s.aiReason ?? null,
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
          assignee: 'author',
        },
      })
    )
  )

  return NextResponse.json(created, { status: 201 })
}
