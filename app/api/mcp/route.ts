// app/api/mcp/route.ts
// AuthorDash MCP Server — Claude integration layer
// Connect via: https://authordash.io/api/mcp

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// ── CORS ───────────────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, mcp-session-id',
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

// ── Auth ───────────────────────────────────────────────────────────────────────
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null

  const session = await db.session.findUnique({ where: { sessionToken: token } })
  if (!session || session.expires < new Date()) return null
  return session.userId
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// ── Streak helper ──────────────────────────────────────────────────────────────
const STREAK_MILESTONES = new Set([3, 7, 14, 30, 60, 100])

async function recordStreakEvent(userId: string, actionType: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  await db.streakEvent.create({ data: { userId, date: today, actionType } })

  const streak = await db.userStreak.findUnique({ where: { userId } })
  if (!streak) {
    await db.userStreak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastCheckInDate: today, totalCheckIns: 1 },
    })
    return
  }

  const last = streak.lastCheckInDate
    ? new Date(streak.lastCheckInDate.getFullYear(), streak.lastCheckInDate.getMonth(), streak.lastCheckInDate.getDate())
    : null
  const alreadyToday = last?.getTime() === today.getTime()

  if (alreadyToday) {
    await db.userStreak.update({ where: { userId }, data: { totalCheckIns: { increment: 1 } } })
    return
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const wasYesterday = last?.getTime() === yesterday.getTime()

  const newStreak = wasYesterday ? streak.currentStreak + 1 : 1
  const newLongest = Math.max(newStreak, streak.longestStreak)
  const earnedFreeze = STREAK_MILESTONES.has(newStreak)
  const newFreezes = earnedFreeze ? Math.min(streak.freezesAvailable + 1, 2) : streak.freezesAvailable

  await db.userStreak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCheckInDate: today,
      totalCheckIns: { increment: 1 },
      freezesAvailable: newFreezes,
    },
  })
}

