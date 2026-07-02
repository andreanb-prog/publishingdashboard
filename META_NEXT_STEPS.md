# Meta — Where We Are & Next Steps
*Updated July 1, 2026 (end of a long session)*

## The one-line status
Your `ads_read` App Review submission is **built and trimmed to the clean read-only set** — it just needs a **screencast** and **business verification**, then Submit.

## What's in the submission (correct — don't add more)
- `ads_read` ✓
- Marketing API Access Tier ✓ (the read tier that powers ads_read)
- `public_profile` ✓ (auto-granted, harmless)
- **Removed:** ads_management, business_management, pages_show_list, pages_read_engagement (the bundle that sank past attempts)

## The 3 steps left to submit
1. **Reconnect Meta (to enable the screencast demo).**
   - Your OAuth token **expired June 27** — that's why data is stale.
   - The **OAuth "Connect Meta Ads" button is now restored** (deployed). Go to Settings → Connections → Connect Meta Ads → log in. Works for your account in dev mode, no approval needed.
2. **Record the screencast** (~60 sec, e.g. QuickTime / Cmd+Shift+5):
   - Show: log into AuthorDash → click Connect Meta → grant access → your ad numbers appear on the Meta dashboard page. End to end.
   - Upload it to the `ads_read` item in App Review.
3. **Business Verification** (App Review → Verification tab):
   - Needs matching docs — EIN letter or business registration + a bank statement/utility bill where **name + address match letter-for-letter** (that mismatch, not being a sole proprietor, is what usually fails).
   - Then **Submit**. Review takes ~1–2 weeks.

## ✅ Use-case bundle — RESOLVED (no action needed)
The "Create & manage ads with Marketing API" use case attaches ads_management, business_management, pages_show_list, pages_read_engagement — they're **locked to the use case** (can't remove; they define it) and Meta has no separate read-only ads use case.
- **This is fine.** You're only requesting **Advanced Access for `ads_read`**. The others stay at **Standard access** (dev-only, unused) and are **not reviewed for production**. Reviewers only scrutinize what you request Advanced access for.
- **No surgery. Submit `ads_read` only.** The attached write permissions at Standard access are normal and can't hurt the review.

## The justification text (already pasted, saved here as backup)
See `META_APP_REVIEW_SUBMISSION.md` — section 2 is the paste-ready `ads_read` description if you need to re-enter it.

## Hard-won lessons (so we don't repeat them)
- **Never sync Meta from a server IP (Browserbase).** It locked your real Facebook account on July 1. That path is disabled in code (`/api/extension/meta-cookies` returns 410) and paused in the DB (`metaSyncStatus = needs_reauth`), so the 2am cron won't touch Meta.
- **All in-browser scraping of Ads Manager is blocked** by Facebook (page token locked, DOM virtualized, fetch not interceptable). Verified live. Not a viable path.
- **The API (this approval) is the only durable, safe, grandparent-friendly path.** That's why we're here.

## Bridge while the review is pending
- **Dev-mode Testers:** add beta authors as Testers on the app (Business Settings → App roles). Testers connect via the same OAuth button with **no approval** — real same-day path for a limited beta. (Verify Meta's current tester cap before leaning on it heavily.)
- **CSV upload** already works for anyone as a manual fallback.

## Parked ideas (logged, not urgent)
- Self-healing agent for a scraper — moot now (scraping is blocked; API is the path).
- "Bring your own token" — works technically but too technical for grandparents; power-user option only.
