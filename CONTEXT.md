# AuthorDash — Claude Code Context File
> Read this at the start of every session before making any changes.

---

## Product Overview
AuthorDash is an AI-powered publishing dashboard for indie romance authors. It turns raw KDP sales data, Meta ad performance, and MailerLite email stats into daily action plans, insights, and benchmarks. Think: "smart chief of staff for working authors."

**Live URL:** https://authordash.io  
**GitHub:** https://github.com/andreanb-prog/publishingdashboard  
**Vercel project:** publishingdashboard  

---

## Owner
- **Author name:** Andrea Bonilla (writes as Elle Wilder)
- **Genre:** Romance (steamy)
- **Books:** My Off-Limits Roommate (B0GSC2RTF8), Fake Dating My Billionaire Protector (B0GQD4J6VT)
- **Email:** andreanbonilla@gmail.com / info@ellewilderbooks.com
- **Beta pricing:** $37/month regular, $17/month FPA students (code: FPA2026)

---

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Neon PostgreSQL + Prisma ORM
- **Auth:** NextAuth v5 with Google SSO
- **AI:** Anthropic SDK (claude-sonnet-4-5)
- **Email:** MailerLite API
- **Payments:** Stripe (subscriptions)
- **Hosting:** Vercel
- **Font:** Plus Jakarta Sans (import from Google Fonts — use everywhere)

---

## Brand & Design System

### Colors (use ONLY these — no others)
```
cream:      #FFF8F0  (backgrounds)
navy:       #1E2D3D  (primary text, headings)
amber:      #E9A020  (CTAs, accents, highlights)
sage:       #6EBF8B  (positive, growing, success)
coral:      #F97B6B  (alerts only — never for book colors or general UI)
peach:      #F4A261  (B2 book color)
plum:       #8B5CF6  (B3 book color, warm plum)
teal:       #5BBFB5  (B4 book color)
sky:        #60A5FA  (B5 book color, info)
rose:       #F472B6  (B6 book color)
```

### Book Color System (FIXED — never changes)
- B1 = coral #F97B6B
- B2 = peach #F4A261
- B3 = plum #8B5CF6
- B4 = teal #5BBFB5
- B5 = sky #60A5FA
- B6 = rose #F472B6

**CRITICAL: Book colors are assigned by index order of THE CURRENT USER'S books — not from a global list or hardcoded ASINs. User 1's first book = coral, second book = peach, etc. Never derive book colors from Andrea's ASIN list.**

### Design Rules
- **Light mode only** — NO dark backgrounds anywhere
- **Font:** Plus Jakarta Sans throughout
- **Cards:** white bg, 0.5px border, border-radius-lg, cream #FFF8F0 for insight cards
- **Metric numbers:** 28px, font-weight 600, navy
- **Insight cards:** load COLLAPSED by default, expand on click
- **Empty states:** muted dashed circle icon + "No data yet" + "Upload to unlock →" amber link
- **CTA buttons:** "Read the Full Story →" (channel pages), "Dive into the Data →" (actions)
- **Projection badges:** ⚠ amber pill for estimated metrics, ~ prefix for proxy metrics
- **Every metric:** has (i) tooltip with formula, plain-English explanation, example

---

## Product Voice & Tone
- Direct, grounded, useful — not robotic or fluffy
- Encouraging but not cheesy
- **Literary framing** woven naturally into insight copy (one reference per card max):
  - "This is your story's rising action — keep going."
  - "Think of this as your inciting incident."
  - "Plot twist — your readers are showing up in a big way."
  - "This is your dark moment before the breakthrough."
- **Alert labels:** "Watch This" (amber) and "Nice Work" (sage) — keep these labels
- **CTA language:** Fix, Scale, Send, Upload, Track, Improve
- **Avoid:** Consider, Explore, You may want to, fluffy marketing speak

---

## Dashboard Structure (main page sections in order)
1. Header — greeting, Daily Check-In popover, Connected status, Upload Files button
2. Today's Priorities — 3 accordion cards, color coded (coral/amber/sky), expand for detail
3. What's Working — 4 horizontal metric tiles, no borders, sage green labels
4. Needs Attention Soon — 2 column layout, sage dots left, coral dots right
5. Performance by Channel — 4 cards (KDP, Meta, MailerLite, Pinterest) — NO Swaps card
6. Your Growth Roadmap — numbered steps, navy filled = done, amber outline = upcoming
7. Cross-Channel Action Plan — 4 columns: Scale/Fix/Cut/Test Next

