# AuthorDash — Claude Code Context File
> Read this at the start of every session before making changes. Confirm the working directory first.

## Product
AuthorDash is an AI publishing and business-intelligence dashboard for independent romance authors in the KU market. It aggregates KDP sales, Meta ads, MailerLite email stats, newsletter swap data, and BSR into one dashboard with an AI coaching layer. In beta with paying users.
Live: https://authordash.io
Pricing: $37/month regular, $17/month FPA student (code FPA2026)

## Repos
Main app: publishingdashboard
  Path: /Users/andrea/Documents/github/GitHub/publishingdashboard
  GitHub: andreanb-prog/publishingdashboard
  Vercel: publishingdashboard

## Owner
Andrea Bonilla (writes as Elle Wilder). Steamy romance, Stillwater series.
Emails: andreanbonilla@gmail.com / info@ellewilderbooks.com
The pen name Elle Wilder must never appear on public-facing AuthorDash pages. Public attribution is Andrea Bonilla.

## Tech Stack
Next.js 14 (App Router), Tailwind, Prisma + Neon PostgreSQL, NextAuth v5 Google SSO, Anthropic SDK, MailerLite API, Stripe, Vercel. UI font: Plus Jakarta Sans.

## Workflow Rules (enforce every session)
- Read this file first. Confirm working directory before editing.
- Never create a branch or PR. Commit directly to main: git add -A && git commit -m "..." && git push origin main
- Do not create claude/ branches.
- Run npx tsc --noEmit before committing.
- Read files back after writing, before committing (catches stale components left behind).
- One Claude Code session at a time. Wait for a green Vercel build before the next.
- No workarounds. Every fix must be customer-ready. Never substitute a manual workaround for a real fix.

## Book Catalog (FIXED — Stillwater series)
One entry per title. Ebook ASIN is primary; paperback ASIN lives in asinPaperback. Colors are looked up by ASIN, never by array index.
- B1: Fake Dating My Billionaire Protector — ASIN B0GQD4J6VT — coral #F97B6B
- B2: My Off-Limits Roommate — ASIN B0GSC2RTF8 — peach #F4A261
- B3: My Ex's Secret Baby — ASIN B0GX2ZXLHR — plum #8B5CF6 (launched April 2026)
Reserved for future titles: B4 teal #5BBFB5, B5 sky #60A5FA, B6 rose #F472B6

## Design System
Use ONLY these colors:
cream #FFF8F0 (backgrounds), navy #1E2D3D (text/headings), amber #E9A020 (CTAs/accents), sage #6EBF8B (positive), coral #F97B6B (ALERTS ONLY), peach #F4A261, plum #8B5CF6, teal #5BBFB5, sky #60A5FA, rose #F472B6
Rules:
- Light mode only. No dark backgrounds.
- Fonts: Plus Jakarta Sans (UI), Playfair Display (headings/bylines), JetBrains Mono (labels).
- White cards, 0.5px borders, rounded-lg. Cream for insight cards.
- Amber for all CTAs. Coral reserved strictly for alerts.
- SVG stroke icons, not emoji, on professional surfaces.
- Insight cards load COLLAPSED by default on every page load.
- Empty states: muted dashed circle + "No data yet" + amber "Upload to unlock".
- Every metric: (i) tooltip with formula, plain-English explanation, and example.

## Copy / Voice
Direct, grounded, useful. Encouraging, not cheesy. One literary reference per card max.
- "Independent" not "indie". "Publisher" as the insider term.
- No em dashes in Andrea's voice.
- Plain language over analytics jargon. Specific AI insights, not generic.
- Alert labels: "Watch This" (amber), "Nice Work" (sage).
- CTA verbs: Fix, Scale, Send, Upload, Track, Improve. Avoid: Consider, Explore, You may want to.

## KDP Data Model & Priority (LOCKED)
- Source priority in lib/kdpDataPriority.ts: csv=1 > browserbase=2 > manual=3. CSV never conflicts with Browserbase sync regardless of upload order.
- Browserbase MTD row = monthly truth per book/month. CSV rows = daily shape only when Browserbase data exists. Never sum both for the same book/month.
- estRevenue = extensionRoyalties + csvRoyalties + (csvKenp x 0.0045). Set in aggregateKdp, used everywhere. Extension royalties already include KU. Do not double-count.
- Royalties is the primary metric (dashboard hero banner). Est. Revenue is secondary/projected, shown only when it differs.
- KDP uploads are additive, never destructive. The Analysis record is rebuilt from all KdpSale rows after every upload.
- KdpSale has a monthKey field with a unique constraint so extension syncs overwrite monthly snapshots instead of stacking.
- Upload is a gate: unknown ASINs block writes and show an amber warning card linking to Settings > My Books. knownAsins also checks asinPaperback, so paperback ASINs do not trigger false "not in catalog" warnings.
- Uploads accept .csv and .xlsx (KDP and Meta export as Excel).

## Dashboard Structure (main page, in order)
1. Header: greeting, Daily Check-In popover, Connected status, Upload Files button
2. Today's Priorities: 3 accordion cards (coral/amber/sky)
3. What's Working: 4 metric tiles, sage labels
4. Needs Attention Soon: 2 columns
5. Performance by Channel: KDP, Meta, MailerLite, Pinterest
6. Your Growth Roadmap: numbered steps
7. Cross-Channel Action Plan: Scale / Fix / Cut / Test Next
Hero shows Royalties as the primary banner with a date-range badge. Est. Revenue is a small secondary line. Hero stays a skeleton until kdpReady to avoid SSR flicker.

