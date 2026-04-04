// prisma/seed-launch-templates.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const templates = [
  // Pre-order phase
  {
    name: 'Write ad copy brief',
    channel: 'Ads',
    daysFromLaunch: -30,
    description: 'Tropes, hook angles, comp authors',
    actionType: 'copy',
    actionPrompt: 'Write a Facebook/Instagram ad copy brief for [BOOK_TITLE], launching [LAUNCH_DATE]. Include: 3 hook angles based on the book\'s core appeal, 2 comp author angles, and a primary CTA. Format as a creative brief I can hand to a copywriter.',
    phase: 'pre-order',
  },
  {
    name: 'Build Canva creatives — cover reveal set',
    channel: 'Creative',
    daysFromLaunch: -28,
    description: 'Cover reveal set (4 variants)',
    actionType: 'brief',
    actionPrompt: 'Write a creative brief for a cover reveal ad set for [BOOK_TITLE] (launching [LAUNCH_DATE]) with 4 variants. Include: main hero image direction, text overlay options, color palette guidance, and sizing specs for Feed (1:1), Stories (9:16), and Reels.',
    phase: 'pre-order',
  },
  {
    name: 'Launch pre-order Meta campaign',
    channel: 'Ads',
    daysFromLaunch: -21,
    description: 'Trope stack angle',
    actionType: 'copy',
    actionPrompt: 'Write 3 pre-order ad copy variations for [BOOK_TITLE] (launching [LAUNCH_DATE]). Each should be 125 characters or less for primary text, with a headline and description. Lead with a strong hook that speaks to readers of this genre. Tone: warm, reader-first.',
    phase: 'pre-order',
  },
  {
    name: 'Send cover reveal to email list',
    channel: 'Email',
    daysFromLaunch: -21,
    description: 'Cover reveal email to subscribers',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'ARC team reminder',
    channel: 'Email',
    daysFromLaunch: -18,
    description: 'Review deadline 7 days before launch',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'Day 3 ad check-in',
    channel: 'Ads',
    daysFromLaunch: -14,
    description: 'Kill under 1% CTR, scale winner',
    actionType: 'review',
    actionPrompt: 'I\'m running pre-order Meta ads for [BOOK_TITLE], launching [LAUNCH_DATE]. Based on what you know about my campaigns, review my current ad performance and tell me: which ads to kill (under 1% CTR), which to scale, and what copy angle to test next.',
    phase: 'pre-order',
  },
  {
    name: 'Send early access email to launch team',
    channel: 'Email',
    daysFromLaunch: -14,
    description: 'Email your closest author contacts and early supporters about the launch',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'Hook/tension creative set',
    channel: 'Creative',
    daysFromLaunch: -14,
    description: '4 variants',
    actionType: 'brief',
    actionPrompt: 'Write a creative brief for a hook/tension ad creative set for [BOOK_TITLE] (launching [LAUNCH_DATE]) with 4 variants. Focus on emotional tension, unresolved conflict, and reader curiosity. Each variant should test a different emotional angle.',
    phase: 'pre-order',
  },
  {
    name: 'Cover reveal social posts',
    channel: 'Social',
    daysFromLaunch: -10,
    description: 'Grid + stories',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'Launch week email drafted and scheduled',
    channel: 'Email',
    daysFromLaunch: -7,
    description: 'Draft and schedule launch day email',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'Retargeting campaign built',
    channel: 'Ads',
    daysFromLaunch: -7,
    description: 'Website + IG visitors',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'Ad campaigns fully built and reviewed',
    channel: 'Ads',
    daysFromLaunch: -3,
    description: 'Final review before launch',
    actionType: 'review',
    actionPrompt: 'I\'m 3 days from launching [BOOK_TITLE] on [LAUNCH_DATE]. Review my pre-launch Meta campaign structure and flag any risks: audience overlap, budget allocation, creative fatigue, or anything that could cause ad disapproval. Give me a clear go/no-go with specific fixes.',
    phase: 'pre-order',
  },
  {
    name: 'ARC reminder — final push for reviews',
    channel: 'Email',
    daysFromLaunch: -3,
    description: 'Final push for ARC reviews',
    actionType: null,
    actionPrompt: null,
    phase: 'pre-order',
  },
  {
    name: 'Final QA pass on book listing',
    channel: 'General',
    daysFromLaunch: -1,
    description: 'Cover, blurb, categories, keywords',
    actionType: 'review',
    actionPrompt: 'I\'m launching [BOOK_TITLE] tomorrow ([LAUNCH_DATE]). Do a final QA pass on my Amazon listing. Check my blurb hook, category fit, keyword optimization, and anything that could hurt launch day discoverability. Tell me exactly what to fix today.',
    phase: 'pre-order',
  },
  // Launch phase
  {
    name: 'Launch day email sends',
    channel: 'Email',
    daysFromLaunch: 0,
    description: 'Launch day email goes out',
    actionType: null,
    actionPrompt: null,
    phase: 'launch',
  },
  {
    name: 'Launch day campaign goes live',
    channel: 'Ads',
    daysFromLaunch: 0,
    description: 'Activate launch campaigns',
    actionType: null,
    actionPrompt: null,
    phase: 'launch',
  },
  {
    name: 'Launch day posts',
    channel: 'Social',
    daysFromLaunch: 0,
    description: 'Feed + stories + reels',
    actionType: null,
    actionPrompt: null,
    phase: 'launch',
  },
  {
    name: 'Monitor reviews and reader response',
    channel: 'General',
    daysFromLaunch: 1,
    description: 'Check reviews and reader feedback',
    actionType: null,
    actionPrompt: null,
    phase: 'launch',
  },
  {
    name: 'Day 3 post-launch ad review',
    channel: 'Ads',
    daysFromLaunch: 3,
    description: 'Adjust budget, swap copy',
    actionType: 'review',
    actionPrompt: 'I\'m on day 3 of my [BOOK_TITLE] launch campaign. My launch was [LAUNCH_DATE]. Based on what you know about my Meta campaigns, review my current ad performance and tell me: which ads to kill (under 1% CTR), which to scale, and what copy angle to test next based on early reader response.',
    phase: 'launch',
  },
  {
    name: 'Reader engagement email',
    channel: 'Email',
    daysFromLaunch: 5,
    description: 'Thank you + KU callout',
    actionType: null,
    actionPrompt: null,
    phase: 'launch',
  },
  {
    name: 'Swap in review-based ad copy',
    channel: 'Ads',
    daysFromLaunch: 7,
    description: 'Reader quotes as social proof',
    actionType: 'copy',
    actionPrompt: 'I launched [BOOK_TITLE] on [LAUNCH_DATE] and early reader reviews are coming in. Write 3 ad copy variations using reader review quotes as social proof. Pull from the strongest emotional angles readers respond to for this genre. Make them feel authentic, not salesy.',
    phase: 'launch',
  },
  // Post-launch phase
  {
    name: 'KU/KENP push campaign',
    channel: 'Ads',
    daysFromLaunch: 10,
    description: 'Kindle Unlimited readers',
    actionType: null,
    actionPrompt: null,
    phase: 'post-launch',
  },
  {
    name: 'Series read-through email',
    channel: 'Email',
    daysFromLaunch: 14,
    description: 'Push Book 1 to new readers',
    actionType: null,
    actionPrompt: null,
    phase: 'post-launch',
  },
  {
    name: 'Series ad — B1 → B3 funnel creative',
    channel: 'Ads',
    daysFromLaunch: 21,
    description: 'Series funnel creative',
    actionType: 'brief',
    actionPrompt: 'Write a creative brief for a series funnel ad following the [BOOK_TITLE] launch ([LAUNCH_DATE]). Goal: get new readers to start at Book 1 and read through the full series. Include: hook angle for series starters, binge-reading angle, and visual direction.',
    phase: 'post-launch',
  },
  {
    name: 'Distill evergreen creative',
    channel: 'Ads',
    daysFromLaunch: 30,
    description: 'Top 1-2 winning hooks',
    actionType: null,
    actionPrompt: null,
    phase: 'post-launch',
  },
  // Evergreen phase
  {
    name: 'Launch evergreen campaign',
    channel: 'Ads',
    daysFromLaunch: 35,
    description: 'Low daily budget, best creative',
    actionType: null,
    actionPrompt: null,
    phase: 'evergreen',
  },
]

async function main() {
  console.log('Seeding launch templates...')

  for (const template of templates) {
    // Use a composite key: name + daysFromLaunch + phase to identify duplicates
    const existing = await prisma.launchTemplate.findFirst({
      where: {
        name: template.name,
        daysFromLaunch: template.daysFromLaunch,
        phase: template.phase,
      },
    })

    if (existing) {
      await prisma.launchTemplate.update({
        where: { id: existing.id },
        data: template,
      })
      console.log(`  Updated: ${template.name} (${template.daysFromLaunch}d)`)
    } else {
      await prisma.launchTemplate.create({ data: template })
      console.log(`  Created: ${template.name} (${template.daysFromLaunch}d)`)
    }
  }

  console.log(`Done! ${templates.length} templates seeded.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
