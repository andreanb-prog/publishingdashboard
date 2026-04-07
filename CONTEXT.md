# AuthorDash â Claude Code Context File
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
- **Font:** Plus Jakarta Sans (import from Google Fonts â use everywhere)

---

## Brand & Design System

### Colors (use ONLY these â no others)
```
cream:      #FFF8F0  (backgrounds)
navy:       #1E2D3D  (primary text, headings)
amber:      #E9A020  (CTAs, accents, highlights)
sage:       #6EBF8B  (positive, growing, success)
coral:      #F97B6B  (negative, urgent, fix this)
peach:      #F4A261  (B2 book color)
plum:       #8B5CF6  (B3 book color, warm plum)
teal:       #5BBFB5  (B4 book color)
sky:        #60A5FA  (B5 book color, info)
rose:       #F472B6  (B6 book color)
```

### Book Color System (FIXED â never changes)
- B1 = coral #F97B6B
- B2 = peach #F4A261
- B3 = plum #8B5CF6
- B4 = teal #5BBFB5
- B5 = sky #60A5FA
- B6 = rose #F472B6

### Design Rules
- **Light mode only** â NO dark backgrounds anywhere
- **Font:** Plus Jakarta Sans throughout
- **Cards:** white bg, 0.5px border, border-radius-lg, cream #FFF8F0 for insight cards
- **Metric numbers:** 28px, font-weight 600, navy
- **Insight cards:** load COLLAPSED by default, expand on click
- **Empty states:** muted dashed circle icon + "No data yet" + "Upload to unlock â" amber link
- **CTA buttons:** "Read the Full Story â" (channel pages), "Dive into the Data â" (actions)
- **Projection badges:** â  amber pill for estimated metrics, ~ prefix for proxy metrics
- **Every metric:** has (i) tooltip with formula, plain-English explanation, example

---

## Product Voice & Tone
- Direct, grounded, useful â not robotic or fluffy
- Encouraging but not cheesy
- **Literary framing** woven naturally into insight copy (one reference per card max):
  - "This is your story's rising action â keep going."
  - "Think of this as your inciting incident."
  - "Plot twist â your readers are showing up in a big way."
  - "This is your dark moment before the breakthrough."
- **Alert labels:** "Watch This" (amber) and "Nice Work" (sage) â keep these labels
- **CTA language:** Fix, Scale, Send, Upload, Track, Improve
- **Avoid:** Consider, Explore, You may want to, fluffy marketing speak

---

## Dashboard Structure (main page sections in order)
1. Header â greeting, Daily Check-In popover, Connected status, Upload Files button
2. Today's Priorities â 3 accordion cards, color coded (coral/amber/sky), expand for detail
3. What's Working â 4 horizontal metric tiles, no borders, sage green labels
4. Needs Attention Soon â 2 column layout, sage dots left, coral dots right
5. Performance by Channel â 4 cards (KDP, Meta, MailerLite, Pinterest) â NO Swaps card
6. Your Growth Roadmap â numbered steps, navy filled = done, amber outline = upcoming
7. Cross-Channel Action Plan â 4 columns: Scale/Fix/Cut/Test Next

---

## Channel Pages
- **KDP:** Sales & Royalties â Units Sold, KENP Reads, Est. KU Revenue, Total Est. Revenue, Reader Depth
- **Meta/Facebook:** Ad performance â CTR, CPC, spend, impressions, top ad
- **MailerLite:** Email marketing â open rate, click rate, list size, unsubscribes, automation health
- **Newsletter Swaps:** (in sidebar only, not in channel cards â coming later)
- **Pinterest:** (placeholder for now)
- **Advanced Metrics:** Cross-channel â ROAS, Cost per Subscriber, Funnel view

---

## Key Formulas
```
Est. KU Revenue = KENP Ã $0.0045  â  Projection
Total Est. Revenue = Royalties + KU Revenue  â  Projection
Reader Depth = KENP Ã· Units Sold  ~ Early indicator
Cost per 1K KENP = (Ad Spend Ã· KENP) Ã 1000
Total ROAS = Total Revenue Ã· Ad Spend
Cost per Subscriber = Ad Spend Ã· New Subscribers
```

## Health Benchmarks
| Metric | Weak | Healthy | Strong |
|---|---|---|---|
| CTR | <1% | 1â3% | 4%+ |
| Email Open Rate | <20% | 20â30% | 35%+ |
| Email Click Rate | <2% | 2â4% | 5%+ |
| Reader Depth | <20 | 20â60 | 60+ |
| Cost per Subscriber | >$5 | $2â5 | <$2 |
| Cost per 1K KENP | >$120 | $60â120 | <$60 |

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
- **#49** â KDP page upgrade (full spec in Notion)
- **#18** â Stripe integration