## Channel / Feature Pages
- KDP (/dashboard/kdp): 3 tiles — Royalties, KENP Reads, Units Sold. (Est. Revenue tile removed.)
- Meta: CTR, CPC, spend, impressions, top ad.
- MailerLite: open rate, click rate, list size, unsubscribes, automation health.
- Book Swaps (/dashboard/swaps): live. Stats bar, month calendar with book-colored dots, Up Next queue, Partner Ledger. Real BookClicker data.
- StoryPost (/content): manuscript upload, quote extraction, 30-day calendar generator, platform copy, scheduler CSV export.
- Pinterest, Content Planner, Launch Planner, ROAS Hub, Advanced Metrics: IN DEVELOPMENT (sidebar, muted).
- Sidebar: Task Center hidden. "Learn the Terms" present (non-clickable).

## Key Formulas
Est. KU Revenue = KENP x 0.0045 (Projection)
estRevenue = extensionRoyalties + csvRoyalties + (csvKenp x 0.0045)
Reader Depth = KENP / Units Sold (early indicator)
Cost per 1K KENP = (Ad Spend / KENP) x 1000
Total ROAS = Total Revenue / Ad Spend
Cost per Subscriber = Ad Spend / New Subscribers

## Health Benchmarks
CTR: weak <1%, healthy 1-3%, strong 4%+
Email Open Rate: weak <20%, healthy 20-30%, strong 35%+
Email Click Rate: weak <2%, healthy 2-4%, strong 5%+
Reader Depth: weak <20, healthy 20-60, strong 60+
Cost per Subscriber: weak >$5, healthy $2-5, strong <$2
Cost per 1K KENP: weak >$120, healthy $60-120, strong <$60

## MailerLite (v3 ONLY)
- Header: Authorization: Bearer {MAILERLITE_API_KEY}
- Active: GET /api/subscribers?filter[status]=active&limit=1 then read meta.total
- Unsubscribed: GET /api/subscribers?filter[status]=unsubscribed&limit=1 then read meta.total
- Automation health: GET /api/automations (not groups)
- NEVER use v2 endpoints or the X-MailerLite-ApiKey header. They fail silently.
- Use the shared lib/mailerlite.ts service.

## Meta API (CONFIRM before next Meta work)
- Redirect URI: https://authordash.io/api/meta/callback
- Scopes: ads_read, ads_management, business_management
- Development mode (only Andrea's account can connect). App review needed before beta users connect.
- App ID and Ad Account ID: CONFIRM current values during the Meta fix. Older notes conflict: act_940232825191906 vs act_898774062895926. Do not hardcode until confirmed.
- OAuth and connection popup work. OPEN BUG: Meta data disappears on navigation.

## Environment Variables (Vercel)
ANTHROPIC_API_KEY, MAILERLITE_API_KEY, NOTION_API_KEY, NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL (Neon), STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_REGULAR_PRICE_ID, STRIPE_FPA_PRICE_ID, META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, META_AD_ACCOUNT_ID, BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, CRON_SECRET
Gotchas:
- NEXTAUTH_SECRET gets wiped when manually editing Vercel env vars. Re-verify after any env change.
- vercel.json redirect destinations have a 4,096-char limit. Long Claude deep links must use a Next.js API route with NextResponse.redirect().

## Notion Workspace IDs
Product Roadmap: 3351503444438165a19de76f51bec5de (parent type page_id for child spec pages)
Bug Tracker DB: 550bb8c7-d62d-46c6-9183-bf9ff7e18adb (use data_source_id as parent when creating bug rows)
Bug Tracker page: 101ba3e5-2602-42c6-97c1-438338a7f8d5
Feedback DB: 694bfdad-3ac3-4b61-997f-41be25d9dd33
Swap Campaigns DB: 31d15034-4443-8044-ad48-000b8c60189a
Notes: notion-update-page update_content can time out on large payloads. Create a child spec page instead. Copy IDs exactly. Malformed IDs fail silently.

## Open Bugs
- Meta data disappears on navigation (only confirmed open item as of June 2, 2026).

## Browserbase / Cron Notes
- Browserbase Contexts persist KDP sessions server-side (no re-login on each sync).
- KDP sync runs nightly at 2am Hawaii time via /api/cron/sync (protected by CRON_SECRET header).
- BSR fetch runs hourly via /api/cron/bsr (same CRON_SECRET protection).
- Admin sync health dashboard at /admin/sync-health (admin emails only).

## Stripe
- Regular $37/month: STRIPE_REGULAR_PRICE_ID
- FPA $17/month: STRIPE_FPA_PRICE_ID, code FPA2026 (54% off)
- Webhook: https://authordash.io/api/stripe/webhook
- 14-day free trial on first Google SSO login.

## Legal Pages
https://authordash.io/privacy, /terms, /data (user data deletion, required by Meta).

## Component Conventions
- MetricCard: label, value, helperText, isProjection, isEarlyIndicator, benchmarkConfig, tooltipContent.
- InsightCard: collapsed by default. Amber left border for "Watch This", sage for "Nice Work".
- BookPerformance: fixed book color system (ASIN lookup), title multi-select.
- TodaysPriorities: accordion rows, coral/amber/sky.
- HeroPanel: skeleton until kdpReady.
- Always use optional chaining (data?.kdp) and null checks with loading skeletons. Never crash on missing data.
