import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type PostScheduleItem = {
  dayNumber: number
  phase: string
  type: string
  pillar: string
  bookMention: string | null
}

function buildPhase(
  pos: number,
  postsUntilLaunch: number,
  hasLaunch: boolean
): string {
  if (!hasLaunch) return 'normal'
  if (pos > postsUntilLaunch + 7) return 'normal'
  if (pos > postsUntilLaunch + 5) return 'anticipation'
  if (pos > postsUntilLaunch) return 'prelaunch'
  if (pos >= postsUntilLaunch && pos < postsUntilLaunch + 5) return 'launch'
  if (pos >= postsUntilLaunch + 5) return 'postlaunch'
  return 'normal'
}

const NORMAL_ROTATION = [
  'Single Image',
  'Carousel',
  'Single Image',
  'Quote Card',
  'Single Image',
  'Video Script',
  'Single Image',
]

const LAUNCH_TYPES = ['Launch Day', 'ARC Review', 'Origin Story', 'Social Proof']

function buildPostSchedule(
  totalPosts: number,
  pillars: string[],
  hasLaunch: boolean,
  postsUntilLaunch: number,
  launchBookTitle: string | null,
  allBookTitles: string[],
  hasQuotes: boolean,
  hasReviews: boolean
): PostScheduleItem[] {
  const schedule: PostScheduleItem[] = []
  let launchTypeIdx = 0
  let mentionCount = 0

  for (let i = 0; i < totalPosts; i++) {
    const phase = buildPhase(i + 1, postsUntilLaunch, hasLaunch)
    const pillar = pillars.length > 0 ? pillars[i % pillars.length] : 'Author Brand'

    let type: string
    if ((i + 1) % 7 === 0 && hasReviews) {
      type = 'Review'
    } else if (phase === 'launch' || phase === 'prelaunch') {
      type = LAUNCH_TYPES[launchTypeIdx % LAUNCH_TYPES.length]
      launchTypeIdx++
    } else {
      let rotType = NORMAL_ROTATION[i % NORMAL_ROTATION.length]
      if (rotType === 'Quote Card' && !hasQuotes) {
        rotType = 'Single Image'
      }
      type = rotType
    }

    let bookMention: string | null = null
    if (phase === 'launch' || phase === 'prelaunch') {
      bookMention = launchBookTitle
    } else if (allBookTitles.length > 0 && mentionCount < Math.floor(totalPosts * 0.2)) {
      if (i % 5 === 0) {
        bookMention = allBookTitles[mentionCount % allBookTitles.length]
        mentionCount++
      }
    }

    schedule.push({ dayNumber: i + 1, phase, type, pillar, bookMention })
  }
  return schedule
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = params.id

  // STEP 1 — gather all project data in parallel
  const [project, books, quotes, reviews, images] = await Promise.all([
    db.storyPostProject.findFirst({
      where: { id: projectId, userId: session.user.id },
    }),
    db.book.findMany({ where: { userId: session.user.id } }),
    db.storyPostQuote.findMany({ where: { projectId, selected: true } }),
    db.storyPostReview.findMany({ where: { projectId } }),
    db.storyPostImage.findMany({ where: { projectId } }),
  ])

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete existing posts for fresh generation
  await db.storyPostPost.deleteMany({ where: { projectId } })

  // STEP 2 — build post schedule
  const totalPosts = Math.round(30 * project.frequency / 7)
  const pillars = Array.isArray(project.pillars)
    ? (project.pillars as string[])
    : ['Author Brand', 'World Building', 'Character', 'Mood & Vibe', 'Reader Connection']

  let postsUntilLaunch = totalPosts + 100 // default: no launch in range
  if (project.hasLaunch && project.launchDate) {
    const today = new Date()
    const launch = new Date(project.launchDate)
    const daysUntilLaunch = Math.max(0, Math.round((launch.getTime() - today.getTime()) / 86400000))
    postsUntilLaunch = Math.round(daysUntilLaunch * project.frequency / 7)
  }

  const launchBook = books.find(b => b.id === project.launchBookId)
  const launchBookTitle = launchBook?.title ?? null
  const allBookTitles = books.map(b => b.title).filter(Boolean) as string[]

  const postSchedule = buildPostSchedule(
    totalPosts,
    pillars,
    project.hasLaunch && !!project.launchDate,
    postsUntilLaunch,
    launchBookTitle,
    allBookTitles,
    quotes.length > 0,
    reviews.length > 0
  )

  // STEP 3 — build the generation prompt
  const launchContext = project.hasLaunch && project.launchDate
    ? `LAUNCH CONTEXT: Book '${launchBookTitle}' launches on ${project.launchDate.toISOString().split('T')[0]}. Build anticipation across the arc.`
    : ''

  const booksContext = books.length > 0
    ? books.map(b => `- ${b.title}${b.seriesName ? ` (${b.seriesName})` : ''}`).join('\n')
    : 'No books listed yet.'

  const systemPrompt = `You are a social media content strategist for romance authors, trained in Donald Miller's StoryBrand framework, Alex Hormozi's value equation, and the trust flywheel principle.

CORE RULES:
1. The reader is always the hero. The book is never the product — it is the guide that helps her feel what she needs.
2. 80/20 rule: for every promotional post, 4 posts are pure value and connection. Never break this ratio.
3. In launch week: posts can be book-focused BUT the frame is always 'this story was written for the version of you that needed this' — never 'buy my book.'
4. Never start a caption with 'I' or a book title.
5. Never use exclamation marks unless genuinely earned.

PLATFORM HOOK DOCTRINE:

INSTAGRAM: First line must work as a standalone before the 'more' cutoff. Use pattern interrupt, open loop, or bold truth. Hook structures that work: unexpected contrast, 'the thing no one tells you about X', soft vulnerability opener, a line so specific it feels universal. Reference: Hormozi value-first, open loop structure, Cole personal truth.

FACEBOOK: Agitate first. 'You know that feeling when...' Community validation framing. Hormozi problem-agitation-solution compressed into 3 sentences. Slightly longer setup is fine — this audience reads. Can ask a direct question.

PINTEREST: Always lead with a question. Pinterest is a search engine. 'What does it feel like when he finally says it?' outperforms 'Beautiful romance reads' every single time. The question triggers saves. Keywords in sentence 2. SEO-rich but emotionally led.

AUTHOR AESTHETIC: ${project.aesthetic ?? 'Warm, intimate, emotionally authentic romance'}
READER AVATAR: ${project.avatar ?? 'Romance reader who wants to feel deeply seen and emotionally moved'}
BOOKS:
${booksContext}
PILLARS: ${pillars.join(', ')}
${launchContext}`

  const quoteBank = quotes.length > 0
    ? `QUOTE BANK (use these for Quote Card posts):\n${quotes.slice(0, 20).map((q, i) => `${i + 1}. "${q.text}"`).join('\n')}`
    : ''

  const reviewBank = reviews.length > 0
    ? `READER REVIEWS (use these for Review posts):\n${reviews.slice(0, 10).map((r, i) => `${i + 1}. "${r.text}"${r.reviewer ? ` — ${r.reviewer}` : ''}${r.bookTitle ? ` (${r.bookTitle})` : ''}`).join('\n')}`
    : ''

  const scheduleText = postSchedule.map(p =>
    `Day ${p.dayNumber}: phase=${p.phase}, type=${p.type}, pillar=${p.pillar}${p.bookMention ? `, bookMention=${p.bookMention}` : ''}`
  ).join('\n')

  const userPrompt = `Generate ${totalPosts} social media posts using this schedule:
${scheduleText}

${quoteBank}
${reviewBank}

For each post return this exact JSON structure:
{
  "dayNumber": number,
  "phase": string,
  "type": string,
  "pillar": string,
  "instagram": string,
  "instagramHashtags": string,
  "facebook": string,
  "pinterest": string,
  "pinterestLinkType": "book|author_central|website|beacons",
  "bookMention": string or null,
  "quoteUsed": string or null,
  "reviewUsed": string or null,
  "carouselSlides": [{"slide":number,"imageDirection":string,"overlayText":string}] or null,
  "videoBeats": [{"time":string,"action":string}] or null
}

Pinterest link assignment rules:
- Book mention post → "book"
- Quote card, mood, world posts → "website"
- Author brand, character posts → "author_central"
- Everything else → "beacons"

Carousel posts: always 3 slides, structure:
slide 1: hook/tension, slide 2: middle/turn, slide 3: payoff/CTA

Video Script posts: 4 beats:
0-3s hook, 3-8s setup, 8-15s payoff, 15-20s CTA

Return ONLY a JSON array. No preamble. No markdown fences.`

  // STEP 4 — call Anthropic SDK
  let rawText = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 10000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    rawText = message.content
      .filter(c => c.type === 'text')
      .map(c => (c as { type: 'text'; text: string }).text)
      .join('')
  } catch (err) {
    console.error('Anthropic generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }

  // strip markdown fences if present
  let jsonText = rawText.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
  }

  let generatedPosts: Record<string, unknown>[]
  try {
    generatedPosts = JSON.parse(jsonText)
  } catch {
    console.error('JSON parse error. Raw text:', jsonText.slice(0, 500))
    return NextResponse.json({ error: 'Failed to parse generated content' }, { status: 500 })
  }

  // STEP 5 — assign images
  const pillarImages: Record<string, typeof images> = {}
  const untagged: typeof images = []
  for (const img of images) {
    if (img.pillarTag) {
      if (!pillarImages[img.pillarTag]) pillarImages[img.pillarTag] = []
      pillarImages[img.pillarTag].push(img)
    } else {
      untagged.push(img)
    }
  }
  let untaggedIdx = 0

  function pickImage(pillar: string): { imageId: string | null; imageUrl: string | null; imageLabel: string | null } {
    const pool = pillarImages[pillar] ?? []
    if (pool.length > 0) {
      const img = pool[Math.floor(Math.random() * pool.length)]
      return { imageId: img.id, imageUrl: img.url, imageLabel: img.label ?? null }
    }
    if (untagged.length > 0) {
      const img = untagged[untaggedIdx % untagged.length]
      untaggedIdx++
      return { imageId: img.id, imageUrl: img.url, imageLabel: img.label ?? null }
    }
    return { imageId: null, imageUrl: null, imageLabel: null }
  }

  // STEP 6 — save to DB
  const toCreate = generatedPosts.map((p) => {
    const schedItem = postSchedule.find(s => s.dayNumber === (p.dayNumber as number))
    const { imageId, imageUrl, imageLabel } = pickImage(schedItem?.pillar ?? '')

    // resolve pinterest link
    let pinterestLink: string | null = null
    const linkType = p.pinterestLinkType as string
    if (linkType === 'book') pinterestLink = project.bookPageUrl ?? project.beaconsUrl ?? null
    else if (linkType === 'author_central') pinterestLink = project.authorCentral ?? project.website ?? null
    else if (linkType === 'website') pinterestLink = project.website ?? null
    else pinterestLink = project.beaconsUrl ?? null

    return {
      projectId,
      dayNumber: (p.dayNumber as number | undefined) ?? 1,
      phase: (p.phase as string | undefined) ?? 'normal',
      type: (p.type as string | undefined) ?? 'Single Image',
      pillar: (p.pillar as string | undefined) ?? pillars[0],
      instagram: (p.instagram as string | null | undefined) ?? null,
      instagramTags: (p.instagramHashtags as string | null | undefined) ?? null,
      facebook: (p.facebook as string | null | undefined) ?? null,
      pinterest: (p.pinterest as string | null | undefined) ?? null,
      pinterestLink,
      pinterestLinkType: (linkType as string | null | undefined) ?? null,
      bookMention: (p.bookMention as string | null | undefined) ?? null,
      quoteUsed: (p.quoteUsed as string | null | undefined) ?? null,
      reviewUsed: (p.reviewUsed as string | null | undefined) ?? null,
      carouselSlides: (p.carouselSlides as object | null | undefined) ?? undefined,
      videoBeats: (p.videoBeats as object | null | undefined) ?? undefined,
      imageId: imageId ?? undefined,
      imageUrl: imageUrl ?? undefined,
      imageLabel: imageLabel ?? undefined,
    }
  })

  await db.storyPostPost.createMany({ data: toCreate })

  const posts = await db.storyPostPost.findMany({
    where: { projectId },
    orderBy: { dayNumber: 'asc' },
  })

  return NextResponse.json({ posts, count: posts.length })
}
