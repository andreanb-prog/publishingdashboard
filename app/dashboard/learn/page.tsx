'use client'
// app/(dashboard)/learn/page.tsx
import { useState } from 'react'

const TERMS = [
  {
    emoji: '💰',
    term: 'ROAS — Did my ads make money?',
    teaser: 'For every $1 spent on ads, how many dollars came back',
    body: `ROAS stands for Return on Ad Spend. If you spend $10 on Facebook ads and earn $18 in book royalties because of those ads, your ROAS is 1.8x.

A 1x ROAS means you broke even — every dollar you spent came back. Below 1x means you lost money. Above 2x means you're growing profitably.

Think of it like a vending machine: you put in $1 and you get $1.80 back. The goal is to get that number as high as possible without sacrificing ad volume.`,
    benchmark: 'For romance authors starting out: 1.2x–2x is healthy. You\'re building an audience AND making money. Above 3x means scale aggressively. Below 1x for more than a week — pause and rethink your creative.',
    color: '#e9a020',
  },
  {
    emoji: '📖',
    term: 'KENP — How KU page reads become money',
    teaser: 'Every page a Kindle Unlimited reader reads = a small payment to you',
    body: `KENP stands for Kindle Edition Normalized Pages. When someone has Kindle Unlimited and reads your book, Amazon pays you per page they actually read — roughly $0.004 to $0.005 per page.

A typical 300-page romance novel earns about $1.20–$1.50 per full read. At scale, 10,000 KENP reads = $40–50. Your 6,305 KENP reads in March earned roughly $25–30.

The magic: as you build your series, readers who finish Book 2 go back and borrow Book 1. Both KENP numbers climb together — that's the series flywheel working.`,
    benchmark: 'Rising KENP = readers finishing your books and borrowing more. FDMBP getting more reads than MOLR is exactly right — it\'s the series halo effect. Each MOLR promo drives FDMBP reads.',
    color: '#fbbf24',
  },
  {
    emoji: '👆',
    term: 'CTR — Are people clicking my ads?',
    teaser: 'The % of people who saw your ad and actually tapped it',
    body: `CTR stands for Click-Through Rate. Out of everyone who scrolled past your Facebook ad, CTR tells you what percentage actually clicked it to look at your book.

If 1,000 people see your ad and 20 click it, your CTR is 2%. If 217 click it (like your One Night Hook Copy), that's a 21.7% CTR — which is extraordinary.

A higher CTR means your image and headline are grabbing the right reader's attention and making them curious. Low CTR usually means the image isn't eye-catching or the hook doesn't connect.`,
    benchmark: 'Below 1%: time to test new creative. 1–3%: normal for book ads. 3–8%: strong. Above 10%: rare winner — scale immediately. Your 21.7% on One Night Hook Copy is 7x better than average.',
    color: '#fb7185',
  },
  {
    emoji: '📧',
    term: 'Open Rate — Are readers opening my emails?',
    teaser: 'The % of your list who actually open your emails',
    body: `Your open rate tells you how many people on your email list actually open your emails after you send them.

If you have 1,574 subscribers and 438 people open your email, that's a 27.8% open rate. It tells you how healthy your relationship is with your readers.

A dropping open rate is almost always caused by one of two things: sending too often (list fatigue) or subject lines that aren't connecting. Your 27.8% is above average — protect it by not over-sending during your April swap calendar.`,
    benchmark: 'Below 18%: your list may need re-engagement. 18–24%: average for romance. 24–30%: strong — readers like hearing from you. Above 30%: exceptional. Your 27.8% is genuinely good.',
    color: '#34d399',
  },
  {
    emoji: '📈',
    term: 'Amazon Sales Rank — What does the number mean?',
    teaser: 'Lower is better — #1 means you\'re the top-selling book on Amazon right now',
    body: `Amazon's sales rank tells you how your book is selling compared to every other book on Amazon at this moment. #1 means you're outselling everything. #47,907 means you're selling better than 47,906 other books.

Rank updates every hour. It can swing thousands of spots in a day based on a single sale or a promo firing. What matters isn't today's exact number — it's the trend over days and weeks.

When you see a rank spike (like jumping 34,437 spots in one day), that's your promo calendar working. Log it and figure out what fired that day — that's your formula to repeat.`,
    benchmark: 'Top 50K in first month = strong launch. MOLR at #47,907 after 12 days is ahead of average for a debut. Top 100K = good momentum. Below 200K = time to run a promo.',
    color: '#38bdf8',
  },
  {
    emoji: '🎯',
    term: 'Lookalike Audience (LAL) — Finding more of your readers',
    teaser: 'Facebook finds millions of people who look just like your existing readers',
    body: `A Lookalike Audience is when you give Facebook a list of your existing readers (like your email list or past buyers), and Facebook goes and finds millions of other people with similar interests, behaviors, and demographics.

Think of it like saying "find me more people like her" — Facebook then searches its 2+ billion users for the best matches.

This almost always outperforms broad interest targeting (like "people who like romance novels") because your actual readers are the proof of who loves your work.`,
    benchmark: 'LAL audiences built from your email list are your best bet. Start with a 1% LAL (Facebook finds the closest matches). These audiences typically get better CPC and CTR than cold interest targeting — fund them generously.',
    color: '#a78bfa',
  },
  {
    emoji: '📌',
    term: 'Pinterest Saves — The most important Pinterest metric',
    teaser: 'A save means someone pinned your book to come back to it later',
    body: `On Pinterest, a Save (also called a "Pin") means someone actively added your content to their own board. Unlike a like or a comment, a save means the reader wants to remember your book for later — they're putting it on their "want to read" or "romance books" board.

Save rate (saves ÷ impressions) is your quality signal. A low save rate means your image is being seen but not resonating. A high save rate means Pinterest readers are genuinely interested.

The compounding power: every save puts your pin in front of that person's followers too, expanding your reach for free.`,
    benchmark: 'Month 1–2: focus on posting, not save rates. Month 3+: aim for 2%+ save rate. Even 5–10 saves per week on a new account is a good sign. Saves compound over time — old pins keep getting discovered.',
    color: '#f472b6',
  },
]

