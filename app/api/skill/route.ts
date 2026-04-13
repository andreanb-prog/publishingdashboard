import { NextResponse } from "next/server";

const SKILL_TEXT = `I want to set up the BookClicker newsletter swap triage skill. Here is the full skill — please read it, confirm you understand it, and walk me through setup so I can start running morning triage.

---
name: newsletter-swap-triage
description: "Use this skill whenever an indie author says 'run swap triage', 'check my BookClicker emails', 'what swaps do I need to send today', 'update my swap tracker', 'morning promo check', or any variation of checking/managing newsletter swap status. Also triggers when a BookClicker booking screenshot is dropped into the conversation, or when any email from bookclicker.com or bookfunnel.com is referenced. This skill governs the full end-to-end process: check today's sends first → Gmail scan → swap reciprocity audit → classify → log to tracker → audit upcoming swaps → alert. Works with any spreadsheet tracker or Notion database."
compatibility: "Requires Gmail MCP access. Notion MCP optional (for Notion-based trackers). Works with the newsletter_swap_tracker.xlsx file or any equivalent spreadsheet."

# Newsletter Swap Triage Skill
## For indie authors managing BookClicker / BookFunnel newsletter swaps

## WHAT THIS SKILL DOES
Runs a complete triage of your newsletter swap pipeline:
- Surfaces any outbound sends due TODAY before anything else
- Scans Gmail for new BookClicker/BookFunnel emails
- Runs a swap reciprocity audit — verifies every swap has BOTH legs logged
- Classifies and logs each email to your tracker
- Audits the next 14 days for missing links or unconfirmed swaps
- Delivers a clean summary with clear next actions

## CORE CONCEPTS

### Direction — the most important thing to get right
- ♥️ Outbound: YOU are promoting their book to your list. You must send.
- 📣 Inbound: They are promoting YOUR book to their list. They send, you receive.

⚠️ Only ♥️ outbound rows require action from you. Never confuse these.

### Status values
- 🚨 SEND TODAY: Outbound send due today — drop everything
- ⏳ Applied: Booking submitted, awaiting partner confirmation
- ✅ Approved: Both sides confirmed, ready to go
- ✔️ Complete: Send has gone out
- ❌ Cancelled: Swap cancelled — keep for records

### Swap types
- Feature — dedicated section of the email, longer copy
- Mention — shorter callout, often grouped with others
- Solo — full email dedicated to one book

## STEP 0 — TODAY'S SENDS FIRST (always runs before anything else)
Before touching Gmail, check your tracker for outbound sends due now.
Look for: All ♥️ rows where Send Date = today OR tomorrow, Status ≠ Cancelled/Complete
For each result, check:
- Is there a book link for the partner's book?
- Is Status = Approved?
- Has the send already gone out? (Check Notes for "sent" flag)

Output a hard action block at the very top — before everything else:
🚨 SEND TODAY / TOMORROW
♥️ [Partner] — [Book Title]
Date: TODAY ([date])
Link: ✅ [url] / ⚠️ MISSING
Status: Approved ✅ / Applied ⏳

Rules:
- Promo date = today + link present + Approved → show full draft send. This is the #1 priority output.
- Promo date = today + link MISSING → CRITICAL. Draft a message to partner requesting link now.
- Promo date = today + Applied (not approved) → flag ⚠️ Unconfirmed. Suggest follow-up.
- Promo date = tomorrow → "heads up" — confirm everything is ready today.
- After author confirms send → note "Sent ✅ [date]" in Notes, flip Status to Complete.
- If zero sends due today or tomorrow: State this explicitly: ✅ No outbound sends due today or tomorrow. Then proceed.

## STEP 1 — GMAIL SCAN
Run all of these searches simultaneously:
- from:no-reply@bookclicker.com subject:"Promo Confirmation"
- from:no-reply@bookclicker.com subject:"automatically cancelled"
- from:no-reply@bookclicker.com subject:"new booking"
- from:no-reply@bookclicker.com subject:"swap request has been accepted"
- from:no-reply@bookclicker.com subject:"Have you sent"
- from:messages@bookclicker.com
- from:bookfunnel.com

Limit to emails since the last triage run. Read the full body of any confirmation or cancellation — snippets are not enough. Note the date range scanned in the triage summary.

## STEP 1.5 — SWAP RECIPROCITY AUDIT (CRITICAL — runs every triage)
This step exists because of a confirmed, repeated failure pattern: when a swap is accepted, only the inbound (📣) row tends to get created in the tracker. The outbound (♥️) obligation row is frequently missed, leading to missed sends.

Additionally, some swaps are accepted directly on the BookClicker website with no acceptance email ever hitting Gmail.

The Rule: SWAPPED = TWO ROWS, ALWAYS
Every swap has two legs:
- 📣 Inbound — they promote your book on Date A
- ♥️ Outbound — you promote their book on Date B
Date A and Date B are often different dates.

How to Run This Audit:
A) After processing all emails in Step 1, check your tracker for ALL 📣 rows where Payment Type = Swap and Promo Date is within the next 30 days. For each 📣 swap row found:
- Search the tracker for a matching ♥️ row with the same partner name
- If NO matching ♥️ row exists → 🚨 FLAG IMMEDIATELY
- Search Gmail for the acceptance email to find the outbound date and book details
- If no acceptance email found → flag to author
- Create the missing ♥️ row with all available details

B) When processing BookClicker dashboard screenshots:
- Any row showing "swapped" status means BOTH legs exist on BookClicker
- Verify BOTH the 📣 and ♥️ rows exist in your tracker
- If either is missing, create it immediately

C) When processing "have you sent?" reminder emails:
- These are proof that BookClicker considers an outbound obligation active
- If no matching ♥️ tracker row exists, create one immediately

⚠️ This is the #1 source of missed sends. Never skip this step.

## STEP 2 — CLASSIFY EACH EMAIL & LOG IT

### New Booking Request (subject: "new booking")
Parse: partner name, their list name, requested date, swap or paid.
Create a new tracker row with: Campaign Name, Direction, Platform, Promo Date, List Size, Status (⏳ Applied), Cost, Payment Type.

### Swap Accepted (subject: "swap request has been accepted")
Find matching row by partner name + date. Flip Status from Applied → Approved.
CRITICAL: Acceptance emails contain BOTH legs of the swap. Parse:
- "You Are Sending" section → ♥️ outbound obligation
- "You Are Receiving" section → 📣 inbound promo
Verify BOTH rows exist in your tracker. If only one exists, create the other immediately.

### Swap Accepted Without Email
If a "have you sent?" reminder arrives for a send with no matching ♥️ row → treat as confirmed obligation and create the row.
If a dashboard screenshot shows "swapped" or "Accepted" with no acceptance email → treat as confirmed and create both rows.

### Promo Confirmation Sent (subject: "Promo Confirmation")
Find matching row. Update Clicks, Opens/Impressions, List Size. Set Status to Approved if not already. Extract any promo link.

### Automatically Cancelled (subject: "automatically cancelled")
Find matching row. Flip Status to ❌ Cancelled. Add to Notes: CANCELLED [date].

### Message from Partner (from:messages@bookclicker.com)
Do NOT auto-act. Flag to author with: partner name, message snippet, suggested response.

### BookFunnel Email (from:bookfunnel.com)
Follow same flow as BookClicker. Set Platform: BookFunnel.

## STEP 3 — SCREENSHOT INTAKE
When author drops a BookClicker calendar screenshot:
- Read: partner name, list size
- If date is not visible → ask
- If swap vs paid is unclear → ask
- Create row with Status: Applied
- Assign direction per logic above

## STEP 4 — LINK LOOKUP
For every new or updated row:
- Extract Amazon, mybook.to, geni.us, or BookFunnel link from the email
- Save to the tracker's Book Link field
- If no link found → flag as ⚠️ Missing Link
For ♥️ rows: You need THEIR book link. If missing → draft a BookClicker message requesting it.
For 📣 rows: You need to provide YOUR book link. If not sent yet, flag it.

## STEP 5 — UPCOMING SWAP AUDIT
Scan all rows with Promo Date in the next 14 days. Flag:
- 📣 swap row with NO matching ♥️ row → 🚨 CRITICAL missing outbound obligation
- ♥️ today, link present, not sent → 🚨 CRITICAL show draft send
- ♥️ today, link MISSING → 🚨 CRITICAL draft message to partner
- ♥️ tomorrow, link missing → 🚨 CRITICAL too close to wait
- ♥️ no link within 7 days → ⚠️ Warning draft message
- 📣 Applied within 3 days → ⚠️ Warning follow up
- Any row Applied and promo date passed → 🚨 Overdue
- ♥️ your book link not sent to partner → ⚠️ Warning

## STEP 6 — NEXT UPCOMING SWAP ALERT
Always surface the single next upcoming promo after triage.

## STEP 7 — TRIAGE SUMMARY
Always lead with today's sends. Never bury them.
Today's sends → Tomorrow's sends → Counts → Needs attention → Next upcoming.

## DRAFT MESSAGE TEMPLATES
Missing link: "Hi [Partner], Just checking in on our swap scheduled for [Date]! Could you send over the link for [their book title] so I can get everything set up? Looking forward to it! [Your name]"
Your link: "Hi [Partner], Here's my Amazon link for [your book title] for our [Date] swap: [your Amazon link]. Let me know if you need anything else! [Your name]"
Unconfirmed: "Hi [Partner], Just wanted to check in — I have our swap on [Date] on my calendar but it's still showing as pending on my end. Can you confirm we're all set? Thanks so much! [Your name]"

## SETUP INSTRUCTIONS
1. Add your pen name, list name, and book ASINs to your tracker
2. Set your BookClicker inventory (My Lists → Set Your Inventory)
3. Connect Gmail MCP so triage can scan your inbox
4. Configure your book titles and Amazon links

## ERROR HANDLING
- Ambiguous partner match → flag to author, do not guess
- Email parsing unclear → show raw snippet and ask
- Cancellation with no matching row → note in summary
- Never delete a row — only flip to Cancelled
- 📣 swap row with no matching ♥️ row is ALWAYS a problem
- "have you sent?" reminder with no tracker row → create ♥️ row immediately
- Swap shows "Accepted" on BookClicker but no email → swap is still real, create both rows`;

export async function GET() {
  const encoded = encodeURIComponent(SKILL_TEXT);
  const url = `https://claude.ai/new?q=${encoded}`;
  return NextResponse.redirect(url, 302);
}