---

## Channel Pages
- **KDP:** Sales & Royalties — Units Sold, KENP Reads, Est. KU Revenue, Total Est. Revenue, Reader Depth
- **Meta/Facebook:** Ad performance — CTR, CPC, spend, impressions, top ad
- **MailerLite:** Email marketing — open rate, click rate, list size, unsubscribes, automation health
- **Newsletter Swaps:** (in sidebar only, not in channel cards — coming later)
- **Pinterest:** (placeholder for now)
- **Advanced Metrics:** Cross-channel — ROAS, Cost per Subscriber, Funnel view

---

## Key Formulas
```
Est. KU Revenue = KENP × $0.0045  ⚠ Projection
Total Est. Revenue = Royalties + KU Revenue  ⚠ Projection
Reader Depth = KENP ÷ Units Sold  ~ Early indicator
Cost per 1K KENP = (Ad Spend ÷ KENP) × 1000
Total ROAS = Total Revenue ÷ Ad Spend
Cost per Subscriber = Ad Spend ÷ New Subscribers
```

## Health Benchmarks
| Metric | Weak | Healthy | Strong |
|---|---|---|---|
| CTR | <1% | 1–3% | 4%+ |
| Email Open Rate | <20% | 20–30% | 35%+ |
| Email Click Rate | <2% | 2–4% | 5%+ |
| Reader Depth | <20 | 20–60 | 60+ |
| Cost per Subscriber | >$5 | $2–5 | <$2 |
| Cost per 1K KENP | >$120 | $60–120 | <$60 |

---

## Upload System — Core Principle
**A user should be able to upload any KDP file, in any format, in any order, at any time — and the dashboard should always show the correct aggregate picture.**

Rules that must never be violated:
- **Uploads are additive, never destructive.** Re-uploading a file that covers a date range already in the DB is a no-op for those rows (upsert by date+ASIN). It never overwrites newer data.
- **After every upload, rebuild the Analysis record from ALL kdpSale rows** for that user — never from just the file being uploaded. Order of upload never matters.
- **Format detection is the parser's job, not the user's.** Handle all known KDP export formats: Sales Dashboard CSV, Royalties Estimator XLSX (with empty Paperback Royalty sheet), Prior Month Royalties CSV, KENP sheet name variants ("KENP" / "KENP Read"), ASIN column variants ("eBook ASIN" / "ASIN"). If unrecognized, return a clear error — never silently ingest zero rows.
- **File inputs must always have the `multiple` attribute** — always in DOM, hidden with CSS, never conditionally mounted.
- **After every upload, clear AI-generated fields** (storySentence, actionPlan, channelScores, fingerprint, coach copy) from the Analysis record so the dashboard never shows coaching copy that contradicts fresh metrics.

---

## KDP Page — Data Architecture
The KDP deep dive page has TWO data sources. Both must be populated for the page to work correctly:
- **`kdp` (from Analysis record)** — aggregated totals used by metric tiles (Units Sold, KENP Reads, Est. KU Revenue, Total Est. Revenue)
- **`kdpSalesData` (from kdpSale rows)** — raw row-level data used by charts (Sales by Title, Reader Engagement by Title, date-range filters)

**The `!kdp` gate must also accept when `kdpSalesData` has data** — never show "No data yet" on metric tiles if kdpSale rows exist for the user. If kdp is null but kdpSalesData has rows, compute totals from kdpSalesData.

---

## MailerLite — Known Behaviors
- **Unsubscribe count includes list cleans** — MailerLite does not distinguish user-initiated unsubscribes from admin list purges. Use rate-based threshold (>0.5% of list size) not raw count. Implement spike detection: if 80%+ of unsubscribes occurred in a 48-hour window, classify as list clean and show neutral info note instead of alert.
- **Campaigns list endpoint does not return sends_count** — do not show a Sent column in the Recent Campaigns table. Show: Subject, Open Rate, Click Rate, Unsubs, Date.
- **List size:** use stats endpoint (`GET /api/subscribers/stats`) not subscriber list pagination. Header: `Authorization: Bearer {key}`. Never use v2 endpoints or X-MailerLite-ApiKey header.
- **Automation Health:** use `GET /api/automations` endpoint, not groups.

---

