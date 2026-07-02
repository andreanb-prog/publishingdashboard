# Meta App Review — AuthorDash `ads_read` Submission Package

**App:** AuthorDash · **App ID:** 811672708661089 · **Mode:** Live
**Permission requested:** `ads_read` (Advanced Access)
**Prepared:** July 1, 2026

> As of May 2026 Meta **no longer requires a screen recording**. The submission is now: business verification + a clear written use case + your live policy URLs. That removes the part that sank past attempts.

---

## 1. What you're asking Meta for

Just **`ads_read`** — read-only access to a user's own ad performance. Do **not** request `ads_management` (write access) unless you actually create/edit campaigns from AuthorDash — asking for write access you don't use is a common rejection reason. Read-only is a far easier approval.

---

## 2. `ads_read` use-case description  — PASTE THIS

*(Meta asks: "Tell us how your app uses this permission." Paste the following, adjusting only if anything is inaccurate.)*

> AuthorDash is a marketing-analytics dashboard for independent authors who advertise their books on Meta. After a user connects their own Facebook account through Facebook Login and selects one of their own ad accounts, AuthorDash uses `ads_read` to retrieve that account's campaign performance metrics — amount spent, impressions, link clicks, CTR, CPC, reach, and results — for date ranges the user selects.
>
> These figures are displayed back to the same user inside their private AuthorDash dashboard, next to their book-sales and email-marketing data, so the author can see the return on their ad spend in one place (for example, comparing ad spend against book royalties to calculate ROAS). The data is used only to inform the individual author's own marketing decisions.
>
> AuthorDash uses `ads_read` strictly as read-only. It never creates, edits, pauses, or deletes campaigns, and it never accesses ad accounts the user has not explicitly selected. Each user only ever sees their own advertising data. We do not sell, share, or transfer this data to any third party.

---

## 3. "How does a person use this?" (step-by-step for the reviewer)

Meta wants to see the exact user path. Paste this:

> 1. The user signs in to AuthorDash (authordash.io) with Google.
> 2. On the Settings → Connections page, the user clicks "Connect Meta Ads."
> 3. They are sent through Facebook Login and grant `ads_read`.
> 4. They pick which of their ad accounts to connect.
> 5. AuthorDash reads that account's performance metrics via the Marketing API and displays them on the user's Meta dashboard page (spend, CTR, CPC, impressions, clicks, results), refreshed on a schedule and on demand.

---

## 4. Data handling answers (privacy section)

- **What data:** ad campaign performance metrics (spend, impressions, clicks, CTR, CPC, reach, results) for the user's own ad accounts.
- **Why:** to display the user's own advertising ROI alongside their other marketing data.
- **Stored?** Yes — cached in AuthorDash's database so the dashboard loads quickly and shows trends over time. Tied to the user's account only.
- **Shared/sold?** No. Never shared or sold. Used only to show the user their own data.
- **Deletion:** users can delete their data anytime; see the data-deletion URL below.

---

## 5. Required URLs (you already have these — confirm they're live)

- Privacy Policy: **https://authordash.io/privacy**
- Terms of Service: **https://authordash.io/terms**
- Data Deletion: **https://authordash.io/data**

Reviewers **will click these.** Before submitting, open all three and confirm they load and that the privacy policy explicitly mentions collecting Meta/Facebook advertising data. (If it doesn't name Meta ad data specifically, add one sentence — that's a frequent rejection reason.)

---

## 6. Business Verification

- Your business portfolio "AuthorDash" exists. Verification requires matching documents: an **EIN letter** or business registration, plus a document (bank statement / utility bill) where the **name and address match exactly**.
- Do this in **Business Settings → Security Center / Business Info → Verification** before or alongside the app review.
- Sole proprietor is fine — the denials usually come from mismatched name/address, not from lacking an LLC. Make every document match letter-for-letter.

---

## 7. Submission path (new use-case model)

1. developers.facebook.com → AuthorDash app → **Use cases**.
2. Open **"Create & manage ads with Marketing API"** → find `ads_read`.
3. It will show its current access level (Standard) and a **Request Advanced Access** action.
4. Fill the use-case description (section 2), the person-flow (section 3), and data answers (section 4).
5. Confirm the three URLs (section 5) and complete Business Verification (section 6).
6. Submit.

---

## 8. Why this attempt is stronger than past ones

- **Live product with paying users** — reviewers can see a real, working app, not a shell.
- **Read-only request** — much lower scrutiny than write access.
- **No screencast needed** — the requirement that likely tripped past attempts is gone.
- **Policy pages already live** — privacy, terms, and data-deletion all exist.

---

## 9. Timeline & bridge

- Review typically takes ~1–2 weeks ("purgatory").
- **Bridge while you wait:** add beta authors as **Testers** on the app (Business Settings → App roles → Test users / Roles). Testers can connect via the existing OAuth flow in dev mode **with no approval** — a real same-day path for a limited beta. (Verify Meta's current tester cap before relying on it for a large list.)
- Meanwhile, CSV upload already works as a fallback for anyone.