export default function LearnPage() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="card p-6 mb-6" style={{ background: '#FFF8F0', borderLeft: '4px solid #E9A020' }}>
        <h1 className="font-sans text-[22px] mb-2" style={{ color: '#1E2D3D' }}>Every term explained like a friend</h1>
        <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>
          No jargon. No textbooks. Just plain explanations of what these words actually mean
          and whether your numbers are good. Tap any term to read more.
        </p>
      </div>

      {/* Terms */}
      <div className="space-y-2.5">
        {TERMS.map((term, i) => (
          <div
            key={i}
            className="card overflow-hidden"
          >
            <button
              className="w-full flex items-center gap-3.5 p-5 text-left cursor-pointer hover:bg-cream transition-colors"
              style={{ background: 'none', border: 'none' }}
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="text-[22px] flex-shrink-0">{term.emoji}</span>
              <div className="flex-1">
                <div className="text-[14.5px] font-bold text-[#0d1f35]">{term.term}</div>
                <div className="text-[12px] text-stone-500 mt-0.5">{term.teaser}</div>
              </div>
              <span
                className="text-stone-300 text-[16px] transition-transform duration-200 flex-shrink-0"
                style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>

            {open === i && (
              <div className="px-5 pb-5 border-t border-stone-100">
                <div className="text-[13.5px] text-stone-600 leading-[1.8] mt-4 whitespace-pre-line">
                  {term.body}
                </div>
                <div
                  className="mt-4 p-3.5 rounded-xl text-[12.5px] leading-[1.65] font-medium"
                  style={{ background: `${term.color}15`, color: term.color.replace(')', ', 0.9)').replace('rgb', 'rgba') }}
                >
                  <strong>What's good for romance authors:</strong> {term.benchmark}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mt-8 text-[12px] text-stone-500">
        Have a term you want explained? Drop it in the feedback form.
      </div>
    </div>
  )
}