## Hydration Rules (React / Next.js)
**Never read from localStorage or call Date/Math functions in useState initializers or during render.** These cause React hydration mismatch errors (#418/#423/#425) because the server renders with different values than the client.

Rules:
- All localStorage reads go in `useEffect` only
- `new Date()`, `Date.now()`, `new Date().getHours()`, `toLocaleDateString()` — never in render or useState initializer, always in useEffect
- `Math.random()` — never in render, always in useEffect or useMemo with empty deps
- **localStorage as single source of truth for date range:** Apply writes to localStorage synchronously before dispatching the event. Fetch effects read localStorage directly — no stale closure risk.

---

## Admin Features
- **Admin impersonation:** Settings → Admin tab. Allows viewing any user's dashboard as them. Includes audit log and 30-minute auto-expiry. Amber banner shows "Admin View: viewing as [email]" with Exit button.
- **Backfill script:** `scripts/backfill-kdp-analysis.ts` — rebuilds Analysis KDP slice from kdpSale rows for all users. Idempotent, safe to re-run. Use when users have kdpSale rows but missing/stale Analysis records.

---

## Environment Variables (all set in Vercel)
```
ANTHROPIC_API_KEY
MAILERLITE_API_KEY
NOTION_API_KEY
NEXTAUTH_URL
NEXTAUTH_SECRET
DATABASE_URL (Neon)
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_REGULAR_PRICE_ID
STRIPE_FPA_PRICE_ID
META_APP_ID
META_APP_SECRET
META_REDIRECT_URI
META_AD_ACCOUNT_ID=act_940232825191906
```

---

## Notion Workspace IDs
```
Product Roadmap:  3351503444438165a19de76f51bec5de
Bug Tracker:      101ba3e5260242c697c1438338a7f8d5
Feedback DB:      694bfdad3ac34b61997f41be25d9dd33
GitHub Issues:    3351503444438125aabae7ec7deba251
```

---

## Open GitHub Issues
- **#49** — KDP page upgrade (full spec in Notion)
- **#18** — Stripe integration

---

## Known Bugs / Watch Out For
- File upload `<input type="file">` must NEVER be conditionally mounted — always in DOM, hidden with CSS, always has `multiple` attribute
- MailerLite list size: use stats endpoint (`GET /api/subscribers/stats`), `Authorization: Bearer` header — never v2 or X-MailerLite-ApiKey
- KDP page has two data sources (Analysis record + kdpSale rows) — metric tiles and charts must both be populated; the `!kdp` gate must not block display when kdpSale rows exist
- All insight cards must load COLLAPSED by default on every page load
- No dark backgrounds anywhere — if you see dark navy sections replace with cream #FFF8F0
- Book colors are always per-user index order — never derive from Andrea's ASINs or a global book list
- Never seed Andrea's books (B0GSC2RTF8, B0GQD4J6VT) into new user accounts
- Never fall back to Andrea's MailerLite env key for other users' stats

---

## Stripe Setup
- Regular plan: $37/month — use STRIPE_REGULAR_PRICE_ID
- FPA plan: $17/month — use STRIPE_FPA_PRICE_ID
- Discount code: FPA2026 (54% off)
- Webhook endpoint: https://authordash.io/api/stripe/webhook
- 14-day free trial on first Google SSO login

---

## Meta API Setup
- App name: AuthorDash (in Meta Developer Portal)
- Ad account: act_940232825191906 (Elle Wilder Books — created via Instagram, not discoverable via /me/adaccounts, must be referenced directly)
- Redirect URI: https://authordash.io/api/meta/callback
- Permissions needed: ads_read, ads_management, business_management
- Currently in Development mode (only Andrea's account can connect)
- App review needed before beta users can connect

---

## Legal Pages (live at)
- https://authordash.io/privacy
- https://authordash.io/terms
- https://authordash.io/data (user data deletion — required by Meta)

---

## Component Conventions
- `MetricCard` — reusable, accepts: label, value, helperText, isProjection, isEarlyIndicator, benchmarkConfig, tooltipContent
- `InsightCard` — always collapsed by default, amber left border for Watch This, sage for Nice Work
- `BookPerformance` — uses fixed book color system, title picker with multi-select
- `TodaysPriorities` — accordion rows, coral/amber/sky color coded
- Always use optional chaining: `data?.kdp` never `data.kdp`
- Always add null checks and loading skeleton states — never crash on missing data

---

## Session Tips
- Start a fresh Claude Code session for each major feature
- One feature per session — don't mix unrelated changes
- Always commit and push to GitHub at the end of each task
- Redeploy Vercel after adding new environment variables
- Check Vercel logs if something breaks in production
