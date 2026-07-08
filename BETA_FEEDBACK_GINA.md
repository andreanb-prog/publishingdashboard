# Beta Feedback — Gina (FPA) — July 7, 2026

First real beta user putting AuthorDash through daily use. Gold-tier feedback. Triaged below.

## ✅ Working & loved (don't touch — this is the product landing)
- **BookClicker send queue** — "They are right!!!", "I love this", "it just alerted me someone was waiting to book with me!" The rebuilt Book Swaps page is a hit.
- **KDP royalty numbers** — "This data looks accurate", "Bam!" Core KDP figures are correct.
- **Dashboard concept + daily-money-first framing** — "You are brilliant… can't believe I didn't try this earlier."
- **MailerLite open rate & click rate** — accurate.

## 🐞 Confirmed bugs (priority order)

### P0 — KDP Browserbase connect flow (THE beta blocker)
Gina's journey, verbatim:
- Landed on wrong Amazon account first; then right account but **"bookshelf is empty"** (no titles).
- Clicked "Reports" inside the KDP popup → **it snapped back to AuthorDash and declared "connected, data in 2 min"** — but connected an empty/zero-titles state.
- Disconnect/reconnect just repeats.
- Got **"We couldn't open the secure browser"** error on a later attempt.
- "Stuck on the login pop-up page."
**Root problems:** (1) readiness detection fires "connected" too early / on the wrong page (navigating within the popup triggers false success); (2) no handholding — user doesn't know what to do or where to land; (3) no graceful handling of empty-bookshelf / wrong-account; (4) the secure-browser open sometimes fails with no recovery.
**Fix direction:** verify we've reached a real kdpreports page WITH titles before declaring connected; step-by-step in-window guidance; clear empty/error states with a retry; don't auto-close on internal navigation.

### P1 — MailerLite list-size number is wrong
"Performance is accurate but notes underneath say I have a list of 22,439 — the 22k is not [right]." (Other screenshots showed 15,515 / 13,515 — inconsistent.) Open/click rates ARE right; only the **total subscriber/list-size count** is wrong. Likely counting the wrong status or summing across groups.

### P1 — History "tracking over time" table out of order  ✅ FIXED (this session)
Months were unsorted (Jan 2026 "LATEST", then Dec/Nov/Oct 2025, then May/Mar 2026). Now sorted newest-first.

### P2 — "Data may be outdated / Amazon blocked the auto fetch" messaging
Scary/confusing banners for users on uploaded (not synced) data. Reword to be reassuring and action-clear.

### P2 — Blank data section, no way to refresh
A section (Data Vault / small-wins?) renders blank with no refresh path. Needs an empty state + refresh.

## 💡 Feature requests (from a real publisher's daily routine)
Gina's actual morning workflow, in order: **KDP dollars first** → FB ads per-campaign (CPC/CTR/spend) yesterday → MailerLite (list size, open/click) → BookClicker (confirm send, calendar, rates).

1. **Prominent "Books" nav tab** (left sidebar) — she couldn't find the catalog. Wants publish date, daily sales, page reads per book on it.
2. **Daily per-book royalties** — hover the royalty graph to see how much EACH book made that day. Her #1 morning thing.
3. **Easier catalog import + AUTO-import ALL titles** — "Do I manually import books?" Catalog is clunky and unclear. It did NOT auto-import or find all titles — only the last ~90 days. Users need: (a) a clear, simple way to add/manage books in Settings, and (b) auto-pull of the author's FULL catalog (all titles, not just recent). Andrea: load a scraper to auto-pull titles.
6. **Lifetime KDP history** — users want to see their LIFETIME KDP data (all-time royalties/units/KENP), not just recent months. Current sync captures recent only. Valuable historical view.
4. **Overall ROAS across ALL ad spend** — not just FB. Include BookClicker promos, written-word media promos, etc. (user keys in the non-FB spend).
5. **Timeline / project tracking** — pre-order start, launch date, promos running alongside FB spend.

## Andrea's takeaways
- "MORE handholding with the browserbase login" → P0 above.
- Book catalog clunky, needs easier title import → feature #3.
- Sync button was confusing → ✅ removed this session.
