# Fetch by AuthorDash

A deliberately tiny Chrome extension. It does **one** thing: when you click
Connect, it reads your Facebook login-session cookies (`c_user`, `xs`) and hands
them to AuthorDash so your Meta Ads can sync. No password. No page scraping. No
background jobs. This is why it doesn't break the way the old Fetch did — there
is almost nothing to break.

## What it is NOT
The old Fetch scraped KDP/BSR/BookClicker/Meta out of live pages inside your
browser — fifteen endpoints of DOM parsing that shattered on every site change.
None of that is here. All extraction now happens server-side in Browserbase.
This extension is just a **key courier** for the one hostile door (Meta).

## Files
- `manifest.json` — MV3, permissions: `cookies` + host access to facebook.com and authordash.io
- `popup.html` / `popup.js` — the whole UI + logic (~120 lines)
- `icons/` — drop the doggy PNGs here (see icons/README.txt)

## Test it tonight (unpacked)
1. Add the doggy PNGs to `icons/` (optional — works without them).
2. Chrome → `chrome://extensions` → toggle **Developer mode** (top right).
3. Click **Load unpacked** → select this `fetch-extension` folder.
4. Make sure you're logged into **AuthorDash** and **Facebook** in this browser.
5. Click the Fetch icon → **Connect Meta Ads**.
6. Watch AuthorDash → Settings → Connections: Meta should flip to Active and a
   sync should start.

## Ship it (Chrome Web Store)
1. Zip the contents of this folder (not the folder itself).
2. chrome.google.com/webstore/devconsole → New item → upload the zip.
3. Fill listing (name: "Fetch by AuthorDash", the privacy blurb from the popup
   footer works as the data-use description) → submit for review (~1–3 days).

## How pairing works (no copy-paste)
`popup.js` calls `authordash.io/api/extension/pair` with `credentials: include`,
so it authenticates via your existing AuthorDash login cookie and gets a private
`extensionKey`. That key authorizes the later cookie upload. The user never
copies a token.
