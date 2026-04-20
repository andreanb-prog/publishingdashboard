export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch latest analysis data + existing tasks in parallel
  const [analysis, existingTasks, user] = await Promise.all([
    db.analysis.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    db.task.findMany({
      where: { userId: session.user.id, status: 'todo' },
      select: { title: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { mailerLiteKey: true, books: true },
    }),
  ])

  const existingTitles = existingTasks.map(t => t.title)
  const analysisData = (analysis?.data as Record<string, unknown>) ?? null
  const today = new Date().toISOString().slice(0, 10)

  // Build context sections
  const dataSections: string[] = []

  if (analysisData) {
    dataSections.push(`Dashboard analysis data:\n${JSON.stringify(analysisData, null, 2).slice(0, 5000)}`)
  }

  if (user?.books) {
    dataSections.push(`Author's books: ${JSON.stringify(user.books)}`)
  }

  const hasData = dataSections.length > 0

  const dataContext = hasData
    ? dataSections.join('\n\n')
    : 'No data uploaded yet. Suggest generic getting-started tasks for a new indie author: upload KDP report, connect MailerLite, set up first ad campaign, complete book catalog, schedule first newsletter.'

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an AI publishing coach for an indie author. Based on their current data, suggest 3-5 specific, actionable tasks they should do this week.

For each task return a JSON array of objects with:
- title: specific action (start with a verb: Upload, Send, Pause, Scale, Create, Schedule, etc.)
- priority: "high" | "medium" | "low"
- category: "KDP" | "Meta ads" | "MailerLite" | "Writing" | "List building" | "Pinterest" | "General"
- aiReason: brief data-backed reason (e.g. "CTR below 0.5% for 7 days")
- dueDate: suggested due date as ISO string (today is ${today})

${dataContext}

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
