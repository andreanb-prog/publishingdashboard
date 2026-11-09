// lib/site.ts
// Everything you'd want to edit on the site lives here: name, booking link,
// sessions, prices, FAQ. The page components only read from this file.

export const site = {
  brand: 'AuthorDash',
  consultant: 'Andrea',
  tagline: 'AI systems for indie authors',
  // Paste your Calendly / Cal.com / TidyCal link here. Until it's set,
  // every "Book" button scrolls to the sessions section instead.
  bookingUrl: 'https://calendly.com/andrea-authordash/30min',
  // Optional public contact email shown in the footer. Leave blank to hide.
  contactEmail: 'andrea@authordash.io',
  url: 'https://authordash.io',
}

export type Session = {
  name: string
  length: string
  price?: string // e.g. '$150'. Leave undefined to show "Pricing on the call".
  priceNote?: string // small line under the price, e.g. a payment plan
  summary: string
  includes: string[]
  featured?: boolean
  bookingUrl?: string // direct booking link for this session; falls back to the discovery call
}

export const sessions: Session[] = [
  {
    name: 'Discovery call',
    length: '20 minutes',
    price: 'Free',
    summary:
      'We talk through where your week goes and where AI could take something off your plate. You leave with one idea you can try that day.',
    includes: [
      'A quick look at your current tools and routines',
      'Honest read on whether AI is a fit right now',
      'One small first step, no strings',
    ],
  },
  {
    name: 'System session',
    length: '90 minutes',
    price: '$197',
    bookingUrl: 'https://calendly.com/andrea-authordash/system-session',
    summary:
      'We pick one recurring task and build the AI system for it together, live, in the tools you already use. You walk away with it working.',
    includes: [
      'A working assistant, project or skill built with you',
      'Custom instructions written in your voice',
      'Recording plus a one-page "how to run it" guide',
      'A week of follow-up questions by email',
    ],
    featured: true,
  },
  {
    name: 'Author OS build',
    length: '4 sessions over a month',
    price: '$499',
    priceNote: 'or 2 payments of $250',
    summary:
      'A connected set of systems for your whole author business: launches, ads review, newsletter, reader content, and your weekly numbers.',
    includes: [
      'Workflow map of your publishing week',
      'Three to five systems built and tested with you',
      'Connections to Notion, MailerLite, Drive and more',
      'A check-in a month later to tune what you use',
    ],
  },
]

export const systems = [
  {
    title: 'Weekly numbers, read for you',
    body: 'Drop in your KDP and ads reports and get a plain-English summary: what moved, what to watch, what to try next week.',
  },
  {
    title: 'Launch planner',
    body: 'Give it a release date and it builds your timeline, promo stack and newsletter swaps, then keeps the checklist honest.',
  },
  {
    title: 'Newsletter swap triage',
    body: 'Sorts swap requests and confirmations from your inbox, flags conflicts, and keeps your tracker current.',
  },
  {
    title: 'Ad copy and hook bank',
    body: 'Trained on your tropes, blurbs and best-performing ads, so new variations sound like you and not like a robot.',
  },
  {
    title: 'Reader content engine',
    body: 'Turns a chapter or a character into a month of posts, bonus scenes and newsletter ideas you can edit and approve.',
  },
  {
    title: 'Series bible assistant',
    body: 'Holds your characters, timelines and world details so you can ask questions instead of digging through old notes.',
  },
]

export const steps = [
  {
    title: 'Book a call',
    body: 'Start with the free discovery call. No prep needed, just bring the task you dread most.',
  },
  {
    title: 'Map your week',
    body: 'We look at where your time actually goes and choose the system that buys back the most of it.',
  },
  {
    title: 'Build it together',
    body: 'We build it live in Claude, ChatGPT or the tools you already pay for, so you see every piece.',
  },
  {
    title: 'You own it',
    body: 'Everything lives in your accounts. No subscription to me, nothing that breaks when we stop working together.',
  },
]

export const faqs = [
  {
    q: 'Do I need to be technical?',
    a: "No. If you can write a book, you can run these systems. We build in plain language, and I write the setup guide so future you doesn't have to remember anything.",
  },
  {
    q: 'Which AI tools do you work with?',
    a: 'Mostly Claude and ChatGPT, plus the places your business already lives: Notion, Google Drive, MailerLite, Gmail, Canva. I recommend whatever fits your budget, including the free tiers.',
  },
  {
    q: 'Will this write my books for me?',
    a: "That's not what I do. These systems handle the business side of publishing so you have more time and energy to write. Your stories and your voice stay yours.",
  },
  {
    q: 'Can you guarantee more sales?',
    a: "No one honestly can. What I can promise is less busywork, clearer numbers, marketing that's easier to keep up with week after week, and an easier way to see what's actually working in your business.",
  },
  {
    q: 'What if I already pay for an AI tool and barely use it?',
    a: 'That is the most common starting point. We usually get far more out of the subscription you already have before adding anything new.',
  },
]
