# Publishing Marketing Dashboard

Your indie author marketing coach — powered by AI.

---

## What this does

- Analyzes your KDP report, Meta Ads export, and Pinterest CSV
- Auto-pulls your MailerLite email stats
- Claude reads everything and gives you a plain-English coaching session
- Traffic light scores: 🔴 Fix now · 🟡 Watch · 🟢 Scale
- Daily rank tracker for your Amazon sales rank
- Daily ROAS log for your ad spend
- Pinterest weekly log as you build your presence
- Full glossary explaining every marketing term

---

## Deploy in 15 minutes

### Step 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/publishing-dashboard.git
cd publishing-dashboard
npm install
```

### Step 2 — Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   (add your Vercel URL too when you deploy: `https://your-app.vercel.app/api/auth/callback/google`)
6. Copy Client ID and Client Secret

### Step 3 — Set up Vercel Postgres

1. Go to [vercel.com](https://vercel.com) → your project → Storage → Create → Postgres
2. Copy the `DATABASE_URL` connection string

### Step 4 — Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Copy the key (starts with `sk-ant-api03-...`)

### Step 5 — Get your MailerLite API key

1. Go to MailerLite → Integrations → API
2. Copy your API token

### Step 6 — Create your .env.local

```bash
cp .env.example .env.local
```

Then fill in all the values in `.env.local`.

### Step 7 — Set up the database

```bash
npx prisma generate
npx prisma db push
```

### Step 8 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 9 — Deploy to Vercel

```bash
# Push to GitHub first
git add .
git commit -m "Initial deploy"
git push origin main

# Then in Vercel dashboard:
# 1. Import your GitHub repo
# 2. Add all environment variables from .env.local
# 3. Deploy
```

---

## Self-hosted version

For users who want to run their own instance with their own API key:

Set this in your `.env.local`:
```
NEXT_PUBLIC_BRING_YOUR_OWN_KEY=true
```

This enables the API key input field in Settings, so each user brings their own Anthropic key.

---

## Environment Variables

| Variable | Required | Where to get it |
|---|---|---|
| `NEXTAUTH_SECRET` | ✅ | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your app URL |
| `GOOGLE_CLIENT_ID` | ✅ | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google Cloud Console |
| `ANTHROPIC_API_KEY` | ✅ | console.anthropic.com |
| `DATABASE_URL` | ✅ | Vercel Postgres |
| `MAILERLITE_API_KEY` | Optional | MailerLite → Integrations |
| `NEXT_PUBLIC_BRING_YOUR_OWN_KEY` | Optional | Set `true` for self-hosted |

---

## Monthly usage workflow

1. **Download** your KDP Excel report from KDP Dashboard → Reports
2. **Export** your Meta Ads CSV from Ads Manager → Export
3. **Export** your Pinterest CSV from Pinterest Analytics → Export
4. **Upload** all three files on the Upload page
5. **Read** your coaching session — plain English, no jargon
6. **Take action** on the prioritized list

---

## Daily habits (30 seconds each)

- Log your Amazon rank in the Rank Tracker
- Log your ad spend + earnings in the ROAS Log
- Log your Pinterest weekly numbers on Sundays

---

Built for indie romance authors. Powered by Claude.
