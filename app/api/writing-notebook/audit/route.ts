// app/api/writing-notebook/audit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { buildAuditSystemPrompt, type AuditType, type AuditFinding } from '@/lib/auditPrompts'

const VALID_AUDIT_TYPES: AuditType[] = ['ku_pacing', 'heat_map', 'emotional_arc']

// POST — run an audit on a chapter
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, chapterIndex, draftIndex, auditType, chapterContent, chapterTitle, bookTitle } = await req.json()

  if (!bookId || chapterIndex == null || !auditType || !chapterContent) {
    return NextResponse.json({ error: 'bookId, chapterIndex, auditType, and chapterContent required' }, { status: 400 })
  }

  if (!VALID_AUDIT_TYPES.includes(auditType)) {
    return NextResponse.json({ error: `Invalid auditType. Must be one of: ${VALID_AUDIT_TYPES.join(', ')}` }, { status: 400 })
  }

  const userId = session.user.id
  const wordCount = chapterContent.trim().split(/\s+/).length

  const systemPrompt = buildAuditSystemPrompt(
    auditType,
    bookTitle || 'Untitled',
    chapterIndex + 1,
    chapterTitle || '',
    wordCount,
  )

  let findings: AuditFinding[]
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: chapterContent.slice(0, 30000) }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    findings = JSON.parse(text)

    if (!Array.isArray(findings)) {
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 })
    }
  } catch (e: unknown) {
    const message = e instanceof SyntaxError ? 'Failed to parse AI response as JSON' : 'AI audit failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Save to database
  const audit = await db.chapterAudit.create({
    data: {
      userId,
      bookId,
      chapterIndex,
      draftIndex: draftIndex ?? 0,
      auditType,
      findings: JSON.stringify(findings),
    },
  })

  return NextResponse.json({ id: audit.id, findings, createdAt: audit.createdAt })
}

// GET — fetch existing audits for a chapter
export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  const chapterIndex = searchParams.get('chapterIndex')
  const auditType = searchParams.get('auditType')

  if (!bookId || chapterIndex == null) {
    return NextResponse.json({ error: 'bookId and chapterIndex required' }, { status: 400 })
  }

  const where: Record<string, unknown> = {
    userId: session.user.id,
    bookId,
    chapterIndex: parseInt(chapterIndex, 10),
  }
  if (auditType) where.auditType = auditType

  const audits = await db.chapterAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({
    audits: audits.map(a => ({
      id: a.id,
      auditType: a.auditType,
      draftIndex: a.draftIndex,
      findings: JSON.parse(a.findings),
      createdAt: a.createdAt,
    })),
  })
}
