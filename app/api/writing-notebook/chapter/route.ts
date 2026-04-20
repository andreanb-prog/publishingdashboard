// app/api/writing-notebook/chapter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { bookId?: string; chapterIndex?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { bookId, chapterIndex } = body
  if (typeof chapterIndex !== 'number') {
    return NextResponse.json({ error: 'chapterIndex required' }, { status: 400 })
  }

  const userId = session.user.id
  const safeBookId = bookId ?? null
  const N = chapterIndex

  // Fetch all records for this user + book upfront
  const allRecords = await db.writingNotebook.findMany({
    where: { userId, bookId: safeBookId },
  })

  // ── Step 1: Identify records to delete ──────────────────────────────
  const deleteIds: string[] = []
  for (const r of allRecords) {
    // Legacy writing:chapter with DB chapterIndex field
    if (r.phase === 'writing' && r.section === 'chapter' && r.chapterIndex === N) {
      deleteIds.push(r.id)
      continue
    }
    // New drafts: section='chapter:N:draft:M' (chapterIndex null)
    const draftMatch = r.section.match(/^chapter:(\d+):/)
    if (draftMatch && parseInt(draftMatch[1]) === N) {
      deleteIds.push(r.id)
      continue
    }
    // Draft meta: section='chapterDraftMeta:N'
    const draftMetaMatch = r.section.match(/^chapterDraftMeta:(\d+)$/)
    if (draftMetaMatch && parseInt(draftMetaMatch[1]) === N) {
      deleteIds.push(r.id)
      continue
    }
    // Polish finalDraft: phase='polish', section='finalDraft', chapterIndex=N
    if (r.phase === 'polish' && r.section === 'finalDraft' && r.chapterIndex === N) {
      deleteIds.push(r.id)
    }
  }

  if (deleteIds.length > 0) {
    await db.writingNotebook.deleteMany({ where: { id: { in: deleteIds } } })
  }

  // ── Step 2: Renumber chapters > N (shift down by 1) ─────────────────
  const remaining = allRecords.filter(r => !deleteIds.includes(r.id))

  for (const r of remaining) {
    // Legacy: DB chapterIndex field
    if (r.chapterIndex != null && r.chapterIndex > N) {
      await db.writingNotebook.update({
        where: { id: r.id },
        data: { chapterIndex: r.chapterIndex - 1 },
      })
      continue
    }
    // New drafts: chapter:M:draft:X → chapter:M-1:draft:X
    const draftMatch = r.section.match(/^chapter:(\d+):(.+)$/)
    if (draftMatch) {
      const M = parseInt(draftMatch[1])
      if (M > N) {
        await db.writingNotebook.update({
          where: { id: r.id },
          data: { section: `chapter:${M - 1}:${draftMatch[2]}` },
        })
      }
      continue
    }
    // Draft meta: chapterDraftMeta:M → chapterDraftMeta:M-1
    const draftMetaMatch = r.section.match(/^chapterDraftMeta:(\d+)$/)
    if (draftMetaMatch) {
      const M = parseInt(draftMetaMatch[1])
      if (M > N) {
        await db.writingNotebook.update({
          where: { id: r.id },
          data: { section: `chapterDraftMeta:${M - 1}` },
        })
      }
    }
  }

  // ── Step 3: Update chapterMeta for writing + polish ──────────────────
  let newCount = 0
  for (const phase of ['writing', 'polish'] as const) {
    const metaRecord = remaining.find(r =>
      r.phase === phase && r.section === 'chapterMeta' && r.chapterIndex == null
    )
    if (!metaRecord) continue
    try {
      const meta = JSON.parse(metaRecord.content)
      const titles: string[] = meta.titles ?? []
      const statuses: string[] = meta.statuses ?? []
      titles.splice(N, 1)
      statuses.splice(N, 1)
      const updatedCount = Math.max(0, (meta.count ?? 1) - 1)
      if (phase === 'writing') newCount = updatedCount
      await db.writingNotebook.update({
        where: { id: metaRecord.id },
        data: { content: JSON.stringify({ ...meta, count: updatedCount, titles, statuses }) },
      })
    } catch { /* noop */ }
  }

  return NextResponse.json({ success: true, newCount })
}
