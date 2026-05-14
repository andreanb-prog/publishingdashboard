import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allPosts = await db.storyPostPost.findMany({
    where: { projectId: params.id },
  })

  const logged = allPosts.filter(p => p.reach != null)
  const totalPostsLogged = logged.length

  if (totalPostsLogged === 0) {
    return NextResponse.json({
      totalPostsLogged: 0,
      totalPosts: allPosts.length,
      avgReach: 0,
      avgSaves: 0,
      clickRate: 0,
      byPillar: [],
      byType: [],
      topPerformers: [],
      insights: [],
    })
  }

  const avgReach = Math.round(logged.reduce((s, p) => s + (p.reach ?? 0), 0) / totalPostsLogged)
  const avgSaves = Math.round(logged.reduce((s, p) => s + (p.saves ?? 0), 0) / totalPostsLogged)
  const clickRate = Math.round(logged.filter(p => p.clicks === true).length / totalPostsLogged * 100)

  // Group by pillar
  const pillarMap: Record<string, { reach: number[]; saves: number[] }> = {}
  for (const p of logged) {
    if (!pillarMap[p.pillar]) pillarMap[p.pillar] = { reach: [], saves: [] }
    pillarMap[p.pillar].reach.push(p.reach ?? 0)
    pillarMap[p.pillar].saves.push(p.saves ?? 0)
  }
  const byPillar = Object.entries(pillarMap).map(([pillar, d]) => ({
    pillar,
    avgReach: Math.round(d.reach.reduce((s, v) => s + v, 0) / d.reach.length),
    avgSaves: Math.round(d.saves.reduce((s, v) => s + v, 0) / d.saves.length),
    postCount: d.reach.length,
  })).sort((a, b) => b.avgReach - a.avgReach)

  // Group by type
  const typeMap: Record<string, { reach: number[]; saves: number[] }> = {}
  for (const p of logged) {
    if (!typeMap[p.type]) typeMap[p.type] = { reach: [], saves: [] }
    typeMap[p.type].reach.push(p.reach ?? 0)
    typeMap[p.type].saves.push(p.saves ?? 0)
  }
  const byType = Object.entries(typeMap).map(([type, d]) => ({
    type,
    avgReach: Math.round(d.reach.reduce((s, v) => s + v, 0) / d.reach.length),
    avgSaves: Math.round(d.saves.reduce((s, v) => s + v, 0) / d.saves.length),
    postCount: d.reach.length,
  })).sort((a, b) => b.avgReach - a.avgReach)

  const topPerformers = [...logged]
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))
    .slice(0, 3)

  let insights: string[] = []

  if (totalPostsLogged >= 5) {
    const statsJson = JSON.stringify({
      totalPostsLogged,
      avgReach,
      avgSaves,
      clickRate,
      byPillar,
      byType,
      topPerformers: topPerformers.map(p => ({
        pillar: p.pillar,
        type: p.type,
        reach: p.reach,
        saves: p.saves,
        clicks: p.clicks,
      })),
    }, null, 2)

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        system: `You are a social media performance analyst for romance authors. You give direct, specific, actionable insights based on real data. No fluff.`,
        messages: [{
          role: 'user',
          content: `Here is the performance data for this author's social media posts:\n${statsJson}\n\nWrite 3-5 specific insights in this format:\n- What's working (which pillar/type performs best and why)\n- What to cut or reduce\n- One specific recommendation for the next calendar\n\nReturn as a JSON array of strings. Each string is one insight, 1-2 sentences, direct and specific.\nStart each with: MOMENTUM: / OPPORTUNITY: / CONSIDER:\n\nReturn ONLY a JSON array. No preamble.`,
        }],
      })

      const raw = msg.content
        .filter(c => c.type === 'text')
        .map(c => (c as { type: 'text'; text: string }).text)
        .join('')

      let parsed = raw.trim()
      if (parsed.startsWith('```')) {
        parsed = parsed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
      }
      insights = JSON.parse(parsed) as string[]
    } catch (err) {
      console.error('Insights generation error:', err)
      insights = []
    }

    // Save insights to project
    await db.storyPostProject.update({
      where: { id: params.id },
      data: { insights },
    })
  }

  return NextResponse.json({
    totalPostsLogged,
    totalPosts: allPosts.length,
    avgReach,
    avgSaves,
    clickRate,
    byPillar,
    byType,
    topPerformers,
    insights,
  })
}