---

## Known Bugs / Watch Out For
- KDP export format: KDP Dashboard XLSX is the correct export (multi-sheet: Combined Sales, KENP Read, Paperback Royalty). The old All Titles CSV is no longer the primary format. Parser handles both — detects Dashboard XLSX by presence of "Combined Sales" sheet, legacy by "Orders Processed"/"KENP Read", flat CSV as fallback.
- Postmark per-user inbound format: `{POSTMARK_INBOUND_TOKEN}+swaps-{userId}@inbound.postmarkapp.com` — the `+` is the mailbox hash separator. The token goes BEFORE the `+`, NOT as a second `@`. `MailboxHash` in the webhook payload contains `swaps-{userId}` and is how the webhook identifies which user the email belongs to. `POSTMARK_INBOUND_TOKEN` env var must be set in Vercel (just the token, not the full address).
- File upload `<input type="file">` must NEVER be conditionally mounted â always in DOM, hidden with CSS
- MailerLite API v3 ONLY: use `connect.mailerlite.com/api` with `Authorization: Bearer {key}` header. Active count: `/subscribers?filter[status]=active&limit=1` → `meta.total`. Unsubscribed: `/subscribers?filter[status]=unsubscribed&limit=1` → `meta.total`. NEVER use `api.mailerlite.com/api/v2`, `/api/v2/stats`, or `X-MailerLite-ApiKey` header.
- Meta Ads sync: TWO possible Elle Wilder Books accounts — `act_898774062895926` (Facebook-visible) and `act_940232825191906` (created via Instagram `ellewilderbooks`, may not appear in standard discovery). Always try both. Discovery paths: /me/adaccounts, /me/businesses → owned_ad_accounts, /me/instagram_accounts → adaccounts, plus hardcoded fallback. OAuth scope must include `instagram_basic`. Use `date_preset=last_30_days`.
- Automation Health was pulling groups instead of automations â use `GET /api/automations` endpoint
- Feedback button posts to Notion DB `694bfdad3ac34b61997f41be25d9dd33` â verify NOTION_API_KEY is set
- All insight cards must load COLLAPSED by default on every page load
- No dark backgrounds anywhere â if you see dark navy sections replace with cream #FFF8F0

---

## Stripe Setup
- Regular plan: $37/month â use STRIPE_REGULAR_PRICE_ID
- FPA plan: $17/month â use STRIPE_FPA_PRICE_ID
- Discount code: FPA2026 (54% off, applied programmatically for FPA plan)
- Dev code: DEVACCESS2026 (100% off, once, max 3 redemptions) â enter at checkout promo field
- Webhook endpoint: https://authordash.io/api/stripe/webhook
- 14-day free trial on first Google SSO login
- Promo code field is visible on regular-plan checkout (allow_promotion_codes: true)
- FPA plan uses direct coupon (discounts param) â promo field not shown for FPA

### Creating DEVACCESS2026 in Stripe (one-time, after deploy)
Call the setup endpoint once with the Stripe secret key as the auth header:
```
curl -X POST https://authordash.io/api/stripe/setup-promo \
  -H "x-setup-secret: <STRIPE_SECRET_KEY>"
```
This creates the coupon + promotion code idempotently. Safe to call again — returns status
"already_exists" if already set up. Also verifies FPA2026 is still active.

---

## Meta API Setup
- App name: AuthorDash (in Meta Developer Portal)
- Redirect URI: https://authordash.io/api/meta/callback
- Permissions needed: ads_read, ads_management, business_management
- Currently in Development mode (only Andrea's account can connect)
- App review needed before beta users can connect

---

## Legal Pages (live at)
- https://authordash.io/privacy
- https://authordash.io/terms
- https://authordash.io/data (user data deletion â required by Meta)

---

## Component Conventions
- `MetricCard` â reusable, accepts: label, value, helperText, isProjection, isEarlyIndicator, benchmarkConfig, tooltipContent
- `InsightCard` â always collapsed by default, amber left border for Watch This, sage for Nice Work
- `BookPerformance` â uses fixed book color system, title picker with multi-select
- `TodaysPriorities` â accordion rows, coral/amber/sky color coded
- Always use optional chaining: `data?.kdp` never `data.kdp`
- Always add null checks and loading skeleton states â never crash on missing data

---

## Session Tips
- Start a fresh Claude Code session for each major feature
- One feature per session â don't mix unrelated changes
- Always commit and push to GitHub at the end of each task
- Redeploy Vercel after adding new environment variables
- Check Vercel logs if something breaks in production