// ── MCP Server factory (one per request — stateless) ──────────────────────────
function buildServer(userId: string): McpServer {
  const server = new McpServer({ name: 'AuthorDash', version: '1.0.0' })

  // Auto-log a claude_query event on every tool call
  async function autoLog() {
    try { await recordStreakEvent(userId, 'claude_query') } catch { /* non-fatal */ }
  }

  // ── get_books ──────────────────────────────────────────────────────────────
  server.tool(
    'get_books',
    'Get all books for the authenticated user',
    async () => {
      await autoLog()
      const books = await db.book.findMany({
        where: { userId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, title: true, asin: true, launchDate: true, phase: true, colorCode: true, tropeNotes: true },
      })
      return { content: [{ type: 'text', text: JSON.stringify({ books }) }] }
    },
  )

  // ── get_book_brief ─────────────────────────────────────────────────────────
  server.tool(
    'get_book_brief',
    'Get full session context for a book',
    { book_id: z.string() },
    async ({ book_id }) => {
      await autoLog()
      const book = await db.book.findFirst({
        where: { id: book_id, userId },
        select: {
          title: true, seriesName: true, seriesOrder: true, tropeNotes: true,
          compAuthors: true, launchDate: true, phase: true, targetWordCount: true,
        },
      })
      if (!book) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Book not found' }) }], isError: true }

      const now = new Date()
      const daysToLaunch = book.launchDate
        ? Math.ceil((book.launchDate.getTime() - now.getTime()) / 86_400_000)
        : null

      const parts = [book.title]
      if (daysToLaunch !== null) parts.push(`${daysToLaunch} days to launch`)
      if (book.phase) parts.push(`Phase: ${book.phase}`)
      if (book.tropeNotes) parts.push(`Tropes: ${book.tropeNotes}`)
      const session_context = parts.join('. ')

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: book.title,
            series: book.seriesName,
            bookNumber: book.seriesOrder,
            tropes: book.tropeNotes,
            compAuthors: book.compAuthors,
            launchDate: book.launchDate,
            phase: book.phase,
            targetWordCount: book.targetWordCount,
            session_context,
          }),
        }],
      }
    },
  )

  // ── get_launch_tasks ───────────────────────────────────────────────────────
  server.tool(
    'get_launch_tasks',
    'Get launch tasks for a book. filter: "this_week" (default), "overdue", or "all"',
    { book_id: z.string(), filter: z.enum(['this_week', 'overdue', 'all']).optional() },
    async ({ book_id, filter = 'this_week' }) => {
      await autoLog()

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() + 7)

      type WhereClause = {
        userId: string
        bookId?: string
        status?: { notIn: string[] }
        dueDate?: { lte?: Date; lt?: Date }
      }

      let where: WhereClause = { userId, bookId: book_id }
      if (filter === 'this_week') {
        where = { ...where, status: { notIn: ['done', 'skipped'] }, dueDate: { lte: weekEnd } }
      } else if (filter === 'overdue') {
        where = { ...where, status: { notIn: ['done', 'skipped'] }, dueDate: { lt: today } }
      }

      const tasks = await db.launchTask.findMany({ where, orderBy: { dueDate: 'asc' } })

      const label = filter === 'this_week' ? 'due this week' : filter === 'overdue' ? 'overdue' : 'total'
      const session_context = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} ${label}.`

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tasks: tasks.map(t => ({
              id: t.id,
              name: t.name,
              channel: t.channel,
              phase: t.phase,
              dueDate: t.dueDate,
              status: t.status,
              actionPrompt: t.actionPrompt,
            })),
            session_context,
          }),
        }],
      }
    },
  )

  // ── update_task ────────────────────────────────────────────────────────────
  server.tool(
    'update_task',
    'Update the status of a launch task. If status is "done", records a streak event.',
    { task_id: z.string(), status: z.enum(['done', 'in_progress', 'skipped']) },
    async ({ task_id, status }) => {
      await autoLog()

      const task = await db.launchTask.findFirst({ where: { id: task_id, userId } })
      if (!task) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Task not found' }) }], isError: true }

      await db.launchTask.update({ where: { id: task_id }, data: { status } })

      if (status === 'done') {
        await recordStreakEvent(userId, 'task_complete')
      }

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, task_id, status }) }] }
    },
  )

  // ── get_streak ─────────────────────────────────────────────────────────────
  server.tool(
    'get_streak',
    'Get the current streak for the authenticated user',
    async () => {
      await autoLog()

      let streak = await db.userStreak.findUnique({ where: { userId } })
      if (!streak) {
        streak = await db.userStreak.create({
          data: { userId, currentStreak: 0, longestStreak: 0, totalCheckIns: 0, freezesAvailable: 0 },
        })
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastCheckInDate: streak.lastCheckInDate,
            freezesAvailable: streak.freezesAvailable,
            totalCheckIns: streak.totalCheckIns,
          }),
        }],
      }
    },
  )

  // ── log_checkin ────────────────────────────────────────────────────────────
  server.tool(
    'log_checkin',
    'Log a check-in event and update streak. Idempotent — safe to call multiple times per day.',
    {
      action_type: z.enum(['task_complete', 'spend_log', 'check_in', 'upload', 'claude_query']),
    },
    async ({ action_type }) => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const existing = await db.userStreak.findUnique({ where: { userId } })
      const last = existing?.lastCheckInDate
        ? new Date(
            existing.lastCheckInDate.getFullYear(),
            existing.lastCheckInDate.getMonth(),
            existing.lastCheckInDate.getDate(),
          )
        : null
      if (last?.getTime() === today.getTime()) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ already_checked_in: true, streak: existing }),
          }],
        }
      }

      await recordStreakEvent(userId, action_type)
      const updated = await db.userStreak.findUnique({ where: { userId } })
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, streak: updated }) }] }
    },
  )

  // ── get_ad_performance ────────────────────────────────────────────────────
  server.tool(
    'get_ad_performance',
    'Get Hook & Creative Tracker entries for a book',
    { book_id: z.string() },
    async ({ book_id }) => {
      await autoLog()

      const book = await db.book.findFirst({ where: { id: book_id, userId } })
      if (!book) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Book not found' }) }], isError: true }

      const hooks = await db.hookTracker.findMany({
        where: { userId, bookId: book_id },
        orderBy: { testDate: 'desc' },
      })

      return { content: [{ type: 'text', text: JSON.stringify({ hooks }) }] }
    },
  )

  // ── push_task ──────────────────────────────────────────────────────────────
  server.tool(
    'push_task',
    'Create a new launch task for a book',
    {
      book_id: z.string(),
      name: z.string(),
      channel: z.string(),
      due_date: z.string(),
      phase: z.string().optional(),
    },
    async ({ book_id, name, channel, due_date, phase }) => {
      await autoLog()

      const task = await db.launchTask.create({
        data: {
          userId,
          bookId: book_id,
          name,
          channel,
          phase: phase ?? 'launch',
          dueDate: new Date(due_date),
          status: 'not_started',
        },
      })

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, task }) }] }
    },
  )

  // ── push_decision ─────────────────────────────────────────────────────────
  server.tool(
    'push_decision',
    'Log a marketing or launch decision for a book',
    {
      book_id: z.string(),
      phase: z.string(),
      summary: z.string(),
      context: z.string().optional(),
    },
    async ({ book_id, phase, summary, context }) => {
      await autoLog()

      const decision = await db.decisionsLog.create({
        data: { userId, bookId: book_id, phase, summary, context: context ?? null },
      })

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, decision }) }] }
    },
  )

  // ── get_decisions_log ─────────────────────────────────────────────────────
  server.tool(
    'get_decisions_log',
    'Get recent decisions for a book, newest first. Default limit: 10.',
    { book_id: z.string(), limit: z.number().optional() },
    async ({ book_id, limit = 10 }) => {
      await autoLog()

      const book = await db.book.findFirst({ where: { id: book_id, userId } })
      if (!book) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Book not found' }) }], isError: true }

      const decisions = await db.decisionsLog.findMany({
        where: { userId, bookId: book_id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      const session_context = decisions.length > 0
        ? `Last decision: "${decisions[0].summary}" (${decisions[0].phase ?? 'unphased'})`
        : 'No decisions logged yet.'

      return { content: [{ type: 'text', text: JSON.stringify({ decisions, session_context }) }] }
    },
  )

  // ── push_hook ─────────────────────────────────────────────────────────────
  server.tool(
    'push_hook',
    'Create a new Hook & Creative Tracker entry for a book. Status defaults to "NEW".',
    {
      book_id: z.string(),
      hook_text: z.string(),
      trope: z.string().optional(),
      format: z.string().optional(),
    },
    async ({ book_id, hook_text, trope, format }) => {
      await autoLog()

      const hook = await db.hookTracker.create({
        data: {
          userId,
          bookId: book_id,
          hook: hook_text,
          trope: trope ?? null,
          format: format ?? null,
          status: 'NEW',
        },
      })

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, hook }) }] }
    },
  )

  return server
}

// ── Route handlers ─────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return unauthorizedResponse()

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = buildServer(userId)
  await server.connect(transport)
  return withCors(await transport.handleRequest(req))
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return unauthorizedResponse()

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = buildServer(userId)
  await server.connect(transport)
  return withCors(await transport.handleRequest(req))
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return unauthorizedResponse()

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = buildServer(userId)
  await server.connect(transport)
  return withCors(await transport.handleRequest(req))
}
